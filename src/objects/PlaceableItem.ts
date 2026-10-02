import { THEME, cssColor, tileColor } from '../theme';
import Phaser from 'phaser';
import { sizedTexture } from './sizedTexture';
import { CONFIG } from '../config';
import { formatNumber, type NumeralSystem } from '../core/numerals';
import type { ItemSpec } from '../core/types';
import { getRenderScale } from '../layout/viewport';
export interface ReturnTarget {
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
}
export interface ItemInteractions {
  tap(item: PlaceableItem): void;
  drop(item: PlaceableItem, x: number, y: number): boolean | ReturnTarget;
  dragging(item: PlaceableItem, on: boolean): void;
  feedback(key: 'feedback_locked'): void;
  fast(): boolean;
  reduced(): boolean;
}
/** Native Phaser dragging supports mouse, touch and pen through the same path. */
export class PlaceableItem extends Phaser.GameObjects.Container {
  private dragged = false;
  private itemWidth = 0;
  private itemHeight = 0;
  private pressedPointerId?: number;
  private lifted?: Phaser.GameObjects.Container;
  private shadow?: Phaser.GameObjects.Ellipse;
  private cachedLift?: Phaser.GameObjects.Container;
  private cachedShadow?: Phaser.GameObjects.Ellipse;
  private disposed = false;
  private recycleLift(lift: Phaser.GameObjects.Container): void {
    if (this.disposed || this.cachedLift) lift.destroy();
    else {
      this.cachedLift = lift.setActive(false).setVisible(false).setName('');
    }
  }
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
        .text(0, -7, formatNumber(spec.value!, system), {
          fontFamily: CONFIG.fontStack,
          fontSize: 64 * r,
          fontStyle: '800',
          color: cssColor(tileColor(spec.value!)),
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
      spec.kind === 'frog' ? 70 : 150,
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
      const liftedHeight = fromPile ? 70 : this.image.displayHeight;
      this.shadow =
        this.cachedShadow ??
        scene.add.ellipse(0, 0, 1, 1, THEME.shadow, 0.2).setDepth(19);
      this.cachedShadow = undefined;
      this.shadow
        .setActive(true)
        .setVisible(true)
        .setPosition(world.tx, world.ty + 20 * this.scaleY)
        .setSize(
          liftedWidth * Math.hypot(world.a, world.b),
          liftedHeight * Math.hypot(world.c, world.d) * 0.25,
        );
      this.lifted = this.cachedLift ?? scene.add.container(0, 0).setDepth(20);
      this.cachedLift = undefined;
      this.lifted
        .setActive(true)
        .setVisible(true)
        .setName('')
        .setPosition(world.tx, world.ty)
        .setScale(
          Math.hypot(world.a, world.b) *
            (interactions.reduced() || interactions.fast() ? 1 : 1.1),
          Math.hypot(world.c, world.d) *
            (interactions.reduced() || interactions.fast() ? 1 : 0.95),
        );
      let image = this.lifted.list[0] as Phaser.GameObjects.Image | undefined;
      if (!image) {
        image = scene.add.image(0, 0, 'frog_token');
        this.lifted.add(image);
      }
      // Use the authored source key, so pooled previews do not chain resamples.
      const key =
        spec.kind === 'frog' ? 'frog_token' : `num_tile_${spec.value}`;
      sizedTexture(
        image,
        key,
        liftedWidth,
        liftedHeight,
        Math.hypot(world.a, world.b),
      );
      if (this.digit && this.lifted.list.length === 1)
        this.lifted.add(
          scene.add
            .text(0, 0, this.digit.text, {
              fontFamily: CONFIG.fontStack,
              fontSize: this.digit.style.fontSize,
              fontStyle: '800',
              color: cssColor(tileColor(spec.value!)),
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
      const world = this.getWorldTransformMatrix();
      const original: ReturnTarget = {
        x: world.tx,
        y: world.ty,
        scaleX: Math.hypot(world.a, world.b),
        scaleY: Math.hypot(world.c, world.d),
      };
      // A reducer removal releases the pan item. Detach the lifted copy first,
      // so it can still fly to its source after the state has changed.
      const lift = this.lifted;
      this.lifted = undefined;
      this.cachedShadow = this.shadow?.setVisible(false).setActive(false);
      this.shadow = undefined;
      const nameBeforeDrop = this.name;
      const accepted = interactions.drop(this, pointer.worldX, pointer.worldY);
      interactions.dragging(this, false);
      this.setAlpha(1);
      if (!lift) return;
      if (accepted === true || interactions.fast() || interactions.reduced())
        this.recycleLift(lift);
      else {
        const destination = accepted || original;
        lift.setName(`return-${nameBeforeDrop}`);
        scene.game.events.emit('gameplay-event', {
          type: accepted ? 'return-to-source' : 'bounce',
          data: { name: nameBeforeDrop },
        });
        scene.tweens.add({
          targets: lift,
          ...destination,
          duration: 200,
          ease: 'Sine.easeOut',
          onComplete: () => this.recycleLift(lift),
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
      this.disposed = true;
      this.cachedLift?.destroy();
      this.cachedShadow?.destroy();
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
    if (w === this.itemWidth && h === this.itemHeight) return;
    this.itemWidth = w;
    this.itemHeight = h;
    this.image.setDisplaySize(w, h);
    this.setSize(Math.max(64, w), Math.max(64, h));
    const badgeSize = Math.min(28, w * 0.5, h * 0.5);
    this.badge
      ?.setPosition((w - badgeSize) / 2, (h - badgeSize) / 2)
      .setDisplaySize(badgeSize, badgeSize);
    if (this.input)
      (this.input.hitArea as Phaser.Geom.Rectangle).setTo(
        0,
        0,
        this.width,
        this.height,
      );
    this.digit?.setY((-7 * h) / 150);
    this.digit?.setFontSize(Math.min(w, h) * 0.58 * getRenderScale());
  }
  expandHitArea(minimum: number): void {
    if (!this.input) return;
    const w = Math.max(this.width, minimum),
      h = Math.max(this.height, minimum);
    (this.input.hitArea as Phaser.Geom.Rectangle).setTo(
      (this.width - w) / 2,
      (this.height - h) / 2,
      w,
      h,
    );
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
