import Phaser from 'phaser';
import { sizedTexture } from './sizedTexture';
import type { PlacedItem, Side } from '../core/types';
import type { NumeralSystem } from '../core/numerals';
import { PAN_ANCHORS } from '../assets';
import { getRenderScale } from '../layout/viewport';
import { PlaceableItem, type ItemInteractions } from './PlaceableItem';
import { getPanGrid, PLACEMENT_HOP } from '../layout/panGrid';
export class Pan extends Phaser.GameObjects.Container {
  private glow: Phaser.GameObjects.Image;
  private surface: Phaser.GameObjects.Image;
  private items = new Map<string, PlaceableItem>();
  private pool = new Map<string, PlaceableItem[]>();

  private cssScale = Infinity;
  workActive = false;
  setPresentation(scale: number): void {
    this.cssScale = scale / getRenderScale();
    this.surface.setDisplaySize(260, 220);
    this.setSize(260, 64);
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
    this.surface = scene.add
      .image(0, 0, 'pan')
      .setOrigin(0.5, PAN_ANCHORS.rimY / PAN_ANCHORS.height)
      .setDisplaySize(PAN_ANCHORS.width, PAN_ANCHORS.height);
    this.add([this.glow, this.surface]);
    this.setSize(260, 64);
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
  ): void {
    for (const [uid, item] of this.items)
      if (!items.some((i) => i.uid === uid)) {
        this.remove(item);
        item.setActive(false).setVisible(false).disableInteractive();
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
    const grid = getPanGrid(
      items.map((item) => item.kind),
      this.cssScale,
      this.scene.scale.width >= this.scene.scale.height,
    );
    const contentWidth = Math.max(
      260,
      ...grid.map(
        (c) => 2 * (Math.abs(c.x) + c.width / 2) + 24 / this.cssScale,
      ),
    );
    const scale = this.cssScale * getRenderScale();
    if (Number.isFinite(scale)) {
      sizedTexture(this.surface, 'pan', contentWidth, 220, scale);
      sizedTexture(this.glow, 'pan_glow', 320, 120, scale);
    } else this.surface.setDisplaySize(contentWidth, 220);
    this.setSize(contentWidth, 64);
    if (this.input)
      (this.input.hitArea as Phaser.Geom.Rectangle).setTo(
        0,
        0,
        contentWidth,
        64,
      );
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
