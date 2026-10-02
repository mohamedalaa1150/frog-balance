import Phaser from 'phaser';
import { CONFIG } from '../config';
import { LevelController } from '../controllers/LevelController';
import { diff, panWeight } from '../core/balance';
import type { LevelState, Side } from '../core/types';
import { getLayout } from '../layout/layout';
import { getRenderScale } from '../layout/viewport';
import { Balance } from '../objects/Balance';
import { FrogPile } from '../objects/FrogPile';
import { NumberTray } from '../objects/NumberTray';
import type { PlaceableItem, ItemInteractions } from '../objects/PlaceableItem';
import { AudioManager } from '../services/audio';
import { readSave } from '../services/storage';
import { hasString, t } from '../services/strings';
import { BaseScene } from './BaseScene';
export class GameScene extends BaseScene {
  controller!: LevelController;
  balance!: Balance;
  private pile?: FrogPile;
  private tray!: NumberTray;
  private subtitle!: Phaser.GameObjects.Text;
  private hint!: Phaser.GameObjects.Text;
  private navigation: Phaser.GameObjects.Image[] = [];
  private background!: Phaser.GameObjects.Image;
  private guide?: Phaser.GameObjects.Image;
  private audio!: AudioManager;
  private settings = readSave().settings;
  private levelId = 'w1-l1';
  private lastTick = 0;
  private returnAt = Infinity;
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
    this.navigation = [];
    this.pile = undefined;
    this.guide = undefined;
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
    this.input.dragDistanceThreshold = 8 * getRenderScale();
    this.background = this.add.image(0, 0, 'bg_world_1').setOrigin(0);
    this.subtitle = this.add
      .text(
        0,
        0,
        t(this.levelId === 'sandbox' ? 'ui_sandbox' : 'intro_count'),
        {
          fontFamily: CONFIG.fontStack,
          fontSize: 24,
          fontStyle: '700',
          color: '#174d52',
          rtl: true,
          align: 'center',
        },
      )
      .setOrigin(0.5)
      .setDepth(30);
    this.hint = this.add
      .text(0, 0, t('ui_hint'), {
        fontFamily: CONFIG.fontStack,
        fontSize: 24,
        fontStyle: '700',
        color: '#174d52',
        rtl: true,
      })
      .setOrigin(0.5)
      .setVisible(false);
    this.audio = new AudioManager(this, this.settings, (text) =>
      this.subtitle.setText(text),
    );
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
    const level = this.controller.state.level;
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
      this.audio.destroy();
      this.scale.off(Phaser.Scale.Events.RESIZE, this.relayout, this);
    });
    if (hasString(level.vo.intro)) void this.audio.play(level.vo.intro, 'vo');
    this.markReady();
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
  private drop(item: PlaceableItem, x: number, y: number): boolean {
    for (const side of ['left', 'right'] as const)
      if (this.balance.pans[side].contains(x, y)) {
        if (item.source) return this.controller.place(item.spec, side);
        // Child tokens stay on their pan; tapping is the return gesture.
        if (this.sideOf(item) === side) return true;
        this.feedback('feedback_wrong_pan');
        return false;
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
    this.balance.setDifference(
      diff(state.pans.left, state.pans.right),
      this.reducedMotion,
      this.controller.fast,
    );
    this.hint.setVisible(state.hintLevel > 0);
    if (state.hintLevel) this.hint.setText(t(`hint_count_${state.hintLevel}`));
    if (this.guide)
      this.guide.setVisible(state.pans[state.level.workPan!].length === 0);
  }
  update(time: number, delta: number): void {
    if (!this.controller) return;
    this.balance.update(delta);
    if (time >= this.returnAt) {
      this.scene.start('DevLevelListScene');
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
    const { uiScale, orientation, centerX } = getLayout(width, height);
    const portrait = orientation === 'portrait';
    const balanceScale = uiScale;
    this.balance.setSpan(portrait ? 200 : 350);
    this.background.setDisplaySize(width, height);
    this.balance
      .setPosition(
        centerX,
        height *
          (this.levelId === 'sandbox'
            ? portrait
              ? 0.46
              : 0.5
            : portrait
              ? 0.37
              : 0.44),
      )
      .setScale(balanceScale);
    this.tray.layout(width, height, uiScale, portrait);
    this.pile
      ?.setPosition(
        this.tray.items.length && !portrait ? width * 0.9 : centerX,
        height * (this.tray.items.length ? (portrait ? 0.94 : 0.88) : 0.9),
      )
      .setScale(uiScale);
    this.navigation.forEach((button, i) =>
      button
        .setDisplaySize(88 * uiScale, 88 * uiScale)
        .setPosition((70 + i * 108) * uiScale, 70 * uiScale),
    );
    this.subtitle
      .setPosition(centerX, height * 0.15)
      .setFontSize(24 * uiScale)
      .setWordWrapWidth(width * 0.88);
    this.hint.setPosition(centerX, height * 0.61).setFontSize(24 * uiScale);
    if (this.guide) {
      const side = this.controller.state.level.workPan!;
      this.guide
        .setPosition(
          centerX + (side === 'right' ? 320 : -320) * balanceScale,
          height * 0.59,
        )
        .setDisplaySize(64 * uiScale, 64 * uiScale);
    }
  }

  private celebrate(): void {
    const reduced = this.reducedMotion || this.controller.fast;
    this.balance.mascot.jump(reduced);
    if (!reduced) {
      const emitter = this.add
        .particles(this.balance.x, this.balance.y, 'particle_star', {
          speed: { min: 80, max: 200 },
          lifespan: 650,
          quantity: 20,
          scale: { start: 0.6 / getRenderScale(), end: 0 },
          emitting: false,
        })
        .setDepth(25);
      emitter.explode(20);
      this.time.delayedCall(700, () => emitter.destroy());
    }
    void this.audio.play(
      `success_${Phaser.Math.Between(1, 6)}`,
      'vo',
      'interrupt',
    );
    this.returnAt = this.time.now + (this.controller.fast ? 200 : 1700);
  }
  readEquation(): void {
    const { left, right } = this.controller.state.pans;
    const l = panWeight(left),
      r = panWeight(right);
    const relation =
      l === r
        ? 'phrase_equals'
        : l > r
          ? 'phrase_greater_than'
          : 'phrase_less_than';
    // Values above 20 are composed from individual terms; authored VO stops at 20.
    const keysFor = (side: Side, total: number): string[] =>
      total <= 20
        ? [`count_${String(total).padStart(2, '0')}`]
        : this.controller.state.pans[side].flatMap((item, i) => [
            ...(i ? ['phrase_plus'] : []),
            `count_${String(item.kind === 'frog' ? 1 : item.value).padStart(2, '0')}`,
          ]);
    const keys = [...keysFor('left', l), relation, ...keysFor('right', r)];
    this.game.events.emit('gameplay-event', {
      type: 'read',
      data: { keys, left: l, right: r },
    });
    this.audio.stopVoice();
    for (const key of keys) void this.audio.play(key, 'vo');
  }
}
