import Phaser from 'phaser';
import { CONFIG } from '../config';
import { formatNumber, type NumeralSystem } from '../core/numerals';
import type { ItemSpec } from '../core/types';
import { getRenderScale } from '../layout/viewport';
export interface ItemInteractions {
  tap(item: PlaceableItem): void;
  drop(item: PlaceableItem, x: number, y: number): boolean;
  dragging(item: PlaceableItem, on: boolean): void;
  feedback(key: 'feedback_locked'): void;
  fast(): boolean;
  reduced(): boolean;
}
/** Native Phaser dragging supports mouse, touch and pen through the same path. */
export class PlaceableItem extends Phaser.GameObjects.Container {
  private dragged = false;
  private pressedPointerId?: number;
  private lifted?: Phaser.GameObjects.Container;
  private shadow?: Phaser.GameObjects.Ellipse;
  readonly image: Phaser.GameObjects.Image;
  readonly digit?: Phaser.GameObjects.Text;
  private badge?: Phaser.GameObjects.Image;
  constructor(
    scene: Phaser.Scene,
    readonly spec: ItemSpec,
    name: string,
    system: NumeralSystem,
    readonly fixed: boolean,
    readonly source: boolean,
    private interactions: ItemInteractions,
  ) {
    super(scene, 0, 0);
    scene.add.existing(this);
    this.setName(name);
    const r = getRenderScale();
    this.image = scene.add
      .image(
        0,
        0,
        spec.kind === 'frog' ? 'frog_token' : `num_tile_${spec.value}`,
      )
      .setScale(1 / r);
    this.add(this.image);
    if (spec.kind === 'number') {
      this.digit = scene.add
        .text(0, 0, formatNumber(spec.value!, system), {
          fontFamily: CONFIG.fontStack,
          fontSize: 64 * r,
          fontStyle: '800',
          color: '#fff6e5',
        })
        .setOrigin(0.5)
        .setScale(1 / r);
      this.add(this.digit);
    }
    if (fixed) {
      this.badge = scene.add.image(0, 0, 'lock_badge').setScale(1 / r);
      this.add(this.badge);
    }
    this.setItemSize(
      spec.kind === 'frog' ? 64 : 120,
      spec.kind === 'frog' ? 64 : 150,
    );
    this.setInteractive(
      new Phaser.Geom.Rectangle(0, 0, this.width, this.height),
      Phaser.Geom.Rectangle.Contains,
    );
    scene.input.setDraggable(this);
    this.setData('pointer-ready', false);
    const rendered = () => this.setData('pointer-ready', true);
    scene.game.events.once(Phaser.Core.Events.POST_RENDER, rendered);
    this.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.pressedPointerId = pointer.id;
      this.dragged = false;
      if (this.fixed) this.lockFeedback();
    });
    this.on('dragstart', (pointer: Phaser.Input.Pointer) => {
      if (this.fixed) return;
      this.dragged = true;
      interactions.dragging(this, true);
      const world = this.getWorldTransformMatrix();
      const fromPile = source && spec.kind === 'frog';
      const liftedWidth = fromPile ? 64 : this.image.displayWidth;
      const liftedHeight = fromPile ? 64 : this.image.displayHeight;
      this.shadow = scene.add
        .ellipse(
          world.tx,
          world.ty + 20 * this.scaleY,
          liftedWidth * Math.hypot(world.a, world.b),
          liftedHeight * Math.hypot(world.c, world.d) * 0.25,
          0x174d52,
          0.2,
        )
        .setDepth(19);
      this.lifted = scene.add
        .container(world.tx, world.ty)
        .setDepth(20)
        .setScale(
          Math.hypot(world.a, world.b) * 1.12,
          Math.hypot(world.c, world.d) * 1.12,
        );
      this.lifted.add(
        scene.add
          .image(0, 0, fromPile ? 'frog_token' : this.image.texture.key)
          .setDisplaySize(liftedWidth, liftedHeight),
      );
      if (this.digit)
        this.lifted.add(
          scene.add
            .text(0, 0, this.digit.text, {
              fontFamily: CONFIG.fontStack,
              fontSize: this.digit.style.fontSize,
              fontStyle: '800',
              color: '#fff6e5',
            })
            .setOrigin(0.5)
            .setScale(1 / r),
        );
      if (!source) this.setAlpha(0.3);
      this.moveLift(pointer);
    });
    this.on('drag', (pointer: Phaser.Input.Pointer) => this.moveLift(pointer));
    this.on('dragend', (pointer: Phaser.Input.Pointer) => {
      if (this.fixed) return;
      const accepted = interactions.drop(this, pointer.worldX, pointer.worldY);
      interactions.dragging(this, false);
      this.setAlpha(1);
      this.shadow?.destroy();
      this.shadow = undefined;
      const lift = this.lifted;
      this.lifted = undefined;
      if (!lift) return;
      if (accepted || interactions.fast() || interactions.reduced())
        lift.destroy();
      else {
        const world = this.getWorldTransformMatrix();
        scene.game.events.emit('gameplay-event', {
          type: 'bounce',
          data: { name: this.name },
        });
        scene.tweens.add({
          targets: lift,
          x: world.tx,
          y: world.ty,
          scaleX: Math.hypot(world.a, world.b),
          scaleY: Math.hypot(world.c, world.d),
          duration: 200,
          ease: 'Sine.easeOut',
          onComplete: () => lift.destroy(),
        });
      }
    });
    // Keep the pressed token even if the spring carries it away from the finger.
    const pointerUp = (pointer: Phaser.Input.Pointer) => {
      if (pointer.id !== this.pressedPointerId) return;
      this.pressedPointerId = undefined;
      if (!this.dragged && !this.fixed) interactions.tap(this);
    };
    const pointerUpOutside = (pointer: Phaser.Input.Pointer) => {
      if (pointer.id === this.pressedPointerId)
        this.pressedPointerId = undefined;
    };
    scene.input.on('pointerup', pointerUp);
    scene.input.on('pointerupoutside', pointerUpOutside);
    this.once('destroy', () => {
      scene.game.events.off(Phaser.Core.Events.POST_RENDER, rendered);
      scene.input.off('pointerup', pointerUp);
      scene.input.off('pointerupoutside', pointerUpOutside);
      this.lifted?.destroy();
      this.shadow?.destroy();
    });
  }
  private moveLift(pointer: Phaser.Input.Pointer): void {
    this.lifted?.setPosition(pointer.worldX, pointer.worldY);
    this.shadow?.setPosition(
      pointer.worldX,
      pointer.worldY + (20 * (this.lifted?.scaleY ?? this.scaleY)) / 1.12,
    );
  }
  setItemSize(w: number, h: number): void {
    this.image.setDisplaySize(w, h);
    this.setSize(Math.max(64, w), Math.max(64, h));
    this.badge?.setPosition(w * 0.35, h * 0.35).setDisplaySize(28, 28);
    if (this.input)
      (this.input.hitArea as Phaser.Geom.Rectangle).setTo(
        0,
        0,
        this.width,
        this.height,
      );
    this.digit?.setFontSize(Math.min(w, h) * 0.58 * getRenderScale());
  }
  private lockFeedback(): void {
    this.interactions.feedback('feedback_locked');
    if (this.interactions.reduced() || this.interactions.fast()) return;
    this.scene.tweens.add({
      targets: this,
      x: this.x + 6,
      duration: 45,
      yoyo: true,
      repeat: 2,
    });
  }
}
