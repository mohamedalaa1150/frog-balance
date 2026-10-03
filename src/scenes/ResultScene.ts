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
    const audio = new AudioManager(this, readSave().settings, () => {});
    if (this.game.registry.get('audio-unlocked')) audio.unlock();
    audio.setFastMode(this.game.registry.get('fast-mode') === true);
    // No spoken verdict here (stars + chimes say it); the praise VO already
    // played at the moment of success.
    this.game.events.emit('gameplay-event', {
      type: 'result',
      data: { levelId: state.levelId, stars: rating, errors: state.errors },
    });
    // Star sizes: the middle star is the hero. Stars and buttons read
    // right-to-left (RTL): star 1 and Home sit on the right, Next on the left.
    const starSize = (i: number) => (i === 1 ? 168 : 128);
    const layout = () => {
      const { width, height } = this.scale.gameSize,
        { uiScale, centerX } = getLayout(width, height);
      coverBackground(background, width, height, state.level.world);
      const boardW = Math.min(width * 0.62, 760 * uiScale),
        boardH = Math.min(height * 0.74, 540 * uiScale),
        boardY = height * 0.53,
        top = boardY - boardH / 2;
      board.setPosition(centerX, boardY).resize(boardW, boardH, 0.6 * uiScale);
      label
        .setPosition(centerX, top + 6 * uiScale)
        .setFontSize(44 * uiScale)
        .setWordWrapWidth(boardW * 0.72);
      pill.fitText(label, 48 * uiScale, 22 * uiScale);
      starImages.forEach((star, i) =>
        star
          .setPosition(
            centerX + (1 - i) * 170 * uiScale,
            top + boardH * 0.4 - (i === 1 ? 22 * uiScale : 0),
          )
          .setDisplaySize(starSize(i) * uiScale, starSize(i) * uiScale),
      );
      buttons.forEach((button, i) =>
        button
          .setPosition(centerX + (1 - i) * 170 * uiScale, top + boardH * 0.77)
          .setDisplaySize(128 * uiScale, 128 * uiScale),
      );
      const mascotH = Math.min(250 * uiScale, height * 0.38);
      mascot
        .setPosition(
          Math.max(
            mascotH * 0.48 + 8 * uiScale,
            centerX - boardW / 2 - mascotH * 0.32,
          ),
          height - mascotH / 2 - 12 * uiScale,
        )
        .setDisplaySize((mascotH * 190) / 198, mascotH);
    };
    layout();
    const settings = readSave().settings;
    const reduced =
      this.game.registry.get('fast-mode') === true ||
      settings.reducedMotion === 'on' ||
      (settings.reducedMotion === 'system' &&
        matchMedia('(prefers-reduced-motion: reduce)').matches);
    // Fill right-to-left: each star pops in with its own chime.
    starImages.forEach((star, i) => {
      if (!reduced) {
        const { scaleX, scaleY } = star;
        star.setScale(0);
        this.tweens.add({
          targets: star,
          scaleX,
          scaleY,
          duration: 380,
          delay: 200 + i * 320,
          ease: 'Back.easeOut',
        });
      }
      this.time.delayedCall(reduced ? 0 : 200 + i * 320, () => {
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
