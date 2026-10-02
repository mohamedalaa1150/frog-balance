import { THEME, cssColor } from '../theme';
import Phaser from 'phaser';
import { CONFIG } from '../config';
import { formatNumber } from '../core/numerals';
import { getLayout } from '../layout/layout';
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
    this.mascot = this.add.image(0, 0, 'mascot_base').setName('title-mascot');
    this.title = this.add
      .text(0, 0, t('game_title'), {
        fontFamily: CONFIG.fontStack,
        fontSize: '96px',
        fontStyle: '800',
        color: cssColor(THEME.navy),
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
          formatNumber(index + 1, 'arabic-indic'),
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
    if (
      import.meta.env.DEV ||
      new URLSearchParams(location.search).get('test') === '1'
    ) {
      this.play = this.add
        .image(0, 0, 'btn_play')
        .setName('btn-play')
        .setInteractive({ useHandCursor: true });
      this.play.on('pointerdown', () => {
        this.game.registry.set('audio-unlocked', true);
        this.scene.start('DevLevelListScene');
      });
    }
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
    this.pond.setDisplaySize(width, height);
    this.mascot
      .setPosition(centerX, height * 0.8)
      .setDisplaySize(190 * uiScale, 200 * uiScale);
  }
}
