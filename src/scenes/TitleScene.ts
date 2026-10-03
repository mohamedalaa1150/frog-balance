import { menuLabel } from './MenuScene';
import { THEME, cssColor } from '../theme';
import Phaser from 'phaser';
import { presentBackground } from '../layout/background';
import { CONFIG } from '../config';
import { formatNumber } from '../core/numerals';
import { getLayout } from '../layout/layout';
import { getRenderScale } from '../layout/viewport';
import { bindButton } from '../ui/Button';
import { readSave } from '../services/storage';
import { t } from '../services/strings';
import { AudioManager } from '../services/audio';
import { BaseScene, type SceneReadyEvent } from './BaseScene';

export class TitleScene extends BaseScene {
  private pond!: Phaser.GameObjects.Image;
  private title!: Phaser.GameObjects.Text;
  private play?: Phaser.GameObjects.Image;
  private pulse?: Phaser.Tweens.Tween;
  private numerals!: Phaser.GameObjects.Text;

  constructor() {
    super('TitleScene');
  }

  create(): void {
    const audio = new AudioManager(this, readSave().settings, () => {});
    this.events.once('shutdown', () => audio.destroy());
    // Generated cover art: Dofdou holding the balance over the pond.
    this.pond = this.add
      .image(0, 0, 'cover_land')
      .setOrigin(0.5)
      .setName('title-pond');
    this.title = this.add
      .text(0, 0, t('game_title'), {
        fontFamily: CONFIG.fontStack,
        fontSize: '96px',
        fontStyle: '900',
        color: '#FFF3B0',
        stroke: '#2E6B1F',
        strokeThickness: 14,
        rtl: true,
        align: 'center',
        padding: { left: 24, right: 24, top: 24, bottom: 24 },
      })
      .setShadow(0, 6, 'rgba(20,50,10,0.45)', 8, true, true)
      .setOrigin(0.5)
      .setName('title-text');
    this.numerals = this.add
      .text(
        0,
        0,
        Array.from({ length: 10 }, (_, index) =>
          formatNumber(index + 1, readSave().settings.numerals),
        ).join(''),
        {
          fontFamily: CONFIG.fontStack,
          fontSize: '64px',
          fontStyle: '700',
          color: cssColor(THEME.navy),
          rtl: false,
          padding: { left: 8, right: 8, top: 8, bottom: 8 },
        },
      )
      .setOrigin(0.5)
      .setName('numerals-text')
      .setVisible(false);
    this.play = this.add
      .image(0, 0, 'btn_play')
      .setName('btn-play')
      .setInteractive({ useHandCursor: true });
    this.play.on('pointerdown', () => {
      audio.unlock();
      this.sound.unlock();
    });
    bindButton(this, this.play, 'ui_play', () => {
      this.game.registry.set('audio-unlocked', true);
      this.sound.unlock();
      this.scene.start('WorldMapScene');
    });
    const buttons = [
      ['btn-lock', 'btn_lock', 'gate_hold', 'GrownUpGateScene'],
      ['btn-sandbox', 'btn_sandbox', 'ui_sandbox', 'SandboxScene'],
      ['btn-practice', 'btn_practice', 'ui_practice', 'PracticeScene'],
    ];
    if (new URLSearchParams(location.search).get('test') === '1')
      buttons.push([
        'btn-dev',
        'btn_settings',
        'map_choose_level',
        'DevLevelListScene',
      ]);
    for (const [name, texture, label, scene] of buttons) {
      const b = this.add.image(0, 0, texture!).setName(name!).setInteractive();
      bindButton(this, b, label!, () => this.scene.start(scene!));
    }
    const update = () => {
      if (!this.scene.isActive()) return;
      const toast = this.add
        .text(
          this.scale.width / 2,
          this.scale.height * 0.08,
          menuLabel('update_available'),
          {
            fontFamily: CONFIG.fontStack,
            color: cssColor(THEME.navy),
            backgroundColor: cssColor(THEME.sky),
            fontSize: 24,
            rtl: true,
            align: 'center',
            wordWrap: { width: this.scale.width * 0.8 },
            padding: { left: 12, right: 12, top: 6, bottom: 6 },
          },
        )
        .setOrigin(0.5)
        .setName('update-toast');
      this.time.delayedCall(3500, () => toast.destroy());
      this.game.registry.remove('update-ready');
    };
    if (this.game.registry.get('update-ready')) update();
    this.game.events.on('update-ready', update);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () =>
      this.game.events.off('update-ready', update),
    );
    this.relayout();
    this.scale.on(Phaser.Scale.Events.RESIZE, this.relayout, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, this.relayout, this);
    });
  }

  protected getReadyData(): Record<string, unknown> {
    return {
      scene: 'TitleScene',
      title: this.title.text,
      numerals: this.numerals.text,
      rtl: this.title.style.rtl,
      visible: this.title.visible,
      numeralProbeVisible: this.numerals.visible,
      titleBounds: this.title.getBounds(),
      numeralBounds: this.numerals.getBounds(),
      viewport: { width: this.scale.width, height: this.scale.height },
    };
  }

  protected onReady(data: SceneReadyEvent): void {
    this.game.events.emit('title-ready', data);
  }

  private relayout(): void {
    const { width, height } = this.scale.gameSize;
    const { uiScale } = getLayout(width, height);
    const portrait = height > width;
    // Cover-fit the authored orientation, then place the title and Play
    // button in the cover's open sky (left half in landscape, top in portrait).
    this.pond
      .setTexture(portrait ? 'cover_port' : 'cover_land')
      .setPosition(width / 2, height / 2);
    const source = this.pond.texture.getSourceImage();
    const fit = Math.max(width / source.width, height / source.height);
    const coverW = source.width * fit,
      coverH = source.height * fit;
    this.pond.setDisplaySize(coverW, coverH);
    presentBackground(this.pond);
    const at = (u: number, v: number) => ({
      x: Phaser.Math.Clamp(width / 2 + (u - 0.5) * coverW, 0, width),
      y: Phaser.Math.Clamp(height / 2 + (v - 0.5) * coverH, 0, height),
    });
    const titleAt = portrait ? at(0.5, 0.15) : at(0.29, 0.25);
    const playAt = portrait ? at(0.5, 0.36) : at(0.29, 0.6);
    // Rasterize text at the physical font size instead of enlarging a low-DPI texture.
    this.title
      .setPosition(titleAt.x, titleAt.y)
      .setFontSize(
        Math.min(104 * uiScale, (portrait ? width : width * 0.5) / 4.2),
      )
      .setStroke('#2E6B1F', 14 * uiScale)
      .setWordWrapWidth(portrait ? width * 0.9 : width * 0.52);
    this.numerals
      .setPosition(width / 2, height * 0.41)
      .setFontSize(64 * uiScale);
    this.pulse?.stop();
    const playSize = Math.max(
      112 * getRenderScale(),
      Math.min(200 * uiScale, (portrait ? height : width) * 0.16),
    );
    this.play
      ?.setPosition(playAt.x, playAt.y)
      .setDisplaySize(playSize, playSize);
    const motion = readSave().settings.reducedMotion;
    if (
      this.play &&
      motion !== 'on' &&
      !(
        motion === 'system' &&
        matchMedia('(prefers-reduced-motion: reduce)').matches
      ) &&
      this.game.registry.get('fast-mode') !== true
    )
      this.pulse = this.tweens.add({
        targets: this.play,
        scaleX: '*=1.06',
        scaleY: '*=1.06',
        duration: 1100,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    const size = Math.max(
      64 * Math.min(window.devicePixelRatio, 2),
      72 * uiScale,
    );
    ['btn-lock', 'btn-sandbox', 'btn-practice', 'btn-dev'].forEach(
      (name, i) => {
        const b = this.children.getByName(
          name,
        ) as Phaser.GameObjects.Image | null;
        b?.setDisplaySize(size, size).setPosition(
          i === 0 ? width - size * 0.65 : size * (i - 0.35) * 1.25,
          height - size * 0.65,
        );
      },
    );
  }
}
