import Phaser from 'phaser';
import { version } from '../../package.json';
import { audioSnapshot } from '../services/audio';
import type { ItemKind, LevelState, Side } from '../core/types';
import type { SceneReadyEvent } from '../scenes/BaseScene';
import { GameScene } from '../scenes/GameScene';
import { getLevel } from '../controllers/LevelController';
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
  getAudioState(): ReturnType<typeof audioSnapshot>;
  isInFrontOf(name: string, other: string): boolean;
  getActualFps(): number;
  getSceneBounds(): Array<{
    name: string;
    x: number;
    y: number;
    width: number;
    height: number;
    interactive: boolean;
  }>;
  getBeamGeometry(): {
    shaft: Array<{ x: number; y: number }>;
    rings: Array<{ x: number; y: number; width: number; height: number }>;
  };
  setFastMode(on: boolean): void;
  setResultNavigation(enabled: boolean): void;
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
  getTextureHash(key: string): string | null;
  getTextureKey(name: string): string | null;
  getHitAreaSize(name: string): { width: number; height: number } | null;
  getText(name: string): string | null;
  isVisible(name: string): boolean;
  getBounds(
    name: string,
  ): { x: number; y: number; width: number; height: number } | null;
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
          // Queue after any pending automatic result transition, so stale starts
          // cannot shut down the newly requested level before its first render.
          for (const scene of game.scene.getScenes(false)) scene.scene.stop();
          target.scene.start(key, data);
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
  const namedObject = (name: string): Phaser.GameObjects.GameObject | null => {
    const search = (
      objects: Phaser.GameObjects.GameObject[],
    ): Phaser.GameObjects.GameObject | null => {
      for (const object of objects) {
        if (
          object.name === name &&
          object.getData('pointer-ready') !== false &&
          'getWorldTransformMatrix' in object
        ) {
          return object;
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
  const pointerTarget = (name: string): { x: number; y: number } | null => {
    // Pans are drop zones: their transform is available while the spring moves,
    // and token hit areas do not affect the drop target.
    const pan =
      name === 'pan-left'
        ? activeGame()?.balance.pans.left
        : name === 'pan-right'
          ? activeGame()?.balance.pans.right
          : undefined;
    const object =
      pan ?? (namedObject(name) as Phaser.GameObjects.Container | null);
    if (!object) return null;
    const matrix = object.getWorldTransformMatrix();
    return toCssPoint(game, matrix.tx, matrix.ty);
  };
  window.__FROG__ = {
    ready,
    version,
    getBeamGeometry() {
      const balance = activeGame()!.balance;
      const matrix = balance.getWorldTransformMatrix();
      const radians = (balance.angleDegrees * Math.PI) / 180;
      const point = (x: number, y: number) => {
        const p = matrix.transformPoint(
          x * Math.cos(radians) - y * Math.sin(radians),
          x * Math.sin(radians) + y * Math.cos(radians),
        );
        return toCssPoint(game, p.x, p.y);
      };
      const span = balance.span;
      return {
        shaft: [
          point(-span, -13),
          point(span, -13),
          point(span, 13),
          point(-span, 13),
        ],
        rings: [-span, span].map((x) => {
          const center = point(x, 0),
            edge = toCssPoint(
              game,
              matrix.tx + 20 * balance.scaleX,
              matrix.ty + 20 * balance.scaleY,
            );
          const origin = toCssPoint(game, matrix.tx, matrix.ty);
          const width = (edge.x - origin.x) * 2,
            height = (edge.y - origin.y) * 2;
          return {
            x: center.x - width / 2,
            y: center.y - height / 2,
            width,
            height,
          };
        }),
      };
    },
    isInFrontOf(name, other) {
      const path = (name: string): number[] => {
        const object = namedObject(name);
        if (!object) return [];
        const indexes: number[] = [];
        let node = object;
        while (node.parentContainer) {
          indexes.unshift(node.parentContainer.getIndex(node));
          node = node.parentContainer;
        }
        indexes.unshift(node.scene.children.getIndex(node));
        return indexes;
      };
      const a = path(name),
        b = path(other);
      if (!a.length || !b.length) return false;
      const different = a.findIndex((n, i) => n !== b[i]);
      return different >= 0 && a[different]! > b[different]!;
    },
    getAudioState: () => audioSnapshot(game),
    getActualFps: () => game.loop.actualFps,
    setResultNavigation: (enabled) =>
      game.registry.set('hold-result-navigation', !enabled),
    getSceneBounds() {
      const result: Array<{
        name: string;
        x: number;
        y: number;
        width: number;
        height: number;
        interactive: boolean;
      }> = [];
      const visit = (objects: Phaser.GameObjects.GameObject[]) => {
        for (const raw of objects) {
          const o = raw as Phaser.GameObjects.Container;
          if (!o.visible || !o.active) continue;
          if (o.name && typeof o.getBounds === 'function') {
            const b = o.getBounds(),
              top = toCssPoint(game, b.x, b.y),
              bottom = toCssPoint(game, b.right, b.bottom);
            result.push({
              name: o.name,
              ...top,
              width: bottom.x - top.x,
              height: bottom.y - top.y,
              interactive: !!o.input?.enabled,
            });
          }
          if (o instanceof Phaser.GameObjects.Container && !o.input?.enabled)
            visit(o.list);
        }
      };
      for (const scene of game.scene.getScenes(true))
        visit(scene.children.list);
      return result;
    },
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
      getLevel(id);
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
    getBounds(name) {
      const object = namedObject(
        name === 'mascot-head' ? 'mascot' : name,
      ) as Phaser.GameObjects.Container | null;
      if (!object || !('getBounds' in object)) return null;
      const bounds = object.getBounds();
      const top = toCssPoint(game, bounds.x, bounds.y);
      const bottom = toCssPoint(game, bounds.right, bounds.bottom);
      return {
        ...top,
        width: bottom.x - top.x,
        height: (bottom.y - top.y) * (name === 'mascot-head' ? 0.35 : 1),
      };
    },
    getText(name) {
      const object = namedObject(name);
      return object instanceof Phaser.GameObjects.Text ? object.text : null;
    },
    isVisible(name) {
      const object = namedObject(name);
      return !!object && 'visible' in object && object.visible === true;
    },
    getHitAreaSize(name) {
      const object = namedObject(name) as Phaser.GameObjects.Container | null;
      if (
        !object?.input ||
        !(object.input.hitArea instanceof Phaser.Geom.Rectangle)
      )
        return null;
      const matrix = object.getWorldTransformMatrix(),
        area = object.input.hitArea;
      const top = toCssPoint(game, 0, 0),
        bottom = toCssPoint(
          game,
          area.width * Math.hypot(matrix.a, matrix.b),
          area.height * Math.hypot(matrix.c, matrix.d),
        );
      return { width: bottom.x - top.x, height: bottom.y - top.y };
    },
    getTextureKey(name) {
      const object = namedObject(name);
      return object instanceof Phaser.GameObjects.Image
        ? object.texture.key
        : null;
    },
    getTextureHash(key) {
      if (!game.textures.exists(key)) return null;
      const source = game.textures.get(key).getSourceImage();
      const canvas = document.createElement('canvas');
      canvas.width = source.width;
      canvas.height = source.height;
      canvas.getContext('2d')!.drawImage(source as CanvasImageSource, 0, 0);
      const pixels = canvas
        .getContext('2d')!
        .getImageData(0, 0, source.width, source.height).data;
      let hash = 2166136261;
      for (const byte of pixels) hash = Math.imul(hash ^ byte, 16777619) >>> 0;
      return hash.toString(16).padStart(8, '0');
    },
  };
  game.events.on('scene-ready', (data: SceneReadyEvent) =>
    record('scene-ready', data),
  );
}
