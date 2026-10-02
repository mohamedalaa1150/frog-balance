import Phaser from 'phaser';
import { version } from '../../package.json';
import type { ItemKind, LevelState, Side } from '../core/types';
import type { SceneReadyEvent } from '../scenes/BaseScene';
import { GameScene } from '../scenes/GameScene';
import { getCountLevel } from '../controllers/LevelController';
import { defaults } from '../core/progress';
import { resetSave, writeSave } from '../services/storage';
import { TestReadyScene, TestSilentScene } from './scenes';

const FORWARDS: Readonly<Record<string, string>> = {
  BootScene: 'PreloadScene',
  PreloadScene: 'TitleScene',
};

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

  if (new URLSearchParams(window.location.search).get('test') === '1') {
    game.scene.add('TestReadyScene', TestReadyScene);
    game.scene.add('TestSilentScene', TestSilentScene);
  }

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
  game.events.on('font-fallback', (data: unknown) =>
    record('font-fallback', data),
  );

  async function navigate(
    key: string,
    data: Record<string, unknown> = {},
  ): Promise<void> {
    const target = game.scene.getScene(key);
    if (!target) throw new Error(`Unknown scene: ${key}`);
    const allowed = new Set([key]);
    for (let next = FORWARDS[key]; next; next = FORWARDS[next])
      allowed.add(next);
    await new Promise<void>((resolve, reject) => {
      let started = false;
      let settled = false;
      const finish = (error?: Error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        game.events.off('scene-ready', onReady);
        if (error) reject(error);
        else resolve();
      };
      const onReady = (data: SceneReadyEvent) => {
        if (started && allowed.has(data.key)) finish();
      };
      const timer = setTimeout(
        () =>
          finish(new Error(`Scene readiness timed out after 10000 ms: ${key}`)),
        10_000,
      );
      game.events.on('scene-ready', onReady);
      void ready
        .then(() => {
          if (settled) return;
          started = true;
          record('gotoScene', { key });
          for (const scene of game.scene.getScenes(true))
            game.scene.stop(scene.scene.key);
          game.scene.start(key, data);
        })
        .catch((error: unknown) =>
          finish(error instanceof Error ? error : new Error(String(error))),
        );
    });
  }
  let lastGame: GameScene | undefined;
  game.events.on('scene-ready', (data: SceneReadyEvent) => {
    const scene = game.scene.getScene(data.key);
    if (scene instanceof GameScene) lastGame = scene;
  });
  game.events.on('gameplay-event', (event: { type: string; data?: unknown }) =>
    record(event.type, event.data),
  );
  const activeGame = (): GameScene | undefined =>
    game.scene.getScenes(true).find((scene) => scene instanceof GameScene) as
      GameScene | undefined;
  const pointerTarget = (name: string): { x: number; y: number } | null => {
    const search = (
      objects: Phaser.GameObjects.GameObject[],
    ): { x: number; y: number } | null => {
      for (const object of objects) {
        if (
          object.name === name &&
          object.getData('pointer-ready') !== false &&
          'getWorldTransformMatrix' in object
        ) {
          const matrix = (
            object as Phaser.GameObjects.Container
          ).getWorldTransformMatrix();
          return toCssPoint(game, matrix.tx, matrix.ty);
        }
        if (object instanceof Phaser.GameObjects.Container) {
          const found = search(object.list);
          if (found) return found;
        }
      }
      return null;
    };
    for (const scene of game.scene.getScenes(true)) {
      const found = search(scene.children.list);
      if (found) return found;
    }
    return null;
  };
  window.__FROG__ = {
    ready,
    version,
    events,
    toCssPoint: (x, y) => toCssPoint(game, x, y),
    gotoScene: (key) => navigate(key),
    setFastMode(on) {
      game.registry.set('fast-mode', on);
      activeGame()?.setFastMode(on);
    },
    resetSave,
    unlockAll() {
      const save = defaults();
      for (let world = 1; world <= 6; world++)
        for (let index = 1; index <= 8; index++)
          save.levels[`w${world}-l${index}`] = {
            bestStars: 3,
            plays: 1,
            totalAttempts: 0,
            totalHints: 0,
            errors: {},
            lastPlayed: 0,
          };
      writeSave(save);
    },
    async gotoLevel(id) {
      getCountLevel(id);
      await navigate('GameScene', { levelId: id });
    },
    getLevelState: () => {
      const state = (activeGame() ?? lastGame)?.controller.state;
      return state ? structuredClone(state) : null;
    },
    getBeamAngle: () => (activeGame() ?? lastGame)?.balance.angleDegrees ?? 0,
    place: (kind, side, value) =>
      activeGame()?.controller.place(
        kind === 'frog' ? { kind } : { kind, value },
        side,
      ) ?? false,
    removeLast: (side) => activeGame()?.controller.removeLast(side) ?? false,
    predict: (choice) =>
      activeGame()?.controller.dispatch({ type: 'predict', choice }),
    requestHint: () =>
      activeGame()?.controller.dispatch({ type: 'requestHint' }),
    getHintLevel: () => activeGame()?.controller.state.hintLevel ?? 0,
    async solveCurrent() {
      await activeGame()?.controller.solve();
    },
    getPointerTarget: pointerTarget,
  };
  game.events.on('scene-ready', (data: SceneReadyEvent) =>
    record('scene-ready', data),
  );
}
