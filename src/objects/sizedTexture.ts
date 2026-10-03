import type Phaser from 'phaser';
const owned = new WeakMap<Phaser.Scene, Set<string>>();
/** Resample once at layout time; Canvas then draws the moving sprite at 1:1
 * physical resolution instead of filtering its full-size source every frame. */
export function sizedTexture(
  image: Phaser.GameObjects.Image | Phaser.GameObjects.Sprite,
  sourceKey: string,
  width: number,
  height: number,
  parentScale: number,
): void {
  const scene = image.scene;
  const w = Math.max(1, Math.ceil(width * parentScale));
  const h = Math.max(1, Math.ceil(height * parentScale));
  const key = `sized-${scene.scene.key}-${sourceKey}-${w}-${h}`;
  let keys = owned.get(scene);
  if (!keys) {
    keys = new Set();
    owned.set(scene, keys);
    scene.events.once('shutdown', () => {
      for (const key of keys!) scene.textures.remove(key);
      owned.delete(scene);
    });
  }
  if (!scene.textures.exists(key)) {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const context = canvas.getContext('2d')!;
    context.imageSmoothingQuality = 'high';
    context.drawImage(
      scene.textures.get(sourceKey).getSourceImage() as CanvasImageSource,
      0,
      0,
      w,
      h,
    );
    scene.textures.addCanvas(key, canvas);
    keys.add(key);
  }
  image.setTexture(key).setDisplaySize(width, height);
}
