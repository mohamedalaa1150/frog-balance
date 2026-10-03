import type Phaser from 'phaser';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { defaults } from '../../src/core/progress';
import { AudioManager } from '../../src/services/audio';
import { DuckingState, scheduleVoice } from '../../src/services/audioSchedule';
import { composePanReading } from '../../src/services/reading';
import type { PlacedItem } from '../../src/core/types';
const param = () => ({
  value: 1,
  cancelAndHoldAtTime: vi.fn(),
  linearRampToValueAtTime: vi.fn(),
});
function setup(cached: string[] = []) {
  const sources: Array<{
    start: ReturnType<typeof vi.fn>;
    stop: ReturnType<typeof vi.fn>;
    disconnect: ReturnType<typeof vi.fn>;
    connect: ReturnType<typeof vi.fn>;
    onended: (() => void) | null;
    buffer: unknown;
    loop: boolean;
  }> = [];
  const gains: Array<{
    gain: ReturnType<typeof param>;
    connect: ReturnType<typeof vi.fn>;
    disconnect: ReturnType<typeof vi.fn>;
  }> = [];
  const context = {
    currentTime: 10,
    resume: vi.fn().mockResolvedValue(undefined),
    suspend: vi.fn().mockResolvedValue(undefined),
    createGain: () => {
      const g = { gain: param(), connect: vi.fn(), disconnect: vi.fn() };
      gains.push(g);
      return g;
    },
    createBufferSource: () => {
      const s = {
        start: vi.fn(),
        stop: vi.fn(),
        disconnect: vi.fn(),
        connect: vi.fn(),
        onended: null,
        buffer: null,
        loop: false,
      };
      sources.push(s);
      return s;
    },
  };
  const scene = {
    game: {
      registry: { set: vi.fn() },
      events: { on: vi.fn(), off: vi.fn(), once: vi.fn(), emit: vi.fn() },
    },
    cache: {
      audio: {
        exists: (key: string) => cached.includes(key),
        get: () => ({ duration: 1.5 }),
      },
    },
    sound: { context, masterMuteNode: {} },
  };
  const audio = new AudioManager(
    scene as unknown as Phaser.Scene,
    defaults().settings,
    vi.fn(),
  );
  audio.unlock();
  return { audio, sources, gains, scene, context };
}
beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('window', {
    speechSynthesis: { speak: vi.fn(), cancel: vi.fn() },
  });
  vi.stubGlobal(
    'SpeechSynthesisUtterance',
    class {
      constructor(readonly text: string) {}
    },
  );
});
afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
it('right pan first, with trimmed edges, no overlap and <=60ms scheduled gaps', () => {
  const number = (value: number): PlacedItem => ({
    kind: 'number',
    value,
    order: 0,
    uid: String(value),
    fixed: false,
  });
  const keys = composePanReading({
    left: [number(9)],
    right: [number(2)],
  }).keys;
  const clips = scheduleVoice(keys, () => 1.5, 10);
  expect(clips.map((c) => c.key)).toEqual([
    'count_02',
    'phrase_less_than',
    'count_09',
  ]);
  expect(clips[0]!.offset).toBe(0.15);
  for (let i = 1; i < clips.length; i++) {
    const gap = clips[i]!.start - clips[i - 1]!.end;
    expect(gap).toBeGreaterThanOrEqual(0);
    expect(gap * 1000).toBeLessThanOrEqual(60);
  }
});
it('schedules every clip once and cancels all scheduled sources on a new request', async () => {
  const { audio, sources } = setup(['count_01', 'count_02', 'count_03']);
  const original = audio.chain(['count_01', 'count_02']);
  expect(sources[0]!.start).toHaveBeenCalledWith(10.02, 0.15, 1.2);
  expect(sources[1]!.start).toHaveBeenCalledWith(11.219999999999999, 0.15, 1.2);
  const next = audio.play('count_03');
  await original;
  expect(sources.slice(0, 2).every((s) => s.stop.mock.calls.length === 1)).toBe(
    true,
  );
  sources[2]!.onended!();
  await next;
  audio.destroy();
});
it('button and scene managers share cancellation and only the voice owner can tear down its queue', async () => {
  const { audio, scene, sources } = setup(['count_01', 'count_02']);
  const button = new AudioManager(
    scene as unknown as Phaser.Scene,
    defaults().settings,
    () => {},
  );
  const a = audio.play('count_01');
  const b = button.play('count_02');
  await a;
  audio.destroy();
  expect(sources[1]!.stop).not.toHaveBeenCalled();
  sources[1]!.onended!();
  await b;
});
it('ducking state keeps a full sentence at 25%, fades down 150ms/up 400ms, applies live settings', async () => {
  const duck = new DuckingState();
  expect(duck.change(true)).toEqual({ factor: 0.25, seconds: 0.15 });
  expect(duck.factor).toBe(0.25);
  expect(duck.change(false)).toEqual({ factor: 1, seconds: 0.4 });
  const { audio, sources, gains, scene } = setup(['count_01', 'count_02']);
  const playing = audio.chain(['count_01', 'count_02']);
  expect(gains[0]!.gain.linearRampToValueAtTime).toHaveBeenLastCalledWith(
    0.1,
    10.15,
  );
  const settingsHandler = scene.game.events.on.mock.calls.find(
    (c) => c[0] === 'settings-changed',
  )![1] as (s: ReturnType<typeof defaults>['settings']) => void;
  settingsHandler({ ...defaults().settings, music: 0.8, vo: 0.5, sfx: 0.3 });
  expect(gains[0]!.gain.linearRampToValueAtTime).toHaveBeenLastCalledWith(
    0.2,
    10,
  );
  sources[0]!.onended!();
  expect(audio.snapshot().voPlaying).toBe(true);
  sources[1]!.onended!();
  await playing;
  expect(gains[0]!.gain.linearRampToValueAtTime).toHaveBeenLastCalledWith(
    0.8,
    10.4,
  );
});
it('missing/unknown/text-only files, unavailable engines and decoding exceptions never throw', async () => {
  const { audio, context } = setup();
  await audio.play('missing');
  await audio.play('settings_music', 'vo');
  expect(window.speechSynthesis.speak).not.toHaveBeenCalled();
  vi.stubGlobal('window', {});
  await audio.play('count_01');
  context.createBufferSource = () => {
    throw new Error('failed decoder');
  };
  audio.setFastMode(true);
  await audio.chain(['count_01']);
  expect(() => audio.destroy()).not.toThrow();
});
it('only a failed voiced key uses dev speech and new requests cancel its timeout', async () => {
  const { audio } = setup();
  const first = audio.play('count_01');
  expect(window.speechSynthesis.speak).toHaveBeenCalledOnce();
  const second = audio.play('count_02');
  await first;
  vi.advanceTimersByTime(15000);
  await second;
  audio.destroy();
});
it('SFX creaks/ribbits are throttled and live settings drive their shared bus', async () => {
  const { audio, sources, context } = setup(['sfx_beam_creak', 'sfx_ribbit']);
  await audio.play('sfx_beam_creak');
  await audio.play('sfx_beam_creak');
  expect(sources).toHaveLength(1);
  context.currentTime += 0.399;
  await audio.play('sfx_beam_creak');
  expect(sources).toHaveLength(1);
  context.currentTime += 0.002;
  await audio.play('sfx_beam_creak');
  expect(sources).toHaveLength(2);
  await audio.play('sfx_ribbit');
  await audio.play('sfx_ribbit');
  expect(sources).toHaveLength(3);
  context.currentTime += 20;
  await audio.play('sfx_ribbit');
  expect(sources).toHaveLength(4);
});
it('music loops, keeps the same source for the same key and schedules a 600ms crossfade', async () => {
  const { audio, sources, gains } = setup(['music_title', 'music_worlds_1_2']);
  await audio.play('music_title', 'music');
  await audio.play('music_title', 'music');
  expect(sources).toHaveLength(1);
  expect(sources[0]!.loop).toBe(true);
  await audio.play('music_worlds_1_2', 'music');
  expect(sources).toHaveLength(2);
  expect(sources[1]!.loop).toBe(true);
  expect(gains[3]!.gain.linearRampToValueAtTime).toHaveBeenLastCalledWith(
    0,
    10.6,
  );
  expect(gains[4]!.gain.linearRampToValueAtTime).toHaveBeenLastCalledWith(
    1,
    10.6,
  );
  expect(sources[0]!.stop).toHaveBeenCalledWith(10.6);
});
