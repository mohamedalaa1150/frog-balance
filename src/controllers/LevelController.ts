import type Phaser from 'phaser';
import content from '../../content/levels.json';
import {
  applyAction,
  createLevelState,
  createSandboxState,
  enumerateSolutions,
} from '../core/levelLogic';
import { LevelsFile, type LevelDefinition } from '../core/levelSchema';
import type { ItemSpec, LevelAction, LevelState, Side } from '../core/types';
import { generateSibling } from '../core/generator';
import { diff } from '../core/balance';
import type { SaveV1 } from '../core/progress';
const levels = LevelsFile.parse(content).levels;
export const authoredLevels = levels;
export function getLevel(id: string): LevelDefinition {
  const level = levels.find((level) => level.id === id);
  if (!level) throw new Error(`Unknown level: ${id}`);
  return level;
}
export class LevelController {
  state: LevelState;
  private draggingItems = new Set<string>();
  private successFired = false;
  constructor(
    private scene: Phaser.Scene,
    id: string,
    settings: SaveV1['settings'],
    private render: (state: LevelState) => void,
    private feedback: (
      key: 'feedback_pan_full' | 'feedback_wrong_pan',
      side: Side,
    ) => void,
    private count: (key: string) => void,
    private success: () => void,
  ) {
    const now = Math.max(scene.time.now, scene.time.startTime);
    this.state =
      id === 'sandbox'
        ? createSandboxState(now)
        : createLevelState(getLevel(id), {
            now,
            idleHintSec: settings.idleHintSec,
          });
    this.emit('level-start', { id });
  }
  fast = false;
  private emit(type: string, data?: unknown): void {
    this.scene.game.events.emit('gameplay-event', { type, data });
  }
  dispatch(action: LevelAction): void {
    const before = this.state;
    this.state = applyAction(
      before,
      { ...action, at: this.scene.time.now },
      { settleMs: this.fast ? 0 : undefined },
    );
    if (before.pendingEvaluation && !this.state.pendingEvaluation)
      this.emit('settle', {
        levelId: this.state.levelId,
        outcome: this.state.outcome,
        phase: this.state.phase,
      });
    if (this.state.hintLevel !== before.hintLevel)
      this.emit('hint', { level: this.state.hintLevel });
    for (const tag of this.state.errors.slice(before.errors.length))
      this.emit('error', { tag });
    if (
      this.state.pans !== before.pans ||
      this.state.phase !== before.phase ||
      this.state.hintLevel !== before.hintLevel ||
      this.state.outcome !== before.outcome
    )
      this.render(this.state);
    if (this.state.phase === 'success' && !this.successFired) {
      this.successFired = true;
      this.emit('success', { levelId: this.state.levelId });
      this.scene.events.emit('level-success');
      this.success();
    }
  }
  place(item: ItemSpec, side: Side): boolean {
    const before = this.state,
      length = before.pans[side].length;
    this.dispatch({ type: 'place', item, side });
    const accepted = this.state.pans[side].length > length;
    if (accepted) {
      this.emit('place', { kind: item.kind, value: item.value, side });
      this.scene.events.emit('item-placed');
      this.countFrogs(item, side);
    } else if (this.state.errors.length > before.errors.length)
      this.feedback('feedback_pan_full', side);
    else if (
      this.state.level.mode !== 'sandbox' &&
      side !== this.state.level.workPan
    )
      this.feedback('feedback_wrong_pan', side);
    return accepted;
  }
  remove(side: Side, uid: string): boolean {
    const item = this.state.pans[side].find((item) => item.uid === uid);
    const length = this.state.pans[side].length;
    this.dispatch({ type: 'remove', side, uid });
    const accepted = this.state.pans[side].length < length;
    if (accepted) {
      this.emit('remove', { side, uid });
      this.countFrogs(item!, side);
    }
    return accepted;
  }
  move(from: Side, to: Side, uid: string): boolean {
    const item = this.state.pans[from].find(
      (item) => item.uid === uid && !item.fixed,
    );
    if (!item) return false;
    if (from === to) return true;
    const spec: ItemSpec =
      item.kind === 'frog'
        ? { kind: 'frog' }
        : { kind: 'number', value: item.value };
    // The destination reducer must accept the copy before removing its source.
    // A full or non-work pan therefore leaves the original state intact.
    if (!this.place(spec, to)) return false;
    this.remove(from, uid);
    return true;
  }
  removeLast(side: Side): boolean {
    const item = [...this.state.pans[side]].reverse().find((i) => !i.fixed);
    return item ? this.remove(side, item.uid) : false;
  }
  private countFrogs(item: ItemSpec, side: Side): void {
    if (item.kind === 'frog' && this.state.level.mode === 'count')
      this.count(
        `count_${String(this.state.pans[side].filter((i) => i.kind === 'frog').length).padStart(2, '0')}`,
      );
  }
  dragging(name: string, on: boolean): void {
    if (on) this.draggingItems.add(name);
    else this.draggingItems.delete(name);
    this.tick();
  }
  tick(): void {
    this.dispatch({ type: 'tick', dragging: this.draggingItems.size > 0 });
  }
  settle(): void {
    this.dispatch({ type: 'settle', dragging: this.draggingItems.size > 0 });
  }
  loadSibling(): void {
    if (this.state.phase !== 'revealing' || this.state.level.mode !== 'compare')
      return;
    const before = this.state;
    const sibling = generateSibling(
      this.state.level,
      before.attempts * 1009 + before.level.world * 17 + before.level.index,
    );
    this.state = {
      ...createLevelState(sibling, {
        now: this.scene.time.now,
        idleHintSec: before.idleHintSec,
      }),
      attempts: before.attempts,
      errors: before.errors,
      startedAt: before.startedAt,
      hint: before.hint,
      hintLevel: before.hintLevel,
      hintsUsed: before.hintsUsed,
    };
    this.emit('sibling', {
      levelId: before.levelId,
      gap: Math.abs(diff(sibling.fixed.left, sibling.fixed.right)),
    });
    this.render(this.state);
  }
  private isSuccessful(): boolean {
    return this.state.phase === 'success';
  }
  async solve(): Promise<void> {
    if (this.state.phase === 'success' || this.state.level.mode === 'sandbox')
      return;
    const solutions = enumerateSolutions(this.state.level);
    if (!solutions.length)
      throw new Error(`No solution: ${this.state.levelId}`);
    const completed = new Promise<void>((resolve) =>
      this.scene.events.once('level-success', resolve),
    );
    if (this.state.level.goal.type === 'predict') {
      this.dispatch({ type: 'predict', choice: solutions[0]!.prediction! });
      this.tick();
    } else {
      const side = this.state.level.workPan!;
      for (const solution of solutions) {
        if (this.isSuccessful()) break;
        if (
          solution.canonical &&
          this.state.solutionsFound.includes(solution.canonical)
        )
          continue;
        for (const item of [...this.state.pans[side]])
          if (!item.fixed) this.remove(side, item.uid);
        for (const item of solution.items) this.place(item, side);
        if (this.fast) this.tick();
        else
          await new Promise<void>((resolve) =>
            this.scene.time.delayedCall(1100, () => {
              this.tick();
              resolve();
            }),
          );
      }
    }
    await completed;
  }
}
