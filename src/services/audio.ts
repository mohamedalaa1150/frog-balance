import type Phaser from 'phaser';
import { formatNumber } from '../core/numerals';
import type { SaveV1 } from '../core/progress';
import { hasString, t } from './strings';
export type AudioChannel = 'music' | 'sfx' | 'vo';
type Sound = Phaser.Sound.BaseSound & { setVolume?(volume: number): unknown };
interface VoiceRequest {
  key: string;
  resolve(): void;
}
/** Only cached local audio is used. Unavailable assets never generate requests or errors. */
export class AudioManager {
  private queue: VoiceRequest[] = [];
  private current?: Sound;
  private music?: Sound;
  private finish?: () => void;
  private unlocked = false;
  private generation = 0;
  private fast = false;
  constructor(
    private scene: Phaser.Scene,
    private settings: SaveV1['settings'],
    private subtitle: (text: string) => void,
  ) {}
  unlock(): void {
    this.unlocked = true;
  }
  setFastMode(on: boolean): void {
    this.fast = on;
    if (on) this.stopVoice();
  }
  play(
    key: string,
    channel: AudioChannel = 'sfx',
    priority: 'queue' | 'interrupt' = 'queue',
  ): Promise<void> {
    try {
      this.scene.game.events.emit('gameplay-event', {
        type: 'audio',
        data: { key, channel },
      });
      if (channel !== 'vo') {
        if (this.scene.cache.audio.exists(key) && this.unlocked && !this.fast) {
          const sound = this.scene.sound.add(key, {
            volume: this.settings[channel],
            loop: channel === 'music',
          }) as Sound;
          if (channel === 'music') {
            this.music?.destroy();
            this.music = sound;
          }
          if (channel === 'sfx') sound.once('complete', () => sound.destroy());
          sound.play();
        }
        return Promise.resolve();
      }
      if (priority === 'interrupt') this.stopVoice();
      return new Promise<void>((resolve) => {
        this.queue.push({ key, resolve });
        this.pump();
      });
    } catch {
      return Promise.resolve();
    }
  }
  private pump(): void {
    if (this.finish || !this.queue.length) return;
    const request = this.queue.shift()!;
    const text = hasString(request.key)
      ? t(request.key)
      : request.key === 'count_00'
        ? formatNumber(0, this.settings.numerals)
        : '';
    const generation = this.generation;
    let completed = false;
    const timer = window.setTimeout(() => done(), 8000);
    const done = () => {
      if (completed) return;
      completed = true;
      clearTimeout(timer);
      try {
        this.current?.destroy();
        this.music?.setVolume?.(this.settings.music);
      } catch {
        /* A failed sound cannot block the queue. */
      }
      this.current = undefined;
      this.finish = undefined;
      request.resolve();
      if (generation === this.generation) this.pump();
    };
    this.finish = done;
    try {
      this.subtitle(text);
      this.music?.setVolume?.(this.settings.music * 0.3);
      if (this.fast || !this.unlocked || this.settings.vo === 0) {
        done();
        return;
      }
      if (this.scene.cache.audio.exists(request.key)) {
        this.current = this.scene.sound.add(request.key, {
          volume: this.settings.vo,
        }) as Sound;
        this.current.once('complete', done);
        this.current.play();
      } else if (
        text &&
        'speechSynthesis' in window &&
        typeof SpeechSynthesisUtterance !== 'undefined'
      ) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'ar-EG';
        utterance.volume = this.settings.vo;
        utterance.onend = done;
        utterance.onerror = done;
        window.speechSynthesis.speak(utterance);
      } else done();
    } catch {
      done();
    }
  }
  stopVoice(): void {
    this.generation++;
    const queued = this.queue.splice(0);
    for (const request of queued) request.resolve();
    try {
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
      this.current?.stop();
    } catch {
      /* Silent fallback. */
    }
    this.finish?.();
  }
  destroy(): void {
    this.stopVoice();
    try {
      this.music?.destroy();
    } catch {
      /* Audio teardown must also be safe. */
    }
  }
}
