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
}
