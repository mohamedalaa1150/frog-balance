import Phaser from 'phaser';
import { beamAngle } from '../core/balance';
import { getRenderScale } from '../layout/viewport';
import { Pan } from './Pan';
import { Mascot } from './Mascot';
export class Balance extends Phaser.GameObjects.Container {
  readonly pans: Record<'left' | 'right', Pan>;
  readonly mascot: Mascot;
  readonly beam: Phaser.GameObjects.Image;
  private halfSpan = 350;
  private target = 0;
  private velocity = 0;
  private changedAt = 0;
  private reduced = false;
  private fast = false;
  private motion?: Phaser.Tweens.Tween;
  private rendered = 0;
  constructor(scene: Phaser.Scene) {
    super(scene, 0, 0);
    scene.add.existing(this);
    this.setName('balance');
    this.mascot = new Mascot(scene);
    this.beam = scene.add
      .image(0, 0, 'beam')
      .setScale(1 / getRenderScale())
      .setName('beam');
    this.pans = {
      left: new Pan(scene, 'left'),
      right: new Pan(scene, 'right'),
    };
    this.add([this.mascot, this.beam, this.pans.left, this.pans.right]);
    this.positionPans();
  }
  setSpan(halfSpan: number): void {
    this.halfSpan = halfSpan;
    this.beam.setDisplaySize(halfSpan * 2 + 120, 36);
    this.positionPans();
  }
  get angleDegrees(): number {
    return this.rendered;
  }
  setDifference(d: number, reduced: boolean, fast: boolean): void {
    this.mascot.look(d);
    this.reduced = reduced;
    this.fast = fast;
    const target = beamAngle(d);
    if (target === this.target && !fast) return;
    this.motion?.stop();
    this.target = target;
    this.changedAt = this.scene.time.now;
    if (fast) {
      this.velocity = 0;
      this.rendered = target;
      this.positionPans();
    } else if (reduced) {
      this.velocity = 0;
      this.motion = this.scene.tweens.add({
        targets: this,
        rendered: target,
        duration: 200,
        onUpdate: () => this.positionPans(),
      });
    }
  }
  update(delta: number): void {
    if (
      this.reduced ||
      this.fast ||
      (this.rendered === this.target && this.velocity === 0)
    )
      return;
    const age = this.scene.time.now - this.changedAt;
    // Small substeps keep semi-implicit Euler stable on slow devices and background frames.
    let remaining = Math.min(delta / 1000, 0.05);
    while (remaining > 0) {
      const dt = Math.min(remaining, 1 / 240);
      this.velocity +=
        (120 * (this.target - this.rendered) - 14 * this.velocity) * dt;
      this.rendered += this.velocity * dt;
      remaining -= dt;
    }
    if (
      age >= 650 ||
      (Math.abs(this.target - this.rendered) < 0.01 &&
        Math.abs(this.velocity) < 0.01)
    ) {
      this.rendered = this.target;
      this.velocity = 0;
    }
    this.positionPans();
  }
  private positionPans(): void {
    const radians = Phaser.Math.DegToRad(this.rendered);
    this.beam.setAngle(this.rendered);
    this.pans.left.setPosition(
      -this.halfSpan * Math.cos(radians),
      -this.halfSpan * Math.sin(radians) - 70,
    );
    this.pans.right.setPosition(
      this.halfSpan * Math.cos(radians),
      this.halfSpan * Math.sin(radians) - 70,
    );
  }
}
