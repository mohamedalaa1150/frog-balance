import Phaser from 'phaser';
import { BEAM_ANCHORS } from '../assets';
import { balanceArt } from './balanceArt';
import { getRenderScale } from '../layout/viewport';
import { beamAngle } from '../core/balance';
import { CONFIG } from '../config';
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
  private creaked = 0;
  private levelPending = false;
  constructor(scene: Phaser.Scene) {
    super(scene, 0, 0);
    scene.add.existing(this);
    this.setName('balance');
    this.mascot = new Mascot(scene);
    this.beam = scene.add
      .image(0, 0, 'beam')
      .setDisplaySize(BEAM_ANCHORS.width, BEAM_ANCHORS.height)
      .setName('beam');
    this.pans = {
      left: new Pan(scene, 'left'),
      right: new Pan(scene, 'right'),
    };
    this.add([this.mascot, this.beam, this.pans.left, this.pans.right]);
    this.positionPans();
    const resumed = (elapsed: number) => {
      this.changedAt += elapsed;
    };
    scene.events.on('visibility-resume', resumed);
    this.once('destroy', () => scene.events.off('visibility-resume', resumed));
  }
  setSpan(halfSpan: number): void {
    this.halfSpan = halfSpan;
    balanceArt(this.beam, 'beam', halfSpan * 2 + 40, 56, getRenderScale());
    this.positionPans();
  }
  get span(): number {
    return this.halfSpan;
  }
  get angleDegrees(): number {
    return this.rendered;
  }
  setDifference(d: number, reduced: boolean, fast: boolean): void {
    const target = beamAngle(d);
    if (
      target === this.target &&
      reduced === this.reduced &&
      fast === this.fast
    )
      return;
    this.mascot.look(d);
    this.mascot.breathe(reduced || fast);
    this.reduced = reduced;
    this.fast = fast;
    this.motion?.stop();
    this.levelPending = this.target !== 0 && target === 0;
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
      // A full reversal can otherwise overshoot by almost three degrees.
      // Keep the spring inside the same travel envelope reserved by layout.
      const limit = CONFIG.beam.maxAngle + CONFIG.beam.overshootAllowance;
      if (Math.abs(this.rendered) > limit) {
        this.rendered = Math.sign(this.rendered) * limit;
        this.velocity = 0;
      }
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
  positionPans(): void {
    if (Math.abs(this.rendered - this.creaked) > 2) {
      this.creaked = this.rendered;
      this.scene.events.emit('beam-creak');
    }
    if (this.levelPending && this.rendered === 0 && this.velocity === 0) {
      this.levelPending = false;
      this.scene.events.emit('beam-level');
    }
    const radians = Phaser.Math.DegToRad(this.rendered);
    this.beam.setAngle(this.rendered);
    this.pans.left.setPosition(
      -this.halfSpan * Math.cos(radians),
      -this.halfSpan * Math.sin(radians) + this.pans.left.hangLength(radians),
    );
    this.pans.right.setPosition(
      this.halfSpan * Math.cos(radians),
      this.halfSpan * Math.sin(radians) + this.pans.right.hangLength(radians),
    );
  }
}
