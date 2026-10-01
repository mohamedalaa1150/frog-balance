import Phaser from 'phaser';
import { version } from '../../package.json';
import type { ItemKind, LevelState, Side } from '../core/types';

export interface TestEvent {
  t: number;
  type: string;
  data?: unknown;
}
export interface FrogTestApi {
  ready: Promise<void>;
  version: string;
  setFastMode(on: boolean): void;
  resetSave(): void;
  unlockAll(): void;
  gotoLevel(id: string): Promise<void>;
  gotoScene(key: string): Promise<void>;
  getLevelState(): LevelState | null;
  getBeamAngle(): number;
  place(kind: ItemKind, side: Side, value?: number): boolean;
  removeLast(side: Side): boolean;
  predict(choice: Side | 'equal'): void;
  requestHint(): void;
  getHintLevel(): number;
  solveCurrent(): Promise<void>;
  events: TestEvent[];
  toCssPoint(x: number, y: number): { x: number; y: number };
  getPointerTarget(name: string): { x: number; y: number } | null;
}

declare global {
  interface Window {
    __FROG__?: FrogTestApi;
  }
}

function notImplemented(): never {
  throw new Error('not implemented in phase 0');
}

/** Convert game coordinates to viewport CSS coordinates, including safe-area offsets. */
export function toCssPoint(game: Phaser.Game, x: number, y: number) {
  const bounds = game.canvas.getBoundingClientRect();
  return {
    x: bounds.left + (x * bounds.width) / game.scale.gameSize.width,
    y: bounds.top + (y * bounds.height) / game.scale.gameSize.height,
  };
}

export function installTestApi(game: Phaser.Game): void {
  if (
    !import.meta.env.DEV &&
    new URLSearchParams(window.location.search).get('test') !== '1'
  )
    return;

  const events: TestEvent[] = [];
  const record = (type: string, data?: unknown) => {
    if (events.length === 2000) events.shift();
    events.push({ t: Date.now(), type, data });
  };
  const ready = new Promise<void>((resolve) => {
    game.events.once('title-ready', (data: unknown) => {
      record('ready', data);
      resolve();
    });
  });
  game.events.on('title-ready', (data: unknown) => record('title-ready', data));

  window.__FROG__ = {
    ready,
    version,
    events,
    toCssPoint: (x, y) => toCssPoint(game, x, y),
    async gotoScene(key) {
      await ready;
      const target = game.scene.getScene(key);
      if (!target) throw new Error(`Unknown scene: ${key}`);
      // Boot/Preload immediately transition, so always wait for the rendered title.
      await new Promise<void>((resolve) => {
        game.events.once('title-ready', resolve);
        record('gotoScene', { key });
        game.scene.getScene('TitleScene').scene.start(key);
      });
    },
    setFastMode: notImplemented,
    resetSave: notImplemented,
    unlockAll: notImplemented,
    gotoLevel: notImplemented,
    getLevelState: notImplemented,
    getBeamAngle: notImplemented,
    place: notImplemented,
    removeLast: notImplemented,
    predict: notImplemented,
    requestHint: notImplemented,
    getHintLevel: notImplemented,
    solveCurrent: notImplemented,
    getPointerTarget: notImplemented,
  };
}
