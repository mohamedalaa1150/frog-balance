import type Phaser from 'phaser';
/** Select the authored orientation, preserving its aspect ratio while covering. */
export function coverBackground(
  image: Phaser.GameObjects.Image,
  width: number,
  height: number,
  world: number,
): void {
  image
    .setTexture(`bg_world_${world}${height > width ? '_p' : ''}`)
    .setOrigin(0.5)
    .setPosition(width / 2, height / 2);
  const source = image.texture.getSourceImage(),
    scale = Math.max(width / source.width, height / source.height);
  image.setDisplaySize(source.width * scale, source.height * scale);
  presentBackground(image);
}

/** Static scenery belongs on the canvas compositor layer, avoiding a full-size
 * resample on every frame while the beam and tokens move. */
export function presentBackground(image: Phaser.GameObjects.Image): void {
  const source = image.texture.getSourceImage();
  if (source instanceof HTMLImageElement) {
    image.scene.game.canvas.style.backgroundImage = `url("${new URL(`assets/img/${image.texture.key}.webp`, document.baseURI).href}")`;
    image.scene.game.canvas.style.backgroundSize = 'cover';
    image.scene.game.canvas.style.backgroundPosition = 'center';
    image.setVisible(false);
  }
}
