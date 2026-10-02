import Phaser from 'phaser';
import { THEME } from '../theme';
export class Slider extends Phaser.GameObjects.Container {
  private track: Phaser.GameObjects.Graphics;
  constructor(
    scene: Phaser.Scene,
    name: string,
    private value: number,
    changed: (value: number) => void,
  ) {
    super(scene, 0, 0);
    scene.add.existing(this);
    this.setName(name).setSize(320, 64);
    this.track = scene.add.graphics();
    this.add(this.track);
    this.paint();
    this.setInteractive(
      new Phaser.Geom.Rectangle(0, 0, 320, 64),
      Phaser.Geom.Rectangle.Contains,
    );
    scene.input.setDraggable(this);
    const set = (pointer: Phaser.Input.Pointer) => {
      const p = this.getWorldTransformMatrix().applyInverse(
        pointer.worldX,
        pointer.worldY,
      );
      this.value = Math.max(0, Math.min(1, (p.x + 150) / 300));
      this.paint();
      changed(Math.round(this.value * 100) / 100);
    };
    this.on('pointerdown', set);
    this.on('drag', set);
  }
  private paint() {
    this.track
      .clear()
      .lineStyle(12, THEME.navy)
      .lineBetween(-150, 0, 150, 0)
      .fillStyle(THEME.gold)
      .fillCircle(-150 + this.value * 300, 0, 22);
  }
}
