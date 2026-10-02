import { menuLabel } from './MenuScene';
import { THEME, cssColor } from '../theme';
import Phaser from 'phaser';
import { coverBackground } from '../layout/background';
import { CONFIG } from '../config';
import { formatNumber } from '../core/numerals';
import { getLayout } from '../layout/layout';
import { bindButton } from '../ui/Button';
import { readSave } from '../services/storage';
import { t } from '../services/strings';
import { BaseScene, type SceneReadyEvent } from './BaseScene';

export class TitleScene extends BaseScene {
  private pond!: Phaser.GameObjects.Image;
  private mascot!: Phaser.GameObjects.Image;
  private title!: Phaser.GameObjects.Text;
  private play?: Phaser.GameObjects.Image;
  private numerals!: Phaser.GameObjects.Text;

  constructor() {
    super('TitleScene');
  }

  create(): void {
    this.pond = this.add
      .image(0, 0, 'bg_title')
      .setOrigin(0)
      .setName('title-pond');
    this.mascot = this.add.image(0, 0, 'mascot_happy').setName('title-mascot');
    this.title = this.add
      .text(0, 0, t('game_title'), {
        fontFamily: CONFIG.fontStack,
        fontSize: '96px',
        fontStyle: '800',
        color: cssColor(THEME.cream),
        stroke: cssColor(THEME.navy),
        strokeThickness: 8,
        rtl: true,
        padding: { left: 16, right: 16, top: 16, bottom: 16 },
      })
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
      .setName('numerals-text');
    this.play = this.add
      .image(0, 0, 'btn_play')
      .setName('btn-play')
      .setInteractive({ useHandCursor: true });
    bindButton(this, this.play, 'ui_next', () => {
      this.game.registry.set('audio-unlocked', true);
      this.sound.unlock();
      this.scene.start('WorldMapScene');
    });
    const buttons = [
      ['btn-lock', 'btn_lock', 'gate_hold', 'GrownUpGateScene'],
      ['btn-sandbox', 'btn_read', 'ui_sandbox', 'SandboxScene'],
      ['btn-practice', 'btn_hint', 'ui_practice', 'PracticeScene'],
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
    const motion = readSave().settings.reducedMotion;
    if (
      motion !== 'on' &&
      !(
        motion === 'system' &&
        matchMedia('(prefers-reduced-motion: reduce)').matches
      )
    )
      this.tweens.add({
        targets: this.mascot,
        y: '-=8',
        duration: 1200,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
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
      visible: this.title.visible && this.numerals.visible,
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
    const { centerX, uiScale } = getLayout(width, height);
    // Rasterize text at the physical font size instead of enlarging a low-DPI texture.
    this.title.setPosition(centerX, height * 0.27).setFontSize(96 * uiScale);
    this.numerals.setPosition(centerX, height * 0.41).setFontSize(64 * uiScale);
    this.play
      ?.setPosition(centerX, height * 0.56)
      .setDisplaySize(112 * uiScale, 112 * uiScale);
    coverBackground(this.pond, width, height, 2);
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
    this.mascot
      .setPosition(centerX, height * 0.8)
      .setDisplaySize(220 * uiScale, 230 * uiScale);
  }
}
