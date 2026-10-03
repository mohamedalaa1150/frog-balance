import type Phaser from 'phaser';
import { AudioManager } from '../services/audio';
import { readSave } from '../services/storage';

/** A hold speaks the label; a short release activates the button. */
export function bindButton(
  scene: Phaser.Scene,
  button: Phaser.GameObjects.GameObject,
  label: string,
  action: () => void,
): void {
  let timer: Phaser.Time.TimerEvent | undefined;
  let holding = false;
  let spoken = false;
  const audio = new AudioManager(scene, readSave().settings, () => {});
  const cancel = () => {
    timer?.remove();
    timer = undefined;
    holding = false;
  };
  button.on('pointerdown', () => {
    cancel();
    if (scene.game.registry.get('audio-unlocked')) audio.unlock();
    audio.setFastMode(scene.game.registry.get('fast-mode') === true);
    void audio.play('sfx_button');
    holding = true;
    spoken = false;
    timer = scene.time.delayedCall(700, () => {
      if (!holding) return;
      spoken = true;
      audio.unlock();
      void audio.play(label, 'vo', 'interrupt');
    });
  });
  button.on('pointerup', () => {
    if (!holding) return;
    cancel();
    if (!spoken) action();
  });
  scene.input.on('pointerupoutside', cancel);
  const up = () => cancel();
  scene.input.on('pointerup', up);
  button.once('destroy', () => {
    cancel();
    audio.destroy();
    scene.input.off('pointerupoutside', cancel);
    scene.input.off('pointerup', up);
  });
}
