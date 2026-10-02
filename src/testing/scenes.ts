import { THEME } from '../theme';
import Phaser from 'phaser';
import { BaseScene } from '../scenes/BaseScene';

// Regression fixtures: registered only when ?test=1, never during normal play.
export class TestReadyScene extends BaseScene {
  constructor() {
    super('TestReadyScene');
  }
  create(): void {
    this.add
      .graphics()
      .fillStyle(THEME.navy)
      .fillRect(0, 0, this.scale.width, this.scale.height);
  }
}

// Deliberately omits BaseScene/readiness to exercise the navigation timeout.
export class TestSilentScene extends Phaser.Scene {
  constructor() {
    super('TestSilentScene');
  }
}
