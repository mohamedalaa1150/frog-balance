import Phaser from 'phaser';
import type { NumeralSystem } from '../core/numerals';
import { getRenderScale } from '../layout/viewport';
import { PlaceableItem, type ItemInteractions } from './PlaceableItem';
export class FrogPile extends PlaceableItem {
  constructor(
    scene: Phaser.Scene,
    system: NumeralSystem,
    interactions: ItemInteractions,
  ) {
    super(
      scene,
      { kind: 'frog' },
      'frog-pile',
      system,
      false,
      true,
      interactions,
    );
    this.image.setTexture('frog_pile').setScale(1 / getRenderScale());
    this.setItemSize(240, 140);
  }
}
