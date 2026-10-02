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
import type { SaveV1 } from '../core/progress';
const levels = LevelsFile.parse(content).levels;
export const countLevels = levels.filter((level) => level.mode === 'count');
export function getCountLevel(id: string): LevelDefinition {
  const level = countLevels.find((level) => level.id === id);
  if (!level) throw new Error(`Unknown Phase 2 count level: ${id}`);
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
        : createLevelState(getCountLevel(id), {
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
    if (this.state.errors.length !== before.errors.length)
      this.emit('error', { tag: this.state.errors.at(-1) });
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
  async solve(): Promise<void> {
    if (this.state.phase === 'success' || this.state.level.mode === 'sandbox')
      return;
    const solution = enumerateSolutions(this.state.level)[0];
    if (!solution) throw new Error(`No solution: ${this.state.levelId}`);
    const completed = new Promise<void>((resolve) =>
      this.scene.events.once('level-success', resolve),
    );
    const side = this.state.level.workPan!;
    for (const item of [...this.state.pans[side]])
      if (!item.fixed) this.remove(side, item.uid);
    for (const item of solution.items) this.place(item, side);
    this.tick();
    await completed;
  }
}
