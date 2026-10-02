import { THEME, cssColor } from '../theme';
import Phaser from 'phaser';
import { CONFIG } from '../config';
import { authoredLevels } from '../controllers/LevelController';
import { formatNumber } from '../core/numerals';
import { getLayout } from '../layout/layout';
import { readSave } from '../services/storage';
import { t } from '../services/strings';
import { BaseScene } from './BaseScene';
export class DevLevelListScene extends BaseScene {
  constructor() {
    super('DevLevelListScene');
  }
  create(): void {
    const heading = this.add
      .text(0, 0, t('map_choose_level'), {
        fontFamily: CONFIG.fontStack,
        fontSize: 36,
        fontStyle: '700',
        color: cssColor(THEME.navy),
        rtl: true,
      })
      .setOrigin(0.5);
    const buttons = authoredLevels.map((level, index) => {
      const button = this.add
        .image(0, 0, 'lily_level')
        .setName(`level-${level.id}`)
        .setInteractive();
      button.on('pointerdown', () =>
        this.scene.start('GameScene', { levelId: level.id }),
      );
      const text = this.add
        .text(0, 0, formatNumber(index + 1, readSave().settings.numerals), {
          fontFamily: CONFIG.fontStack,
          fontSize: 42,
          fontStyle: '800',
          color: cssColor(THEME.navy),
        })
        .setOrigin(0.5);
      return { button, text };
    });
    const sandbox = this.add
      .image(0, 0, 'btn_read')
      .setName('btn-sandbox')
      .setInteractive();
    sandbox.on('pointerdown', () => this.scene.start('SandboxScene'));
    const label = this.add
      .text(0, 0, t('ui_sandbox'), {
        fontFamily: CONFIG.fontStack,
        fontSize: 28,
        fontStyle: '700',
        color: cssColor(THEME.navy),
        rtl: true,
      })
      .setOrigin(0.5);
    const home = this.add
      .image(0, 0, 'btn_home')
      .setName('btn-home')
      .setInteractive();
    home.on('pointerdown', () => this.scene.start('TitleScene'));
    const layout = () => {
      const { width, height } = this.scale.gameSize;
      const { uiScale, orientation, centerX } = getLayout(width, height);
      const columns = orientation === 'portrait' ? 6 : 12;
      const rows = Math.ceil(buttons.length / columns);
      const stepX = Math.min(100 * uiScale, (width * 0.9) / columns);
      const stepY = (height * 0.57) / rows;
      const size = Math.min(stepX, stepY) * 0.9;
      heading.setPosition(centerX, height * 0.12).setFontSize(36 * uiScale);
      buttons.forEach(({ button, text }, i) => {
        const x = centerX + ((i % columns) - (columns - 1) / 2) * stepX,
          y = height * 0.24 + Math.floor(i / columns) * stepY;
        button.setPosition(x, y).setDisplaySize(size, size);
        text.setPosition(x, y).setFontSize(size * 0.44);
      });
      sandbox
        .setPosition(centerX, height * 0.83)
        .setDisplaySize(96 * uiScale, 96 * uiScale);
      label.setPosition(centerX, height * 0.92).setFontSize(28 * uiScale);
      home
        .setPosition(64 * uiScale, 64 * uiScale)
        .setDisplaySize(80 * uiScale, 80 * uiScale);
    };
    layout();
    this.scale.on(Phaser.Scale.Events.RESIZE, layout);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () =>
      this.scale.off(Phaser.Scale.Events.RESIZE, layout),
    );
    this.markReady();
  }
}
