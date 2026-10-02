import Phaser from 'phaser';
import { sizedTexture } from './sizedTexture';
import { MASCOT_ANCHORS } from '../assets';
/** Delivered expression images share the fist/pivot anchor, at design resolution. */
export class Mascot extends Phaser.GameObjects.Sprite {
  private breathing?: Phaser.Tweens.Tween;
  private celebrating = false;
  private presentation = 1;
  private expression = 'mascot_idle';
  setPresentation(scale: number): void {
    this.presentation = scale;
    this.paint();
  }
  private paint(): void {
    sizedTexture(
      this,
      this.expression,
      MASCOT_ANCHORS.width,
      MASCOT_ANCHORS.height,
      this.presentation,
    );
  }
  constructor(scene: Phaser.Scene) {
    super(scene, 0, 0, 'mascot_idle');
    scene.add.existing(this);
    this.setName('mascot')
      .setOrigin(0.5, MASCOT_ANCHORS.pivotY / MASCOT_ANCHORS.height)
      .setDisplaySize(MASCOT_ANCHORS.width, MASCOT_ANCHORS.height);
  }
  breathe(reduced: boolean): void {
    if (reduced || this.celebrating) {
      this.breathing?.stop();
      this.breathing = undefined;
      this.setDisplaySize(MASCOT_ANCHORS.width, MASCOT_ANCHORS.height);
    } else if (!this.breathing)
      this.breathing = this.scene.tweens.add({
        targets: this,
        scaleY: this.scaleY * 1.02,
        duration: 2000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
  }
  look(difference: number): void {
    if (this.celebrating) return;
    const side = difference < 0 ? 'left' : 'right';
    this.expression =
      difference === 0
        ? 'mascot_idle'
        : `mascot_${Math.abs(difference) >= 3 ? 'strain' : 'look'}_${side}`;
    this.paint();
  }
  jump(reduced: boolean): void {
    this.celebrating = true;
    this.breathe(true);
    this.expression = 'mascot_happy';
    this.paint();
    const finish = () => {
      this.celebrating = false;
    };
    if (reduced) finish();
    else
      this.scene.tweens.add({
        targets: this,
        y: this.y - 35,
        duration: 180,
        yoyo: true,
        repeat: 1,
        ease: 'Sine.easeOut',
        onComplete: finish,
      });
  }
}
