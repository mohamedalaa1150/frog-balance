import { THEME, cssColor, tileColor } from '../theme';
import Phaser from 'phaser';
import { CONFIG } from '../config';
import { LevelController } from '../controllers/LevelController';
import { drawTextPill } from '../ui/textPill';
import { coverBackground } from '../layout/background';
import { EquationBar } from '../objects/EquationBar';
import { HintOverlay } from '../objects/HintOverlay';
import { formatNumber } from '../core/numerals';
import { panWeight, diff } from '../core/balance';
import type { LevelState, Side } from '../core/types';
import { getLayout } from '../layout/layout';
import { getGameplayLayout } from '../layout/gameplayLayout';
import { getRenderScale } from '../layout/viewport';
import { Balance } from '../objects/Balance';
import { FrogPile } from '../objects/FrogPile';
import { NumberTray } from '../objects/NumberTray';
import type {
  PlaceableItem,
  ItemInteractions,
  ReturnTarget,
} from '../objects/PlaceableItem';
import { AudioManager } from '../services/audio';
import { composePanReading } from '../services/reading';
import { readSave } from '../services/storage';
import { hasString, t } from '../services/strings';
import { BaseScene } from './BaseScene';
export class GameScene extends BaseScene {
  controller!: LevelController;
  balance!: Balance;
  private pile?: FrogPile;
  private tray!: NumberTray;
  private subtitlePill!: Phaser.GameObjects.Graphics;
  private subtitle!: Phaser.GameObjects.Text;
  private equation!: EquationBar;
  private hints!: HintOverlay;
  private peg?: Phaser.GameObjects.Image;
  private predictions: Phaser.GameObjects.Image[] = [];
  private board!: Phaser.GameObjects.Text;
  private renderedState?: LevelState;
  private lastHint = 0;
  private explanationPending = false;
  private navigation: Phaser.GameObjects.Image[] = [];
  private trayBackground!: Phaser.GameObjects.Image;
  private background!: Phaser.GameObjects.Image;
  private guide?: Phaser.GameObjects.Image;
  private audio!: AudioManager;
  private settings = readSave().settings;
  private levelId = 'w1-l1';
  private lastTick = 0;
  private returnAt = Infinity;
  private lastDiff?: number;
  private activeSide: Side = 'right';
  private interactions!: ItemInteractions;
  constructor(key = 'GameScene') {
    super(key);
  }
  init(data: { levelId?: string } = {}): void {
    super.init();
    this.levelId =
      this.scene.key === 'SandboxScene' ? 'sandbox' : (data.levelId ?? 'w1-l1');
    this.lastTick = 0;
    this.returnAt = Infinity;
    this.lastDiff = undefined;
    this.navigation = [];
    this.pile = undefined;
    this.guide = undefined;
    this.peg = undefined;
    this.predictions = [];
    this.renderedState = undefined;
    this.lastHint = 0;
    this.explanationPending = false;
    this.settings = readSave().settings;
  }
  get reducedMotion(): boolean {
    return (
      this.settings.reducedMotion === 'on' ||
      (this.settings.reducedMotion === 'system' &&
        matchMedia('(prefers-reduced-motion: reduce)').matches)
    );
  }
  create(): void {
    // Keep the specified durations even when a frame takes more than 500 ms.
    this.tweens.setLagSmooth();
    this.input.dragDistanceThreshold = 8 * getRenderScale();
    this.background = this.add.image(0, 0, 'bg_world_1').setOrigin(0);
    this.trayBackground = this.add.image(0, 0, 'tray_bg');
    this.subtitlePill = this.add.graphics().setDepth(29);
    this.subtitle = this.add
      .text(
        0,
        0,
        t(this.levelId === 'sandbox' ? 'ui_sandbox' : 'intro_count'),
        {
          fontFamily: CONFIG.fontStack,
          fontSize: 24,
          fontStyle: '700',
          color: cssColor(THEME.navy),
          rtl: true,
          align: 'center',
        },
      )
      .setOrigin(0.5)
      .setDepth(30);
    this.equation = new EquationBar(this);
    this.hints = new HintOverlay(this);
    this.board = this.add
      .text(0, 0, '', {
        fontFamily: CONFIG.fontStack,
        fontSize: 25,
        fontStyle: '800',
        color: cssColor(THEME.navy),
        align: 'center',
      })
      .setOrigin(0.5)
      .setName('solutions-board')
      .setDepth(30);
    this.audio = new AudioManager(this, this.settings, (text) => {
      this.subtitle.setText(text);
      drawTextPill(
        this.subtitlePill,
        this.subtitle,
        getLayout(this.scale.width, this.scale.height).uiScale,
      );
    });
    if (this.game.registry.get('audio-unlocked') === true) this.audio.unlock();
    this.input.once('pointerdown', () => {
      this.game.registry.set('audio-unlocked', true);
      this.audio.unlock();
    });
    this.balance = new Balance(this);
    this.interactions = {
      tap: (item) => this.tap(item),
      drop: (item, x, y) => this.drop(item, x, y),
      dragging: (item, on) => {
        this.controller.dragging(item.name, on);
        if (on) void this.audio.play('sfx_pickup');
      },
      feedback: (key) => this.feedback(key),
      fast: () => this.controller.fast,
      reduced: () => this.reducedMotion,
    };
    this.controller = new LevelController(
      this,
      this.levelId,
      this.settings,
      (state) => this.render(state),
      (key, side) => {
        this.balance.pans[side].reject(
          this.reducedMotion || this.controller.fast,
        );
        this.feedback(key);
      },
      (key) => {
        if (this.settings.voCount) void this.audio.play(key, 'vo', 'interrupt');
      },
      () => this.celebrate(),
    );
    this.controller.fast = this.game.registry.get('fast-mode') === true;
    this.audio.setFastMode(this.controller.fast);
    this.events.on('item-placed', this.onPlaced, this);
    const level = this.controller.state.level;
    if (hasString(level.vo.intro)) this.subtitle.setText(t(level.vo.intro));
    if (level.mode === 'compare') {
      this.peg = this.add
        .image(0, 0, 'peg_lock')
        .setName('peg-lock')
        .setDepth(15);
      for (const choice of ['left', 'equal', 'right'] as const) {
        const button = this.add
          .image(0, 0, `predict_${choice}`)
          .setName(`predict-${choice}`)
          .setInteractive({ useHandCursor: true });
        button.on('pointerdown', () =>
          this.controller.dispatch({ type: 'predict', choice }),
        );
        this.predictions.push(button);
      }
    }
    void this.audio.play(`music_world_${level.world}`, 'music');
    this.background.setTexture(`bg_world_${level.world}`);
    if (level.tray.frogs)
      this.pile = new FrogPile(this, this.settings.numerals, this.interactions);
    this.tray = new NumberTray(
      this,
      level.tray.numbers,
      this.settings.numerals,
      this.interactions,
    );
    this.addButton('btn-home', 'btn_home', () =>
      this.scene.start('DevLevelListScene'),
    );
    this.addButton('btn-sound', 'btn_sound_on', () => {
      if (hasString(level.vo.intro))
        void this.audio.play(level.vo.intro, 'vo', 'interrupt');
    });
    if (level.mode === 'sandbox') {
      this.addButton('btn-read', 'btn_read', () => this.readEquation());
      for (const side of ['left', 'right'] as const)
        this.balance.pans[side].on('pointerdown', () => {
          this.activeSide = side;
        });
    } else
      this.addButton('btn-hint', 'btn_hint', () =>
        this.controller.dispatch({ type: 'requestHint' }),
      );
    if (level.guideArrow) this.guide = this.add.image(0, 0, 'hint_hand');
    this.render(this.controller.state);
    this.relayout();
    this.scale.on(Phaser.Scale.Events.RESIZE, this.relayout, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.events.off('item-placed', this.onPlaced, this);
      this.audio.destroy();
      this.scale.off(Phaser.Scale.Events.RESIZE, this.relayout, this);
    });
    if (hasString(level.vo.intro)) void this.audio.play(level.vo.intro, 'vo');
    this.markReady();
  }
  private onPlaced(): void {
    const variant = `sfx_drop_pan_${Phaser.Math.Between(0, 1) ? 'a' : 'b'}`;
    void this.audio.play(
      this.cache.audio.exists(variant) ? variant : 'sfx_drop_pan',
    );
  }
  private addButton(name: string, texture: string, action: () => void): void {
    const button = this.add
      .image(0, 0, texture)
      .setName(name)
      .setInteractive({ useHandCursor: true });
    button.on('pointerdown', action);
    this.navigation.push(button);
  }
  private feedback(
    key: 'feedback_locked' | 'feedback_wrong_pan' | 'feedback_pan_full',
  ): void {
    this.subtitle.setText(t(key));
    drawTextPill(
      this.subtitlePill,
      this.subtitle,
      getLayout(this.scale.width, this.scale.height).uiScale,
    );
    void this.audio.play(key, 'vo', 'interrupt');
    this.game.events.emit('gameplay-event', {
      type: 'feedback',
      data: { key },
    });
  }
  private tap(item: PlaceableItem): void {
    if (item.source)
      this.controller.place(
        item.spec,
        this.controller.state.level.workPan ?? this.activeSide,
      );
    else {
      const side = this.sideOf(item);
      if (side)
        this.controller.remove(side, item.name.slice(`item-${side}-`.length));
    }
  }
  private sideOf(item: PlaceableItem): Side | undefined {
    return item.name.startsWith('item-left-')
      ? 'left'
      : item.name.startsWith('item-right-')
        ? 'right'
        : undefined;
  }
  private drop(
    item: PlaceableItem,
    x: number,
    y: number,
  ): boolean | ReturnTarget {
    for (const side of ['left', 'right'] as const)
      if (this.balance.pans[side].contains(x, y)) {
        if (item.source) return this.controller.place(item.spec, side);
        const from = this.sideOf(item);
        return from
          ? this.controller.move(
              from,
              side,
              item.name.slice(`item-${from}-`.length),
            )
          : false;
      }
    if (!item.source && !item.fixed) {
      const side = this.sideOf(item);
      const source =
        item.spec.kind === 'frog'
          ? this.pile
          : this.tray.items.find(
              (candidate) => candidate.spec.value === item.spec.value,
            );
      if (side && source) {
        const matrix = source.getWorldTransformMatrix();
        const destination = {
          x: matrix.tx,
          y: matrix.ty,
          scaleX:
            Math.hypot(matrix.a, matrix.b) *
            (item.spec.kind === 'number'
              ? source.image.displayWidth / item.image.displayWidth
              : 1),
          scaleY:
            Math.hypot(matrix.c, matrix.d) *
            (item.spec.kind === 'number'
              ? source.image.displayHeight / item.image.displayHeight
              : 1),
        };
        if (
          this.controller.remove(side, item.name.slice(`item-${side}-`.length))
        ) {
          void this.audio.play('sfx_bounce_back');
          return destination;
        }
      }
    }
    void this.audio.play('sfx_bounce_back');
    return false;
  }
  private render(state: LevelState): void {
    for (const side of ['left', 'right'] as const) {
      this.balance.pans[side].setWorkActive(
        state.level.mode === 'sandbox' || side === state.level.workPan,
      );
      this.balance.pans[side].render(
        state.pans[side],
        this.settings.numerals,
        this.interactions,
      );
    }
    const before = this.renderedState;
    this.renderedState = state;
    const difference = diff(state.pans.left, state.pans.right);
    const compare = state.level.mode === 'compare';
    const locked = compare && !state.prediction;
    this.peg?.setVisible(locked);
    for (const button of this.predictions) {
      button.setAlpha(locked ? 1 : 0.45);
      if (button.input) button.input.enabled = locked;
    }
    if (compare && state.prediction && !before?.prediction)
      void this.audio.play('sfx_unlock');
    this.equation.render(
      state,
      this.settings.numerals,
      this.reducedMotion || this.controller.fast,
    );
    this.hints.render(state, this.balance, this.tray, this.settings.numerals);
    const number = (n: number) => formatNumber(n, this.settings.numerals);
    const target = state.level.workPan
      ? panWeight(
          state.level.fixed[state.level.workPan === 'left' ? 'right' : 'left'],
        )
      : 0;
    this.board.setVisible(state.level.mode === 'bond').setText(
      state.solutionsFound
        .map(
          (solution) =>
            `${solution
              .split('+')
              .map((n) => number(Number(n)))
              .reverse()
              .join(' + ')} = ${number(target)}`,
        )
        .join('    '),
    );
    if (
      state.outcome === 'solution' &&
      before?.solutionsFound.length !== state.solutionsFound.length
    ) {
      this.returnBondTiles(before);
      void this.audio.play('bond_found_one', 'vo', 'interrupt');
      this.balance.mascot.jump(this.reducedMotion || this.controller.fast);
    } else if (
      state.outcome === 'duplicate' &&
      before?.outcome !== 'duplicate'
    ) {
      this.returnBondTiles(before);
      void this.audio.play('bond_already_found', 'vo', 'interrupt');
    }
    if (state.hintLevel > this.lastHint) this.playHint(state);
    this.lastHint = state.hintLevel;
    if (state.phase === 'revealing' && !this.explanationPending) {
      this.explanationPending = true;
      void this.explainPrediction(state);
    }
    if (this.lastDiff !== undefined && difference !== this.lastDiff) {
      void this.audio.play('sfx_beam_creak');
      if (difference === 0) void this.audio.play('sfx_balanced_ding');
    }
    this.lastDiff = difference;
    this.balance.setDifference(
      locked ? 0 : difference,
      this.reducedMotion,
      this.controller.fast,
    );

    if (this.guide)
      this.guide.setVisible(state.pans[state.level.workPan!].length === 0);
  }
  update(time: number, delta: number): void {
    if (!this.controller) return;
    this.balance.update(delta);
    if (time >= this.returnAt) {
      this.returnAt = Infinity;
      this.scene.start('ResultScene', { state: this.controller.state });
      return;
    }
    if (time - this.lastTick >= 100) {
      this.lastTick = time;
      this.controller.tick();
    }
  }
  setFastMode(on: boolean): void {
    if (on)
      for (const tween of this.tweens.getTweens()) {
        tween.seek(1);
        tween.complete();
      }
    this.controller.fast = on;
    if (on && this.controller.state.phase === 'success')
      this.returnAt = this.time.now;
    this.audio.setFastMode(on);
    this.render(this.controller.state);
    this.controller.tick();
  }
  private relayout(): void {
    const { width, height } = this.scale.gameSize;
    const layout = getGameplayLayout(
      width,
      height,
      this.tray.items.length,
      !!this.pile,
      this.controller.state.level.mode === 'bond'
        ? 100
        : this.controller.state.level.showEquation ||
            this.controller.state.level.mode === 'compare'
          ? 60
          : 0,
    );
    const { uiScale, balance, tray, pile, hud } = layout;
    const centerX = width / 2;
    this.balance.setSpan(balance.halfSpan);
    coverBackground(
      this.background,
      width,
      height,
      this.controller.state.level.world,
    );
    this.balance.setPosition(balance.x, balance.y).setScale(balance.scale);
    this.trayBackground
      .setPosition(centerX, (tray.top + height) / 2)
      .setDisplaySize(width - 12 * getRenderScale(), height - tray.top);
    this.tray.layout(tray, uiScale);
    this.pile?.setPosition(pile.x, pile.y).setScale(uiScale);
    this.navigation.forEach((button, i) =>
      button
        .setDisplaySize(88 * uiScale, 88 * uiScale)
        .setPosition((70 + i * 108) * uiScale, 70 * uiScale),
    );
    this.subtitle
      .setPosition(centerX, hud.subtitleY)
      .setFontSize(24 * uiScale)
      .setWordWrapWidth(width * 0.88);
    drawTextPill(this.subtitlePill, this.subtitle, uiScale);
    this.equation.layout(this.balance, 178 * uiScale, uiScale);
    this.board
      .setPosition(centerX, 218 * uiScale)
      .setFontSize(23 * uiScale)
      .setWordWrapWidth(width * 0.9);
    this.hints.layout(
      centerX,
      tray.top - 48 * uiScale,
      Math.min(uiScale, (width * 0.9) / 620),
    );
    this.peg
      ?.setPosition(balance.x, balance.y)
      .setDisplaySize(80 * uiScale, 80 * uiScale);
    this.predictions.forEach((button, i) =>
      button
        .setPosition(
          centerX +
            (i - 1) * (layout.orientation === 'portrait' ? 200 : 230) * uiScale,
          height - 104 * uiScale,
        )
        .setDisplaySize(160 * uiScale, 160 * uiScale),
    );
    if (this.guide) {
      const side = this.controller.state.level.workPan!;
      this.guide
        .setPosition(
          balance.x +
            (side === 'right' ? balance.halfSpan : -balance.halfSpan) *
              balance.scale,
          balance.y + 60 * balance.scale,
        )
        .setDisplaySize(64 * uiScale, 64 * uiScale);
    }
  }

  private celebrate(): void {
    const reduced = this.reducedMotion || this.controller.fast;
    this.balance.mascot.jump(reduced);
    void this.audio.play('sfx_success');
    if (!reduced) {
      const { uiScale } = getLayout(this.scale.width, this.scale.height);
      const emitter = this.add
        .particles(this.balance.x, this.balance.y, 'particle_confetti', {
          tint: [THEME.coral, THEME.gold, THEME.blue, THEME.frog, THEME.purple],
          speed: { min: 80 * uiScale, max: 200 * uiScale },
          lifespan: 650,
          quantity: 20,
          scale: { start: (0.6 * uiScale) / getRenderScale(), end: 0 },
          emitting: false,
        })
        .setDepth(25);
      emitter.explode(20);
      this.time.delayedCall(700, () => emitter.destroy());
    }
    void this.audio.play(
      this.controller.state.level.mode === 'compare'
        ? 'compare_correct'
        : `success_${Phaser.Math.Between(1, 6)}`,
      'vo',
      'interrupt',
    );
    this.returnAt = this.time.now + (this.controller.fast ? 200 : 1700);
  }
  private returnBondTiles(before?: LevelState): void {
    if (!before?.level.workPan) return;
    const side = before.level.workPan;
    for (const item of before.pans[side].filter((item) => !item.fixed)) {
      const source = this.tray.items.find(
        (tile) => tile.spec.value === item.value,
      );
      if (!source) continue;
      this.game.events.emit('gameplay-event', {
        type: 'bond-return',
        data: { value: item.value },
      });
      if (this.reducedMotion || this.controller.fast) continue;
      const start = this.balance.pans[side].getWorldTransformMatrix();
      const end = source.getWorldTransformMatrix();
      const copy = this.add
        .container(start.tx, start.ty - 60 * this.balance.scaleY)
        .setDepth(25);
      copy.add(
        this.add
          .image(0, 0, `num_tile_${item.value}`)
          .setDisplaySize(64 * this.balance.scaleX, 80 * this.balance.scaleY),
      );
      copy.add(
        this.add
          .text(0, 0, formatNumber(item.value!, this.settings.numerals), {
            fontFamily: CONFIG.fontStack,
            fontStyle: '800',
            fontSize: 38 * this.balance.scaleX,
            color: cssColor(tileColor(item.value!)),
          })
          .setOrigin(0.5),
      );
      this.tweens.add({
        targets: copy,
        x: end.tx,
        y: end.ty,
        duration: 350,
        ease: 'Sine.easeOut',
        onComplete: () => copy.destroy(),
      });
    }
  }
  private playHint(state: LevelState): void {
    const mode = state.level.mode === 'equation' ? 'missing' : state.level.mode;
    const key = `hint_${mode}_${mode === 'compare' ? 1 : state.hintLevel}`;
    void this.audio.play(key, 'vo', 'interrupt');
    if (state.hintLevel !== 3 || !state.level.workPan) return;
    const side = state.level.workPan;
    const missing = Math.max(
      0,
      side === 'right'
        ? -diff(state.pans.left, state.pans.right)
        : diff(state.pans.left, state.pans.right),
    );
    if (mode === 'count' && missing) {
      this.time.delayedCall(
        this.controller.fast || this.reducedMotion ? 0 : 400,
        () => {
          if (this.controller.state.phase === 'success') return;
          this.balance.mascot.jump(this.controller.fast || this.reducedMotion);
          this.controller.place({ kind: 'frog' }, side);
          this.game.events.emit('gameplay-event', {
            type: 'hint-model',
            data: { mode, kind: 'frog' },
          });
        },
      );
    } else if (mode === 'missing') {
      for (let i = 1; i <= missing; i++)
        void this.audio.play(`count_${String(i).padStart(2, '0')}`, 'vo');
    }
  }
  private async explainPrediction(state: LevelState): Promise<void> {
    const reading = composePanReading(state.pans);
    const keys = [
      reading.left === reading.right
        ? 'phrase_they_are_equal_because'
        : 'phrase_this_side_went_down_because',
      ...reading.keys,
      'compare_try_another',
    ];
    this.audio.stopVoice();
    await Promise.all(keys.map((key) => this.audio.play(key, 'vo')));
    if (!this.scene.isActive() || this.controller.state !== state) return;
    this.time.delayedCall(this.controller.fast ? 0 : 1000, () => {
      if (!this.scene.isActive() || this.controller.state !== state) return;
      this.explanationPending = false;
      this.controller.loadSibling();
      void this.audio.play('intro_compare', 'vo');
    });
  }
  readEquation(): void {
    const reading = composePanReading(this.controller.state.pans);
    this.game.events.emit('gameplay-event', {
      type: 'read',
      data: reading,
    });
    this.audio.stopVoice();
    for (const key of reading.keys) void this.audio.play(key, 'vo');
  }
}
