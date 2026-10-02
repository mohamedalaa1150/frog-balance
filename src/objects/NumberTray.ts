import Phaser from 'phaser';
import type { NumeralSystem } from '../core/numerals';
import { PlaceableItem, type ItemInteractions } from './PlaceableItem';
export class NumberTray {
  readonly items: PlaceableItem[];
  constructor(
    scene: Phaser.Scene,
    numbers: readonly number[],
    system: NumeralSystem,
    interactions: ItemInteractions,
  ) {
    this.items = numbers.map(
      (value) =>
        new PlaceableItem(
          scene,
          { kind: 'number', value },
          `tray-num-${value}`,
          system,
          false,
          true,
          interactions,
        ),
    );
  }
  layout(
    width: number,
    height: number,
    scale: number,
    portrait: boolean,
  ): void {
    const columns = portrait ? 5 : 10;
    this.items.forEach((item, i) => {
      item.setItemSize(portrait ? 88 : 72, portrait ? 110 : 96);
      item.setScale(scale);
      item.setPosition(
        width * (portrait ? 0.5 : 0.4) +
          ((i % columns) - (Math.min(columns, this.items.length) - 1) / 2) *
            (portrait ? 110 : 88) *
            scale,
        height * (portrait ? 0.71 : 0.86) +
          Math.floor(i / columns) * 130 * scale,
      );
    });
  }
}
