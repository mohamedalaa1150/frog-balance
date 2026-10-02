import type Phaser from 'phaser';
import type { SaveV1 } from '../core/progress';
import manifest from '../../public/assets/audio/vo/manifest.json';
import { hasString, t } from './strings';
import { DuckingState, scheduleVoice } from './audioSchedule';
export type AudioChannel = 'music' | 'sfx' | 'vo';
export const SFX_KEYS = [
  'sfx_pickup',
  'sfx_drop_pan_a',
  'sfx_drop_pan_b',
  'sfx_bounce_back',
  'sfx_beam_creak',
  'sfx_balanced_ding',
  'sfx_success',
  'sfx_star_1',
  'sfx_star_2',
  'sfx_star_3',
  'sfx_button',
  'sfx_pan_full',
  'sfx_lock_shake',
  'sfx_unlock',
  'sfx_ribbit',
  'sfx_hint_chime',
];
const voiced = new Set(manifest.lines.map((line) => line.key));
const textOnly = new Set<string>(manifest.no_vo_by_design);
const runtimes = new WeakMap<Phaser.Game, AudioRuntime>();
interface Playing {
  source: AudioBufferSourceNode;
  gain?: GainNode;
  owner?: AudioManager;
}
/** One runtime per game: button labels and scene voices share a single cancellable queue. */
class AudioRuntime {
  readonly context?: AudioContext;
  readonly buses = {} as Record<AudioChannel, GainNode>;
  readonly duck = new DuckingState();
  private unlocked = false;
  private voices: Playing[] = [];
  private effects = new Set<Playing>();
  private music: Playing[] = [];
  private musicKey = '';
  private musicGeneration = 0;
  private musicLoads = new Map<string, Promise<void>>();
  private voiceGeneration = 0;
  private finish?: () => void;
  private voiceOwner?: AudioManager;
  private throttles = new Map<string, number>();
  private failed = new Set<string>();
  private speech = false;
  constructor(
    private scene: Phaser.Scene,
    private settings: SaveV1['settings'],
  ) {
    const sound = scene.sound as Phaser.Sound.WebAudioSoundManager;
    this.context = sound.context;
    if (this.context) {
      for (const channel of ['music', 'sfx', 'vo'] as const) {
        this.buses[channel] = this.context.createGain();
        this.buses[channel].connect(sound.masterMuteNode);
      }
      this.applySettings(settings);
    }
    scene.game.events.on('settings-changed', this.applySettings, this);
    scene.game.events.on('scene-ready', this.sceneReady, this);
    if (typeof document !== 'undefined')
      document.addEventListener('visibilitychange', this.visibility);
    scene.game.events.once('destroy', () => {
      document.removeEventListener('visibilitychange', this.visibility);
      this.stopVoice();
      for (const p of [...this.music, ...this.effects]) this.stop(p);
      for (const bus of Object.values(this.buses)) bus.disconnect();
      scene.game.events.off('settings-changed', this.applySettings, this);
      scene.game.events.off('scene-ready', this.sceneReady, this);
    });
  }
  private sceneReady = (data: { key: string }) => {
    if (this.scene.game.registry.get('fast-mode') === true) return;
    const next = this.scene.game.scene.getScene(data.key);
    this.scene = next;
    const level = (
      next as Phaser.Scene & {
        controller?: { state: { level: { world: number } } };
      }
    ).controller?.state.level;
    const key =
      data.key === 'SandboxScene'
        ? 'music_worlds_1_2'
        : data.key === 'GameScene'
          ? `music_worlds_${Math.ceil((level?.world ?? 1) / 2) * 2 - 1}_${Math.ceil((level?.world ?? 1) / 2) * 2}`
          : 'music_title';
    if (
      ![
        'BootScene',
        'PreloadScene',
        'TestSilentScene',
        'TestReadyScene',
      ].includes(data.key)
    )
      void this.playMusic(key);
  };
  private visibility = () => {
    try {
      if (document.hidden) {
        void this.context?.suspend().catch(() => {});
        if (this.speech) window.speechSynthesis.pause();
      } else if (this.unlocked) {
        void this.context?.resume().catch(() => {});
        if (this.speech) window.speechSynthesis.resume();
      }
    } catch {
      /* Audio is optional. */
    }
  };
  unlock() {
    this.unlocked = true;
    this.scene.game.registry.set('audio-unlocked', true);
    try {
      void this.context?.resume().catch(() => {});
    } catch {
      /* Silent fallback. */
    }
  }
  private event(type: string, data: Record<string, unknown>) {
    this.scene.game.events.emit('gameplay-event', { type, data });
  }
  private ramp(param: AudioParam, target: number, seconds = 0) {
    if (!this.context) return;
    const now = this.context.currentTime;
    param.cancelAndHoldAtTime(now);
    param.linearRampToValueAtTime(target, now + seconds);
  }
  private applySettings = (settings: SaveV1['settings']) => {
    this.settings = settings;
    if (!this.context) return;
    for (const channel of ['music', 'sfx', 'vo'] as const)
      this.ramp(
        this.buses[channel].gain,
        settings[channel] * (channel === 'music' ? this.duck.factor : 1),
      );
  };
  private duckTo(active: boolean) {
    const state = this.duck.change(active);
    if (this.context)
      this.ramp(
        this.buses.music.gain,
        this.settings.music * state.factor,
        state.seconds,
      );
    this.event('audio-duck', {
      active,
      volume: this.settings.music * state.factor,
      seconds: state.seconds,
    });
  }
  snapshot() {
    return {
      musicKey: this.musicKey,
      voPlaying: this.duck.active,
      musicSetting: this.settings.music,
      musicVolume: this.buses.music?.gain.value ?? 0,
      sfxVolume: this.buses.sfx?.gain.value ?? 0,
      voVolume: this.buses.vo?.gain.value ?? 0,
      muted: this.scene.sound.mute,
      paused: this.context?.state === 'suspended',
    };
  }
  private buffer(key: string): AudioBuffer | undefined {
    return this.scene.cache.audio.exists(key)
      ? (this.scene.cache.audio.get(key) as AudioBuffer)
      : undefined;
  }
  private source(key: string, channel: AudioChannel): Playing | undefined {
    const buffer = this.buffer(key);
    if (!buffer || !this.context) return;
    const source = this.context.createBufferSource();
    source.buffer = buffer;
    source.connect(this.buses[channel]);
    return { source };
  }
  private stop(p: Playing) {
    try {
      p.source.onended = null;
      p.source.stop();
      p.source.disconnect();
      p.gain?.disconnect();
    } catch {
      /* Safe teardown. */
    }
  }
  stopVoice(owner?: AudioManager) {
    if (owner && owner !== this.voiceOwner) return;
    this.voiceGeneration++;
    for (const p of this.voices) this.stop(p);
    this.voices = [];
    if (this.speech) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        /* Optional engine. */
      }
    }
    this.speech = false;
    const done = this.finish;
    this.finish = undefined;
    done?.();
    this.voiceOwner = undefined;
    if (this.duck.active) this.duckTo(false);
  }
  async voice(
    keys: readonly string[],
    owner: AudioManager,
    subtitle: (text: string) => void,
    fast: boolean,
  ): Promise<void> {
    this.stopVoice();
    this.voiceOwner = owner;
    const generation = this.voiceGeneration;
    const speakable = keys.filter(
      (key) => voiced.has(key) && !textOnly.has(key),
    );
    for (const key of keys) this.event('audio', { key, channel: 'vo' });
    try {
      if (keys[0] && hasString(keys[0])) subtitle(t(keys[0]));
    } catch {
      /* View may have shut down. */
    }
    if (fast || !this.unlocked || !speakable.length) return;
    // Decode/load failure is the only condition permitting the development fallback.
    const missing = speakable.filter((key) => !this.buffer(key));
    for (const key of missing) this.failed.add(key);
    if (missing.length && import.meta.env.DEV)
      return this.fallback(speakable, generation);
    const clips = scheduleVoice(
      speakable.filter((key) => this.buffer(key)),
      (key) => this.buffer(key)!.duration,
      this.context?.currentTime ?? 0,
    );
    if (!clips.length || !this.context) return;
    this.duckTo(true);
    return new Promise<void>((resolve) => {
      this.finish = resolve;
      try {
        for (const [i, clip] of clips.entries()) {
          const p = this.source(clip.key, 'vo')!;
          this.voices.push(p);
          p.source.onended = () => {
            p.source.disconnect();
            if (generation !== this.voiceGeneration) return;
            if (i === clips.length - 1) {
              this.voices = [];
              this.finish = undefined;
              this.duckTo(false);
              resolve();
            }
          };
          this.event('audio-vo', {
            key: clip.key,
            scheduledStart: clip.start,
            scheduledEnd: clip.end,
            offset: clip.offset,
          });
          p.source.start(clip.start, clip.offset, clip.duration);
        }
      } catch {
        this.stopVoice();
      }
    });
  }
  private async fallback(keys: readonly string[], generation: number) {
    for (const key of keys) {
      if (generation !== this.voiceGeneration) return;
      if (!this.failed.has(key) || textOnly.has(key) || !hasString(key))
        continue;
      try {
        if (
          !('speechSynthesis' in window) ||
          typeof SpeechSynthesisUtterance === 'undefined'
        )
          continue;
        this.speech = true;
        this.duckTo(true);
        await new Promise<void>((resolve) => {
          const u = new SpeechSynthesisUtterance(t(key));
          u.lang = 'ar-EG';
          u.volume = this.settings.vo;
          const timer = setTimeout(done, 15000);
          function done() {
            clearTimeout(timer);
            resolve();
          }
          this.finish = done;
          u.onend = done;
          u.onerror = done;
          window.speechSynthesis.speak(u);
        });
      } catch {
        /* Unavailable speech remains silent. */
      }
    }
    if (generation === this.voiceGeneration) {
      this.finish = undefined;
      this.speech = false;
      this.duckTo(false);
    }
  }
  effect(key: string, fast: boolean) {
    this.event('audio', { key, channel: 'sfx' });
    if (fast || !this.unlocked) return;
    const now = this.context?.currentTime ?? 0;
    const interval =
      key === 'sfx_beam_creak' ? 0.4 : key === 'sfx_ribbit' ? 20 : 0;
    if (interval && now - (this.throttles.get(key) ?? -Infinity) < interval)
      return;
    try {
      const p = this.source(key, 'sfx');
      if (!p) return;
      this.throttles.set(key, now);
      this.effects.add(p);
      p.source.onended = () => {
        this.effects.delete(p);
        p.source.disconnect();
      };
      p.source.start();
      this.event('audio-sfx', { key, scheduledStart: now });
    } catch {
      /* Missing effects never interrupt play. */
    }
  }
  async playMusic(key: string) {
    if (key === this.musicKey) return;
    this.musicKey = key;
    const generation = ++this.musicGeneration;
    this.event('audio', { key, channel: 'music' });
    try {
      if (!this.buffer(key)) {
        if (!this.context) return;
        let loading = this.musicLoads.get(key);
        if (!loading) {
          // Choose one supported format from the scene's lazy source list. The
          // load belongs to the game, so scene shutdown cannot abort a decode.
          const urls = [
            `assets/audio/music/${key}.ogg`,
            `assets/audio/music/${key}.mp3`,
          ];
          const url = urls[this.scene.game.device.audio.ogg ? 0 : 1]!;
          loading = (async () => {
            if (
              !navigator.onLine &&
              typeof caches !== 'undefined' &&
              !(await caches.match(url))
            )
              return;
            let cached: Response | undefined;
            try {
              cached = await caches.match(url);
            } catch {
              /* Storage may be disabled. */
            }
            const response = cached ?? (await fetch(url));
            if (!response.ok) return;
            // The first Title load may begin before the worker controls the page.
            // Preserve that first use in the same bounded music runtime cache.
            if (!cached) {
              try {
                await (
                  await caches.open('frog-music')
                ).put(url, response.clone());
              } catch {
                /* Optional storage. */
              }
            }
            const buffer = await this.context!.decodeAudioData(
              await response.arrayBuffer(),
            );
            this.scene.cache.audio.add(key, buffer);
          })()
            .catch(() => {})
            .finally(() => this.musicLoads.delete(key));
          this.musicLoads.set(key, loading);
        }
        await loading;
      }
      if (generation !== this.musicGeneration) return;
      const next = this.source(key, 'music');
      if (!next || !this.context) return;
      // Track envelopes multiply the music bus; live settings and ducking remain independent.
      next.source.disconnect();
      next.gain = this.context.createGain();
      next.gain.gain.value = 0;
      next.source.connect(next.gain);
      next.gain.connect(this.buses.music);
      next.source.loop = true;
      next.source.start();
      this.ramp(next.gain.gain, 1, 0.6);
      for (const old of this.music) {
        this.ramp(old.gain!.gain, 0, 0.6);
        old.source.onended = () => {
          old.source.disconnect();
          old.gain?.disconnect();
        };
        old.source.stop(this.context.currentTime + 0.6);
      }
      this.music = [next];
      this.event('audio-music', { key, crossfade: 0.6 });
    } catch {
      /* Music is optional; the game always remains playable. */
    }
  }
}
export class AudioManager {
  private runtime: AudioRuntime;
  private fast = false;
  constructor(
    scene: Phaser.Scene,
    settings: SaveV1['settings'],
    private subtitle: (text: string) => void,
  ) {
    let runtime = runtimes.get(scene.game);
    if (!runtime) {
      runtime = new AudioRuntime(scene, settings);
      runtimes.set(scene.game, runtime);
    }
    this.runtime = runtime;
  }
  unlock() {
    this.runtime.unlock();
  }
  setFastMode(on: boolean) {
    this.fast = on;
    if (on) this.stopVoice();
  }
  play(
    key: string,
    channel: AudioChannel = voiced.has(key) || textOnly.has(key) ? 'vo' : 'sfx',
    _priority?: 'queue' | 'interrupt',
  ): Promise<void> {
    void _priority;
    try {
      if (channel === 'vo') return this.chain([key]);
      if (channel === 'music') return this.runtime.playMusic(key);
      this.runtime.effect(key, this.fast);
    } catch {
      /* Optional audio never throws. */
    }
    return Promise.resolve();
  }
  chain(keys: readonly string[]) {
    return this.runtime
      .voice(keys, this, this.subtitle, this.fast)
      .catch(() => {});
  }
  stopVoice() {
    this.runtime.stopVoice(this);
  }
  destroy() {
    this.stopVoice();
  }
  snapshot() {
    return this.runtime.snapshot();
  }
}
export function audioSnapshot(game: Phaser.Game) {
  return runtimes.get(game)?.snapshot() ?? null;
}
