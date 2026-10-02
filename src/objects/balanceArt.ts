import type Phaser from 'phaser';

const owned = new WeakMap<Phaser.Scene, Set<string>>();
/** Slice the delivered vector art at layout time. The shaft stretches while
 * rings/pivot keep their readable size, and dishes size independently of ropes. */
export function balanceArt(
  image: Phaser.GameObjects.Image,
  kind: 'beam' | 'dish',
  width: number,
  height: number,
  scale: number,
): void {
  const scene = image.scene;
  const key = `balance-art-${scene.scene.key}-${kind}-${width}-${height}-${scale}`;
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
    canvas.width = Math.ceil(width * scale);
    canvas.height = Math.ceil(height * scale);
    const ctx = canvas.getContext('2d')!;
    ctx.scale(scale, scale);
    const source = scene.textures
      .get(kind === 'beam' ? 'beam' : 'pan')
      .getSourceImage();
    const r = source.width / (kind === 'beam' ? 840 : 260);
    const draw = (
      sx: number,
      sy: number,
      sw: number,
      sh: number,
      x: number,
      y: number,
      w: number,
      h: number,
    ) =>
      ctx.drawImage(
        source as CanvasImageSource,
        sx * r,
        sy * r,
        sw * r,
        sh * r,
        x,
        y,
        w,
        h,
      );
    if (kind === 'beam') {
      draw(60, 0, 300, 70, 20, 0, width - 40, height);
      draw(0, 0, 48, 70, 0, 0, 40, height);
      draw(792, 0, 48, 70, width - 40, 0, 40, height);
      draw(385, 0, 70, 70, width / 2 - 28, 0, 56, height);
    } else draw(0, 156, 260, 64, 0, 0, width, height);
    scene.textures.addCanvas(key, canvas);
    keys.add(key);
  }
  image.setTexture(key).setDisplaySize(width, height);
}
