import Phaser from 'phaser';
import type { NumeralSystem } from '../core/numerals';
import { PlaceableItem, type ItemInteractions } from './PlaceableItem';
import type { getGameplayLayout } from '../layout/gameplayLayout';
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
    tray: ReturnType<typeof getGameplayLayout>['tray'],
    scale: number,
  ): void {
    this.items.forEach((item, i) => {
      item.setItemSize(tray.itemWidth / scale, tray.itemHeight / scale);
      item.setScale(scale);
      const point = tray.positions[i]!;
      item.setPosition(point.x, point.y);
    });
  }
}
