import Phaser from 'phaser';
import { drawTextPill } from '../ui/textPill';
import { CONFIG } from '../config';
import { panWeight } from '../core/balance';
import { formatNumber, type NumeralSystem } from '../core/numerals';
import type { LevelState, Side } from '../core/types';
import { THEME, cssColor } from '../theme';
import type { Balance } from './Balance';

/** Each expression is anchored over its own on-screen pan, independently of RTL. */
export class EquationBar {
  readonly terms: Record<Side, Phaser.GameObjects.Text>;
  private pills: Phaser.GameObjects.Graphics[];
  private scale = 1;
  readonly relation: Phaser.GameObjects.Text;
  constructor(private scene: Phaser.Scene) {
    const text = (name: string) =>
      scene.add
        .text(0, 0, '', {
          fontFamily: CONFIG.fontStack,
          fontSize: 40,
          fontStyle: '800',
          color: cssColor(THEME.navy),
          rtl: false,
          align: 'center',
        })
        .setOrigin(0.5)
        .setDepth(30)
        .setName(name);
    this.terms = { left: text('equation-left'), right: text('equation-right') };
    this.relation = text('equation-equals');
    this.pills = Array.from({ length: 3 }, () =>
      scene.add.graphics().setDepth(29),
    );
  }
  render(state: LevelState, system: NumeralSystem, reduced: boolean): void {
    const compare = state.level.mode === 'compare';
    const visible = state.level.showEquation || compare;
    const number = (n: number) => formatNumber(n, system);
    for (const side of ['left', 'right'] as const) {
      let terms: string[];
      if (compare) terms = [number(panWeight(state.pans[side]))];
      else if (
        state.level.mode === 'bond' &&
        side === state.level.workPan &&
        state.phase === 'success'
      )
        terms = state.solutionsFound
          .at(-1)!
          .split('+')
          .map((term) => number(Number(term)));
      else {
        terms = state.level.fixed[side].map((item) =>
          number(item.kind === 'frog' ? 1 : item.value!),
        );
        if (side === state.level.workPan)
          terms.push(
            state.phase === 'success'
              ? number(
                  panWeight(state.pans[side].filter((item) => !item.fixed)),
                )
              : '\u061f',
          );
      }
      const text = this.terms[side];
      const next = terms.reverse().join(' + ');
      if (next !== text.text && state.phase === 'success' && !reduced)
        this.scene.tweens.add({
          targets: text,
          alpha: 0.4,
          duration: 120,
          yoyo: true,
        });
      text.setText(next).setVisible(visible);
    }
    const left = panWeight(state.pans.left),
      right = panWeight(state.pans.right);
    this.relation
      .setText(
        compare
          ? state.prediction
            ? left > right
              ? '>'
              : left < right
                ? '<'
                : '='
            : '\u061f'
          : '=',
      )
      .setVisible(visible);
    this.drawPills();
  }
  layout(balance: Balance, y: number, scale: number): void {
    this.scale = scale;
    const halfSpan = balance.span * balance.scaleX;
    this.terms.left
      .setPosition(balance.x - halfSpan, y)
      .setFontSize(36 * scale);
    this.terms.right
      .setPosition(balance.x + halfSpan, y)
      .setFontSize(36 * scale);
    this.relation.setPosition(balance.x, y).setFontSize(46 * scale);
    this.drawPills();
  }
  private drawPills(): void {
    [this.terms.left, this.relation, this.terms.right].forEach((text, i) =>
      drawTextPill(this.pills[i]!, text, this.scale),
    );
  }
}
