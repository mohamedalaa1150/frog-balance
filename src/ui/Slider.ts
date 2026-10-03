import Phaser from 'phaser';
import { THEME } from '../theme';
export class Slider extends Phaser.GameObjects.Container {
  private track: Phaser.GameObjects.Graphics;
  private knob: Phaser.GameObjects.Image;
  constructor(
    scene: Phaser.Scene,
    name: string,
    private value: number,
    changed: (value: number) => void,
  ) {
    super(scene, 0, 0);
    scene.add.existing(this);
    this.setName(name).setSize(320, 112);
    this.track = scene.add.graphics();
    // Generated star as the thumb, matching the result-screen stars.
    this.knob = scene.add.image(0, 0, 'star_full').setDisplaySize(64, 64);
    this.add([scene.add.zone(0, 0, 320, 112), this.track, this.knob]);
    this.paint();
    this.setInteractive(
      new Phaser.Geom.Rectangle(0, 0, 320, 112),
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
    const x = -150 + this.value * 300;
    this.track
      .clear()
      .fillStyle(0x6b3f17, 1)
      .fillRoundedRect(-160, -13, 320, 26, 13)
      .fillStyle(0xe9d7ae, 1)
      .fillRoundedRect(-156, -9, 312, 18, 9)
      .fillStyle(THEME.green, 1)
      .fillRoundedRect(-156, -9, Math.max(18, x + 156), 18, 9);
    this.knob.setPosition(x, 0);
  }
}
