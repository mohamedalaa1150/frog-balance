import Phaser from 'phaser';
import { BaseScene } from './BaseScene';
import { CONFIG } from '../config';
import { THEME, cssColor } from '../theme';
import { readSave } from '../services/storage';
import { AudioManager } from '../services/audio';
import { t, type StringKey } from '../services/strings';
import { getRenderScale } from '../layout/viewport';
import { coverBackground } from '../layout/background';
import { bindButton } from '../ui/Button';

export const menuLabel = (key: string): string => t(key as StringKey);
export class MenuScene extends BaseScene {
  protected audio!: AudioManager;
  protected background!: Phaser.GameObjects.Image;
  protected header!: Phaser.GameObjects.Text;
  protected world = 2;
  protected frame() {
    const { width, height } = this.scale.gameSize;
    const r = getRenderScale();
    const portrait = width < height;
    const scale = Math.min(
      width / (portrait ? 720 : 1280),
      height / (portrait ? 1280 : 720),
    );
    return {
      width,
      height,
      r,
      portrait,
      scale,
      button: Math.max(64 * r, Math.min(96 * scale, height * 0.15)),
    };
  }
  protected get reduced() {
    const motion = readSave().settings.reducedMotion;
    return (
      motion === 'on' ||
      (motion === 'system' &&
        matchMedia('(prefers-reduced-motion: reduce)').matches) ||
      this.game.registry.get('fast-mode') === true
    );
  }
  protected setup(title: string, back = 'WorldMapScene'): void {
    this.background = this.add
      .image(0, 0, `bg_world_${this.world}`)
      .setOrigin(0)
      .setDepth(-10);
    this.header = this.text(title, 'menu-title', 40);
    this.audio = new AudioManager(this, readSave().settings, () => {});
    if (this.game.registry.get('audio-unlocked')) this.audio.unlock();
    this.audio.setFastMode(this.game.registry.get('fast-mode') === true);
    const home = this.icon('btn-home', 'btn_home', 'ui_home', () =>
      this.scene.start(back),
    );
    const layout = () => {
      const f = this.frame();
      coverBackground(this.background, f.width, f.height, this.world);
      this.header
        .setPosition(f.width / 2, 30 * f.r)
        .setFontSize(Math.min(40 * f.scale, 28 * f.r))
        .setWordWrapWidth(f.width * 0.65);
      home
        .setPosition(f.width - f.button / 2 - 8 * f.r, f.button / 2 + 8 * f.r)
        .setDisplaySize(f.button, f.button);
      this.layout();
    };
    layout();
    this.scale.on(Phaser.Scale.Events.RESIZE, layout);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, layout);
      this.audio.destroy();
    });
  }
  protected layout(): void {}
  protected text(
    key: string,
    name: string,
    size = 28,
  ): Phaser.GameObjects.Text {
    return this.add
      .text(0, 0, menuLabel(key), {
        fontFamily: CONFIG.fontStack,
        fontStyle: '800',
        fontSize: size,
        color: cssColor(THEME.navy),
        rtl: true,
        align: 'center',
        backgroundColor: cssColor(THEME.sky),
        padding: { left: 8, right: 8, top: 2, bottom: 2 },
      })
      .setOrigin(0.5)
      .setName(name);
  }
  protected icon(
    name: string,
    texture: string,
    label: string,
    action: () => void,
  ): Phaser.GameObjects.Image {
    const image = this.add
      .image(0, 0, texture)
      .setName(name)
      .setInteractive({ useHandCursor: true });
    bindButton(this, image, label, action);
    return image;
  }
  protected starRow(
    x: number,
    y: number,
    earned: number,
    size: number,
    name: string,
  ): void {
    for (let i = 0; i < 3; i++)
      this.add
        .image(x + (i - 1) * size, y, i < earned ? 'star_full' : 'star_empty')
        .setDisplaySize(size, size)
        .setName(`${name}-star-${i + 1}`);
  }
}
