import { bindButton } from '../ui/Button';
import Phaser from 'phaser';
import { coverBackground } from '../layout/background';
import { NinePanel } from '../ui/NinePanel';
import { CONFIG } from '../config';
import { stars } from '../core/scoring';
import type { LevelState } from '../core/types';
import { getLayout } from '../layout/layout';
import { authoredLevels } from '../controllers/LevelController';
import { AudioManager } from '../services/audio';
import { readSave } from '../services/storage';
import { t } from '../services/strings';
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
      this.scene.start('WorldMapScene');
      return;
    }
    const rating = stars(state.hintsUsed, state.hint.maxLevel);
    const background = this.add
      .image(0, 0, `bg_world_${state.level.world}`)
      .setOrigin(0);
    // Generated parchment board holds the result; the wooden sign titles it.
    const board = new NinePanel(this, 'panel_board').setName('result-board');
    const pill = new NinePanel(this, 'panel_banner').setDepth(1);
    const mascot = this.add
      .image(0, 0, 'mascot_clap')
      .setDepth(2)
      .setName('result-mascot');
    const label = this.add
      .text(0, 0, t(`result_stars_${rating}`), {
        fontFamily: CONFIG.fontStack,
        fontStyle: '800',
        fontSize: 44,
        color: '#4A2A12',
        rtl: true,
      })
      .setOrigin(0.5)
      .setDepth(1)
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
        action: () => this.scene.start('WorldMapScene'),
      },
      {
        name: 'btn-replay',
        texture: 'btn_replay',
        action: () =>
          state.levelId.startsWith('practice-')
            ? this.scene.start('PracticeScene')
            : this.scene.start('GameScene', { levelId: state.levelId }),
      },
      {
        name: 'btn-next',
        texture: 'btn_next',
        action: () =>
          state.levelId.startsWith('practice-')
            ? this.scene.start('PracticeScene')
            : next
              ? // The last level of an island continues on the next island.
                this.scene.start('GameScene', { levelId: next.id })
              : this.scene.start('WorldMapScene'),
      },
    ];
    const buttons = actions.map(({ name, texture, action }) => {
      const button = this.add
        .image(0, 0, texture)
        .setName(name)
        .setInteractive({ useHandCursor: true });
      bindButton(
        this,
        button,
        name === 'btn-home'
          ? 'ui_home'
          : name === 'btn-next'
            ? 'ui_next'
            : 'ui_replay',
        action,
      );
      return button;
    });
    // Keep free play one tap away after completing a level.
    const sandbox = this.add
      .image(0, 0, 'btn_sandbox')
      .setName('btn-sandbox')
      .setInteractive();
    bindButton(this, sandbox, 'ui_sandbox', () =>
      this.scene.start('SandboxScene'),
    );
    const audio = new AudioManager(this, readSave().settings, () => {});
    if (this.game.registry.get('audio-unlocked')) audio.unlock();
    audio.setFastMode(this.game.registry.get('fast-mode') === true);
    // No spoken verdict here (stars + chimes say it); the praise VO already
    // played at the moment of success.
    this.game.events.emit('gameplay-event', {
      type: 'result',
      data: { levelId: state.levelId, stars: rating, errors: state.errors },
    });
    const layout = () => {
      const { width, height } = this.scale.gameSize,
        { uiScale, centerX } = getLayout(width, height);
      const portrait = height > width;
      coverBackground(background, width, height, state.level.world);
      const boardW = Math.min(width * 0.9, 640 * uiScale),
        boardH = Math.min(height * (portrait ? 0.56 : 0.66), 470 * uiScale),
        boardY = height * (portrait ? 0.38 : 0.47),
        top = boardY - boardH / 2;
      board.setPosition(centerX, boardY).resize(boardW, boardH, 0.55 * uiScale);
      label
        .setPosition(centerX, top + 8 * uiScale)
        .setFontSize(40 * uiScale)
        .setWordWrapWidth(boardW * 0.7);
      pill.fitText(label, 44 * uiScale, 20 * uiScale);
      starImages.forEach((star, i) =>
        star
          .setPosition(
            centerX + (i - 1) * 130 * uiScale,
            top + boardH * 0.4 - (i === 1 ? 14 * uiScale : 0),
          )
          .setDisplaySize(
            (i === 1 ? 128 : 108) * uiScale,
            (i === 1 ? 128 : 108) * uiScale,
          ),
      );
      buttons.forEach((button, i) =>
        button
          .setPosition(centerX + (i - 1) * 150 * uiScale, top + boardH * 0.76)
          .setDisplaySize(112 * uiScale, 112 * uiScale),
      );
      const mascotH = portrait
        ? Math.min(260 * uiScale * 1.5, height - (top + boardH) - 40 * uiScale)
        : Math.min(198 * uiScale, height - (top + boardH) + 60 * uiScale);
      mascot
        .setPosition(
          portrait
            ? centerX - 90 * uiScale
            : centerX - boardW / 2 - 20 * uiScale,
          portrait
            ? height - mascotH / 2 - 8 * uiScale
            : boardY + boardH / 2 - mascotH / 2 + 30 * uiScale,
        )
        .setDisplaySize((mascotH * 190) / 198, mascotH);
      sandbox
        .setPosition(
          portrait
            ? centerX + 110 * uiScale
            : centerX + boardW / 2 + 10 * uiScale,
          portrait ? height - 70 * uiScale : boardY + boardH / 2 - 30 * uiScale,
        )
        .setDisplaySize(96 * uiScale, 96 * uiScale);
    };
    layout();
    const settings = readSave().settings;
    const reduced =
      this.game.registry.get('fast-mode') === true ||
      settings.reducedMotion === 'on' ||
      (settings.reducedMotion === 'system' &&
        matchMedia('(prefers-reduced-motion: reduce)').matches);
    starImages.forEach((star, i) => {
      if (!reduced) {
        star.setAlpha(0);
        this.tweens.add({
          targets: star,
          alpha: 1,
          duration: 300,
          delay: i * 250,
          ease: 'Sine.easeOut',
        });
      }
      this.time.delayedCall(reduced ? 0 : i * 250, () => {
        void audio.play(`sfx_star_${i + 1}`);
      });
    });
    this.scale.on(Phaser.Scale.Events.RESIZE, layout);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, layout);
      audio.destroy();
    });
  }
}
