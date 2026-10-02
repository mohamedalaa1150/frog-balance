import Phaser from 'phaser';
import { CONFIG } from '../config';
import { diff, panWeight } from '../core/balance';
import { enumerateSolutions } from '../core/levelLogic';
import { formatNumber, type NumeralSystem } from '../core/numerals';
import type { LevelState, Side } from '../core/types';
import { getPanGrid } from '../layout/panGrid';
import { THEME, cssColor } from '../theme';
import type { Balance } from './Balance';
import type { NumberTray } from './NumberTray';

/** Ghosts and real items share one projected grid without changing pan weight. */
export function hintPanKinds(state: LevelState, side: Side) {
  const kinds = state.pans[side].map((item) => item.kind);
  if (
    state.hintLevel < 2 ||
    state.phase === 'success' ||
    state.level.workPan !== side ||
    !['missing', 'equation'].includes(state.level.mode)
  )
    return kinds;
  const missing = Math.max(
    0,
    side === 'right'
      ? -diff(state.pans.left, state.pans.right)
      : diff(state.pans.left, state.pans.right),
  );
  return [...kinds, ...Array<'frog'>(missing).fill('frog')];
}

export class HintOverlay extends Phaser.GameObjects.Container {
  private panAids: Phaser.GameObjects.GameObject[] = [];
  private trayAids: Phaser.GameObjects.GameObject[] = [];
  constructor(scene: Phaser.Scene) {
    super(scene, 0, 0);
    scene.add.existing(this);
    this.setName('hint-overlay').setDepth(25);
  }
  render(
    state: LevelState,
    balance: Balance,
    tray: NumberTray,
    system: NumeralSystem,
  ): void {
    this.removeAll(true);
    for (const aid of [...this.panAids, ...this.trayAids]) aid.destroy();
    this.panAids = [];
    this.trayAids = [];
    if (state.hintLevel < 2 || state.phase === 'success') return;
    const side = state.level.workPan;
    if (!side) return;
    const pan = balance.pans[side];
    if (state.level.mode === 'count') {
      for (const panSide of ['left', 'right'] as const) {
        const items = state.pans[panSide];
        const grid = getPanGrid(
          items.map((item) => item.kind),
          balance.pans[panSide].grid,
        );
        let count = 0;
        for (const [i, item] of items.entries())
          if (item.kind === 'frog') {
            const badge = this.scene.add
              .text(
                grid[i]!.x,
                grid[i]!.y - 10,
                formatNumber(++count, system),
                {
                  fontFamily: CONFIG.fontStack,
                  fontSize: 24,
                  fontStyle: '800',
                  color: cssColor(THEME.navy),
                  backgroundColor: cssColor(THEME.cream),
                  padding: { left: 4, right: 4 },
                },
              )
              .setOrigin(0.5)
              .setName(`hint-count-${panSide}-${count}`);
            balance.pans[panSide].add(badge);
            this.panAids.push(badge);
          }
      }
      const target =
        state.level.workPan === 'right'
          ? balance.pans.left
          : balance.pans.right;
      const ring = this.scene.add
        .graphics()
        .lineStyle(4, THEME.gold)
        .strokeRoundedRect(-55, -122, 110, 115, 16)
        .setName('hint-target');
      target.add(ring);
      this.panAids.push(ring);
    } else if (state.level.mode === 'bond') {
      const target = panWeight(
        state.level.fixed[side === 'left' ? 'right' : 'left'],
      );
      this.add(
        this.scene.add
          .image(0, 0, 'number_line')
          .setDisplaySize(620, 56)
          .setName('hint-number-line'),
      );
      for (let i = 0; i <= 10; i++) {
        const x = -285 + 57 * i;
        this.add(
          this.scene.add
            .text(x, 18, formatNumber(i, system), {
              fontFamily: CONFIG.fontStack,
              fontSize: 23,
              fontStyle: '800',
              color: cssColor(THEME.navy),
            })
            .setOrigin(0.5),
        );
        if (i === target)
          this.add(
            this.scene.add
              .circle(x, -14, 10, THEME.gold)
              .setName('hint-number-target'),
          );
      }
      if (state.hintLevel === 3) {
        const solution = enumerateSolutions(state.level).find(
          (solution) => !state.solutionsFound.includes(solution.canonical!),
        );
        for (const item of tray.items)
          if (solution?.items.some((spec) => spec.value === item.spec.value)) {
            const ring = this.scene.add
              .rectangle(
                0,
                0,
                item.image.displayWidth + 4,
                item.image.displayHeight + 4,
              )
              .setFillStyle(THEME.cream, 0)
              .setStrokeStyle(5, THEME.gold)
              .setName(`hint-pair-${item.spec.value}`);
            item.add(ring);
            this.trayAids.push(ring);
          }
      }
    } else {
      const missing = Math.max(
        0,
        side === 'right'
          ? -diff(state.pans.left, state.pans.right)
          : diff(state.pans.left, state.pans.right),
      );
      const kinds = hintPanKinds(state, side);
      const grid = getPanGrid(kinds, pan.grid);
      for (let i = 0; i < missing; i++) {
        const cell = grid[state.pans[side].length + i]!;
        const ghost = this.scene.add
          .image(cell.x, cell.y, 'frog_token_ghost')
          .setDisplaySize(cell.width, cell.height)
          .setName(`hint-ghost-${i + 1}`);
        pan.add(ghost);
        this.panAids.push(ghost);
        if (state.hintLevel === 3) {
          const badge = this.scene.add
            .text(cell.x, cell.y, formatNumber(i + 1, system), {
              fontFamily: CONFIG.fontStack,
              fontSize: 24,
              fontStyle: '800',
              color: cssColor(THEME.navy),
              backgroundColor: cssColor(THEME.cream),
            })
            .setOrigin(0.5)
            .setName(`hint-ghost-count-${i + 1}`);
          pan.add(badge);
          this.panAids.push(badge);
        }
      }
    }
  }
  layout(x: number, y: number, scale: number): void {
    this.setPosition(x, y).setScale(scale);
  }
  override destroy(fromScene?: boolean): void {
    for (const aid of [...this.panAids, ...this.trayAids]) aid.destroy();
    super.destroy(fromScene);
  }
}
