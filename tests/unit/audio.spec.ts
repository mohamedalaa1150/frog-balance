import type Phaser from 'phaser';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { defaults } from '../../src/core/progress';
import { AudioManager } from '../../src/services/audio';
class Utterance {
  lang = '';
  volume = 0;
  onend?: () => void;
  onerror?: () => void;
  constructor(readonly text: string) {}
}
const utterances: Utterance[] = [];
const cancel = vi.fn();
class Sound {
  complete?: () => void;
  once = vi.fn((_event: string, callback: () => void) => {
    this.complete = callback;
    return this;
  });
  play = vi.fn();
  stop = vi.fn();
  destroy = vi.fn();
  setVolume = vi.fn();
}
function setup(cached: string[] = []) {
  const sounds: Sound[] = [];
  const scene = {
    game: { events: { on: vi.fn(), off: vi.fn(), emit: vi.fn() } },
    cache: { audio: { exists: (key: string) => cached.includes(key) } },
    sound: {
      add: vi.fn(() => {
        const sound = new Sound();
        sounds.push(sound);
        return sound;
      }),
    },
  };
  const subtitle = vi.fn();
  const audio = new AudioManager(
    scene as unknown as Phaser.Scene,
    defaults().settings,
    subtitle,
  );
  audio.unlock();
  return { audio, sounds, scene, subtitle };
}
beforeEach(() => {
  vi.useFakeTimers();
  utterances.length = 0;
  cancel.mockClear();
  vi.stubGlobal('window', {
    setTimeout,
    speechSynthesis: {
      speak: (utterance: Utterance) => utterances.push(utterance),
      cancel,
    },
  });
  vi.stubGlobal('SpeechSynthesisUtterance', Utterance);
});
afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
it('missing mp3 uses ar-EG speech, queues without overlap, and handles speech errors', async () => {
  const { audio, subtitle } = setup();
  const first = audio.play('count_01', 'vo');
  const second = audio.play('count_02', 'vo');
  expect(utterances).toHaveLength(1);
  expect(utterances[0]!.lang).toBe('ar-EG');
  utterances[0]!.onend!();
  await first;
  expect(utterances).toHaveLength(2);
  utterances[1]!.onerror!();
  await second;
  expect(subtitle).toHaveBeenCalledTimes(2);
  audio.destroy();
});
it('cached VO ducks music to 30%, restores volume, and interrupt resolves the old queue', async () => {
  const { audio, sounds } = setup(['pond', 'count_01', 'count_02', 'count_03']);
  await audio.play('pond', 'music');
  const first = audio.play('count_01', 'vo');
  const queued = audio.play('count_02', 'vo');
  expect(sounds[0]!.setVolume).toHaveBeenCalledWith(
    defaults().settings.music * 0.3,
  );
  const replacement = audio.play('count_03', 'vo', 'interrupt');
  await Promise.all([first, queued]);
  expect(sounds[1]!.stop).toHaveBeenCalled();
  expect(sounds).toHaveLength(3);
  sounds[2]!.complete!();
  await replacement;
  expect(sounds[0]!.setVolume).toHaveBeenLastCalledWith(
    defaults().settings.music,
  );
  audio.destroy();
});
it('missing sfx, no speech engine, speech exceptions and a timeout never throw', async () => {
  const { audio, scene } = setup();
  await expect(audio.play('missing')).resolves.toBeUndefined();
  expect(scene.sound.add).not.toHaveBeenCalled();
  await audio.play('unknown', 'vo');
  vi.stubGlobal('window', { setTimeout });
  await expect(audio.play('count_01', 'vo')).resolves.toBeUndefined();
  vi.stubGlobal('window', {
    setTimeout,
    speechSynthesis: {
      speak: () => {
        throw new Error('unavailable');
      },
      cancel: () => {
        throw new Error('unavailable');
      },
    },
  });
  await expect(audio.play('count_01', 'vo')).resolves.toBeUndefined();
  expect(() => audio.stopVoice()).not.toThrow();
  vi.stubGlobal('window', {
    setTimeout,
    speechSynthesis: { speak: () => {}, cancel },
  });
  const pending = audio.play('count_01', 'vo');
  vi.advanceTimersByTime(8000);
  await pending;
  audio.destroy();
});
it('fast mode cancels speech waits; a failed sound add and subtitle remain silent', async () => {
  const { audio, scene, subtitle } = setup(['count_01']);
  scene.sound.add.mockImplementation(() => {
    throw new Error('decoder failure');
  });
  await expect(audio.play('count_01', 'vo')).resolves.toBeUndefined();
  subtitle.mockImplementation(() => {
    throw new Error('destroyed view');
  });
  await expect(audio.play('count_02', 'vo')).resolves.toBeUndefined();
  subtitle.mockReset();
  audio.setFastMode(true);
  await audio.play('count_01', 'vo');
  expect(utterances).toHaveLength(0);
  audio.destroy();
});
