import Phaser from 'phaser';
import { getRenderScale } from '../layout/viewport';
export class Mascot extends Phaser.GameObjects.Sprite {
  constructor(scene: Phaser.Scene) {
    super(scene, 0, 120, 'mascot_sheet', 0);
    scene.add.existing(this);
    this.setName('mascot').setScale(0.8 / getRenderScale());
  }
  private breathing?: Phaser.Tweens.Tween;
  breathe(reduced: boolean): void {
    if (reduced) {
      this.breathing?.stop();
      this.breathing = undefined;
      this.setScale(0.8 / getRenderScale());
    } else if (!this.breathing)
      this.breathing = this.scene.tweens.add({
        targets: this,
        scaleX: 0.816 / getRenderScale(),
        scaleY: 0.816 / getRenderScale(),
        duration: 2000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
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
