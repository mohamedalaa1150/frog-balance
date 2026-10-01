import Phaser from 'phaser';
import { CONFIG } from '../config';
import { formatNumber } from '../core/numerals';
import { getLayout } from '../layout/layout';

export class TitleScene extends Phaser.Scene {
  private pond!: Phaser.GameObjects.Graphics;
  private title!: Phaser.GameObjects.Text;
  private numerals!: Phaser.GameObjects.Text;

  constructor() {
    super('TitleScene');
  }

  create(): void {
    this.pond = this.add.graphics().setName('title-pond');
    this.title = this.add
      .text(0, 0, document.title, {
        fontFamily: CONFIG.fontStack,
        fontSize: '96px',
        fontStyle: '800',
        color: '#fff6e5',
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
          color: '#fff6e5',
          rtl: false,
          padding: { left: 8, right: 8, top: 8, bottom: 8 },
        },
      )
      .setOrigin(0.5)
      .setName('numerals-text');
    this.relayout();
    this.scale.on(Phaser.Scale.Events.RESIZE, this.relayout, this);
    const shown = () =>
      this.game.events.emit('title-ready', {
        scene: 'TitleScene',
        title: this.title.text,
        numerals: this.numerals.text,
        rtl: this.title.style.rtl,
        visible: this.title.visible && this.numerals.visible,
        titleBounds: this.title.getBounds(),
        numeralBounds: this.numerals.getBounds(),
        viewport: { width: this.scale.width, height: this.scale.height },
      });
    this.game.events.once(Phaser.Core.Events.POST_RENDER, shown);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, this.relayout, this);
      this.game.events.off(Phaser.Core.Events.POST_RENDER, shown);
    });
  }

  private relayout(): void {
    const { width, height } = this.scale.gameSize;
    const { centerX, uiScale } = getLayout(width, height);
    // Rasterize text at the physical font size instead of enlarging a low-DPI texture.
    this.title.setPosition(centerX, height * 0.38).setFontSize(96 * uiScale);
    this.numerals.setPosition(centerX, height * 0.53).setFontSize(64 * uiScale);
    this.pond.clear();
    // Solid strips provide a smooth gradient in both WebGL and Canvas renderers.
    const top = Phaser.Display.Color.ValueToColor('#87c9be');
    const bottom = Phaser.Display.Color.ValueToColor('#174d52');
    for (let row = 0; row < 128; row += 1) {
      const color = Phaser.Display.Color.Interpolate.ColorWithColor(
        top,
        bottom,
        127,
        row,
      );
      this.pond.fillStyle(
        Phaser.Display.Color.GetColor(color.r, color.g, color.b),
      );
      this.pond.fillRect(0, (height * row) / 128, width, height / 128 + 1);
    }
    this.pond.lineStyle(2 * uiScale, 0xd0efdf, 0.2);
    this.pond.strokeEllipse(
      width * 0.5,
      height * 0.78,
      width * 0.6,
      height * 0.13,
    );
    this.pond.strokeEllipse(
      width * 0.5,
      height * 0.78,
      width * 0.8,
      height * 0.22,
    );
    this.pond.fillStyle(0x5caa78, 0.7);
    this.pond.fillEllipse(
      width * 0.18,
      height * 0.87,
      160 * uiScale,
      58 * uiScale,
    );
    this.pond.fillEllipse(
      width * 0.85,
      height * 0.71,
      120 * uiScale,
      42 * uiScale,
    );
  }
}
