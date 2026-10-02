import type Phaser from 'phaser';
import { THEME } from '../theme';
/** A quiet cream backing keeps navy glyphs readable even over the night sky. */
export function drawTextPill(
  graphics: Phaser.GameObjects.Graphics,
  text: Phaser.GameObjects.Text,
  scale: number,
): void {
  graphics.clear();
  if (!text.visible || !text.text) return;
  const bounds = text.getBounds(),
    pad = 12 * scale;
  graphics
    .fillStyle(THEME.sky, 0.85)
    .fillRoundedRect(
      bounds.x - pad,
      bounds.y - 4 * scale,
      bounds.width + pad * 2,
      bounds.height + 8 * scale,
      18 * scale,
    );
}
