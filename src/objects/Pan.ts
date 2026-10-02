import Phaser from 'phaser';
import type { PlacedItem, Side } from '../core/types';
import type { NumeralSystem } from '../core/numerals';
import { getRenderScale } from '../layout/viewport';
import { PlaceableItem, type ItemInteractions } from './PlaceableItem';
export class Pan extends Phaser.GameObjects.Container {
  private glow: Phaser.GameObjects.Image;
  private surface: Phaser.GameObjects.Image;
  private items = new Map<string, PlaceableItem>();
  private post: Phaser.GameObjects.Image;
  workActive = false;
  constructor(
    scene: Phaser.Scene,
    readonly side: Side,
  ) {
    super(scene, 0, 0);
    scene.add.existing(this);
    this.setName(`pan-${side}`);
    const r = getRenderScale();
    this.glow = scene.add.image(0, 0, 'pan_glow').setScale(1 / r);
    this.post = scene.add.image(0, 35, 'pan_post').setScale(1 / r);
    this.surface = scene.add.image(0, 0, 'pan').setScale(1 / r);
    this.add([this.post, this.glow, this.surface]);
    this.setSize(240, 56);
    this.setInteractive(
      new Phaser.Geom.Rectangle(0, -4, 240, 64),
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
        item.destroy();
        this.items.delete(uid);
      }
    const numbers = items.filter((i) => i.kind === 'number');
    const frogs = items.filter((i) => i.kind === 'frog');
    for (const placed of items) {
      let item = this.items.get(placed.uid);
      if (!item) {
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
      if (numbers.length && frogs.length) {
        const index = items.indexOf(placed);
        item.setItemSize(64, placed.kind === 'number' ? 80 : 64);
        item.setPosition(
          ((index % 4) - (Math.min(4, items.length) - 1) / 2) * 64,
          -50 - Math.floor(index / 4) * 88,
        );
      } else if (placed.kind === 'number') {
        const index = numbers.indexOf(placed),
          w = numbers.length === 3 ? 72 : 88;
        item.setItemSize(w, 96);
        item.setPosition((index - (numbers.length - 1) / 2) * w, -65);
      } else {
        const index = frogs.indexOf(placed),
          columns = numbers.length ? 3 : 5,
          size = numbers.length ? 64 : 64;
        item.setItemSize(size, size);
        item.setPosition(
          ((index % columns) - (Math.min(columns, frogs.length) - 1) / 2) *
            size,
          -54 - Math.floor(index / columns) * size - (numbers.length ? 100 : 0),
        );
      }
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
