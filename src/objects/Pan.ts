import Phaser from 'phaser';
import { sizedTexture } from './sizedTexture';
import type { PlacedItem, Side, ItemKind } from '../core/types';
import type { NumeralSystem } from '../core/numerals';
import { balanceArt } from './balanceArt';
import { THEME } from '../theme';
import { getRenderScale } from '../layout/viewport';
import { PlaceableItem, type ItemInteractions } from './PlaceableItem';
import {
  getPanGrid,
  panHangLength,
  PLACEMENT_HOP,
  type PanGridLayout,
} from '../layout/panGrid';
export class Pan extends Phaser.GameObjects.Container {
  private glow: Phaser.GameObjects.Image;
  private surface: Phaser.GameObjects.Image;
  private items = new Map<string, PlaceableItem>();
  private pool = new Map<string, PlaceableItem[]>();

  private cssScale = 1;
  grid: PanGridLayout = {
    portrait: false,
    width: 272,
    frogWidth: 48,
    tileWidth: 64,
  };
  private cells: ReturnType<typeof getPanGrid> = [];
  private strings: Phaser.GameObjects.Image[] = [];
  private suspension = 0;
  workActive = false;
  setPresentation(scale: number, grid: PanGridLayout, bottom: number): void {
    this.cssScale = scale / getRenderScale();
    this.grid = grid;
    this.suspension = 0;
    balanceArt(this.surface, 'dish', grid.width, bottom + 8, scale);
    this.surface.setOrigin(0.5, 8 / (bottom + 8));
    sizedTexture(
      this.glow,
      'pan_glow',
      grid.width + 8,
      Math.min(32, bottom * 2),
      scale,
    );
    this.setSize(grid.width, 64);
    if (this.input)
      (this.input.hitArea as Phaser.Geom.Rectangle).setTo(0, 0, grid.width, 64);
  }
  /** Long enough for the actual grid to clear the tilted shaft and end ring.
   * Strings are three pooled images; no texture allocations in the spring loop. */
  hangLength(radians: number): number {
    const length = panHangLength(this.cells, this.side, radians);
    if (Math.abs(length - this.suspension) > 0.01) {
      this.suspension = length;
      for (let i = 0; i < this.strings.length; i++) {
        const string = this.strings[i]!;
        const dx = (i - 1) * this.grid.width * 0.42;
        string
          .setPosition(0, -length)
          .setDisplaySize(2, Math.hypot(dx, length))
          .setRotation(-Math.atan2(dx, length));
      }
    }
    return length;
  }
  constructor(
    scene: Phaser.Scene,
    readonly side: Side,
  ) {
    super(scene, 0, 0);
    scene.add.existing(this);
    this.setName(`pan-${side}`);
    this.once('destroy', () => {
      for (const items of this.pool.values())
        for (const item of items) item.destroy();
      this.pool.clear();
    });
    const r = getRenderScale();
    this.glow = scene.add.image(0, 0, 'pan_glow').setScale(1 / r);
    this.surface = scene.add.image(0, 0, 'pan').setName(`dish-${side}`);
    if (!scene.textures.exists('pan-string')) {
      const canvas = document.createElement('canvas');
      canvas.width = 64;
      canvas.height = 64;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = `#${THEME.navy.toString(16).padStart(6, '0')}`;
      ctx.fillRect(0, 0, 64, 64);
      scene.textures.addCanvas('pan-string', canvas);
    }
    this.strings = Array.from({ length: 3 }, (_, i) =>
      scene.add
        .image(0, 0, 'pan-string')
        .setOrigin(0.5, 0)
        .setName(`pan-string-${side}-${i}`),
    );
    this.add([this.glow, ...this.strings, this.surface]);
    this.setSize(272, 64);
    this.setInteractive(
      new Phaser.Geom.Rectangle(0, 0, 260, 64),
      Phaser.Geom.Rectangle.Contains,
    );
  }
  setWorkActive(active: boolean): void {
    this.workActive = active;
    this.glow.setVisible(active);
  }
  contains(x: number, y: number): boolean {
    const p = this.getWorldTransformMatrix().applyInverse(x, y);
    return (
      Math.abs(p.x) <= this.width * 0.75 && Math.abs(p.y) <= this.height * 0.75
    );
  }
  render(
    items: readonly PlacedItem[],
    system: NumeralSystem,
    interactions: ItemInteractions,
    presentation: readonly ItemKind[] = items.map((item) => item.kind),
  ): void {
    for (const [uid, item] of this.items)
      if (!items.some((i) => i.uid === uid)) {
        this.scene.tweens.killTweensOf(item);
        this.remove(item);
        item
          .setName('')
          .setActive(false)
          .setVisible(false)
          .disableInteractive();
        const key = `${item.spec.kind}-${item.spec.value ?? 0}-${item.fixed}`;
        const bucket = this.pool.get(key) ?? [];
        // Each pan retains at most 20 released tokens; both pools total 40.
        const pooled = [...this.pool.values()].reduce(
          (n, entries) => n + entries.length,
          0,
        );
        if (pooled < 20) bucket.push(item);
        else item.destroy();
        this.pool.set(key, bucket);
        this.items.delete(uid);
      }
    const grid = getPanGrid(presentation, this.grid);
    this.cells = grid;
    const scale = this.cssScale * getRenderScale();
    for (const [index, placed] of items.entries()) {
      let item = this.items.get(placed.uid);
      const entering = !item && !placed.fixed;
      if (!item) {
        const key = `${placed.kind}-${placed.value ?? 0}-${placed.fixed}`;
        item = this.pool.get(key)?.pop();
        if (item) {
          item
            .setName(`item-${this.side}-${placed.uid}`)
            .setActive(true)
            .setVisible(true)
            .setAlpha(1);
          if (item.input) item.input.enabled = true;
        } else
          item = new PlaceableItem(
            this.scene,
            placed,
            `item-${this.side}-${placed.uid}`,
            system,
            placed.fixed,
            false,
            interactions,
          );
        this.add(item);
        this.items.set(placed.uid, item);
      }
      const cell = grid[index]!;
      // A resize/repack invalidates a hop's old grid coordinates. Released
      // pooled tokens must not retain a tween from their previous placement.
      this.scene.tweens.killTweensOf(item);
      item.setItemSize(cell.width, cell.height);
      if (Number.isFinite(scale))
        sizedTexture(
          item.image,
          placed.kind === 'frog' ? 'frog_token' : `num_tile_${placed.value}`,
          cell.width,
          cell.height,
          scale,
        );
      item.expandHitArea(56 / this.cssScale);
      item.setPosition(cell.x, cell.y);
      if (entering && !interactions.fast() && !interactions.reduced())
        this.scene.tweens.add({
          targets: item,
          y: item.y - PLACEMENT_HOP,
          duration: 90,
          yoyo: true,
          ease: 'Sine.easeOut',
        });
    }
  }
  reject(reduced: boolean): void {
    if (reduced) return;
    this.scene.tweens.add({
      targets: this.surface,
      x: 6,
      duration: 45,
      yoyo: true,
      repeat: 2,
    });
  }
}
