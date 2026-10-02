import type Phaser from 'phaser';
type Renderable = Phaser.GameObjects.GameObject & {
  renderCanvas: (...args: never[]) => void;
  renderWebGL: (...args: never[]) => void;
};
const skipDraw = (): void => {};
/** Cache static visuals while retaining the original objects for hit testing,
 * names, bounds and drag handlers. Rebuild only when layout or hints change. */
export class CachedLayer {
  private texture: Phaser.GameObjects.RenderTexture;
  private originals = new Map<
    Renderable,
    Pick<Renderable, 'renderCanvas' | 'renderWebGL'>
  >();
  constructor(
    scene: Phaser.Scene,
    objects: Phaser.GameObjects.GameObject[],
    x: number,
    y: number,
    width: number,
    height: number,
    depth = 1,
  ) {
    this.texture = scene.add
      .renderTexture(x, y, Math.ceil(width), Math.ceil(height))
      .setOrigin(0)
      .setDepth(depth);
    this.texture.camera.setScroll(x, y);
    for (const object of objects) {
      const entry = object as Renderable;
      this.originals.set(entry, {
        renderCanvas: entry.renderCanvas,
        renderWebGL: entry.renderWebGL,
      });
    }
    this.refresh();
  }
  refresh(): void {
    for (const [object, render] of this.originals)
      Object.assign(object, render);
    this.texture.clear().draw([...this.originals.keys()]);
    for (const object of this.originals.keys()) {
      object.renderCanvas = skipDraw;
      object.renderWebGL = skipDraw;
    }
  }
  destroy(): void {
    for (const [object, render] of this.originals)
      Object.assign(object, render);
    this.originals.clear();
    this.texture.destroy();
  }
}
