import Phaser from 'phaser';
import { getRenderScale } from '../layout/viewport';
export class Mascot extends Phaser.GameObjects.Sprite {
  constructor(scene: Phaser.Scene) {
    super(scene, 0, 85, 'mascot_sheet', 0);
    scene.add.existing(this);
    this.setName('mascot').setScale(0.5 / getRenderScale());
  }
  look(difference: number): void {
    this.setFrame(difference === 0 ? 5 : difference < 0 ? 1 : 2);
  }
  jump(reduced: boolean): void {
    this.setFrame(6);
    if (!reduced)
      this.scene.tweens.add({
        targets: this,
        y: this.y - 45,
        duration: 180,
        yoyo: true,
        repeat: 1,
        ease: 'Sine.easeOut',
        onComplete: () => this.setFrame(7),
      });
  }
}
