import Phaser from 'phaser';
import { coverBackground } from '../layout/background';
import { drawTextPill } from '../ui/textPill';
import { CONFIG } from '../config';
import { stars } from '../core/scoring';
import type { LevelState } from '../core/types';
import { getLayout } from '../layout/layout';
import { authoredLevels } from '../controllers/LevelController';
import { AudioManager } from '../services/audio';
import { readSave } from '../services/storage';
import { t } from '../services/strings';
import { THEME, cssColor } from '../theme';
import { BaseScene } from './BaseScene';

export class ResultScene extends BaseScene {
  private state?: LevelState;
  constructor() {
    super('ResultScene');
  }
  override init(data: { state?: LevelState } = {}): void {
    super.init();
    this.state = data.state;
  }
  create(): void {
    const state = this.state;
    if (!state) {
      this.scene.start('DevLevelListScene');
      return;
    }
    const rating = stars(state.hintsUsed, state.hint.maxLevel);
    const background = this.add
      .image(0, 0, `bg_world_${state.level.world}`)
      .setOrigin(0);
    const pill = this.add.graphics();
    const mascot = this.add.image(0, 0, 'mascot_clap').setName('result-mascot');
    const label = this.add
      .text(0, 0, t(`result_stars_${rating}`), {
        fontFamily: CONFIG.fontStack,
        fontStyle: '800',
        fontSize: 44,
        color: cssColor(THEME.navy),
        rtl: true,
      })
      .setOrigin(0.5)
      .setName('result-title');
    const starImages = Array.from({ length: 3 }, (_, i) =>
      this.add
        .image(0, 0, i < rating ? 'star_full' : 'star_empty')
        .setName(`result-star-${i + 1}`),
    );
    const currentIndex = authoredLevels.findIndex(
      (level) => level.id === state.levelId,
    );
    const next = authoredLevels[currentIndex + 1];
    const actions = [
      {
        name: 'btn-home',
        texture: 'btn_home',
        action: () => this.scene.start('DevLevelListScene'),
      },
      {
        name: 'btn-replay',
        texture: 'btn_replay',
        action: () => this.scene.start('GameScene', { levelId: state.levelId }),
      },
      {
        name: 'btn-next',
        texture: 'btn_next',
        action: () =>
          next
            ? this.scene.start('GameScene', { levelId: next.id })
            : this.scene.start('DevLevelListScene'),
      },
    ];
    const buttons = actions.map(({ name, texture, action }) => {
      const button = this.add
        .image(0, 0, texture)
        .setName(name)
        .setInteractive({ useHandCursor: true });
      button.on('pointerdown', action);
      return button;
    });
    // Free-play shortcut is retained on this temporary result screen.
    const sandbox = this.add
      .image(0, 0, 'btn_read')
      .setName('btn-sandbox')
      .setInteractive();
    sandbox.on('pointerdown', () => this.scene.start('SandboxScene'));
    const audio = new AudioManager(this, readSave().settings, () => {});
    if (this.game.registry.get('audio-unlocked')) audio.unlock();
    audio.setFastMode(this.game.registry.get('fast-mode') === true);
    void audio.play(`result_stars_${rating}`, 'vo');
    this.game.events.emit('gameplay-event', {
      type: 'result',
      data: { levelId: state.levelId, stars: rating, errors: state.errors },
    });
    const layout = () => {
      const { width, height } = this.scale.gameSize,
        { uiScale, centerX } = getLayout(width, height);
      coverBackground(background, width, height, state.level.world);
      label
        .setPosition(centerX, height * 0.26)
        .setFontSize(44 * uiScale)
        .setWordWrapWidth(width * 0.9);
      drawTextPill(pill, label, uiScale);
      mascot
        .setPosition(centerX, height * 0.84)
        .setDisplaySize(120 * uiScale, 125 * uiScale);
      starImages.forEach((star, i) =>
        star
          .setPosition(centerX + (i - 1) * 120 * uiScale, height * 0.43)
          .setDisplaySize(96 * uiScale, 96 * uiScale),
      );
      buttons.forEach((button, i) =>
        button
          .setPosition(centerX + (i - 1) * 150 * uiScale, height * 0.65)
          .setDisplaySize(112 * uiScale, 112 * uiScale),
      );
      sandbox
        .setPosition(centerX + 150 * uiScale, height * 0.84)
        .setDisplaySize(96 * uiScale, 96 * uiScale);
    };
    layout();
    this.scale.on(Phaser.Scale.Events.RESIZE, layout);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, layout);
      audio.destroy();
    });
  }
}
