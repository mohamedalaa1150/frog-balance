import type Phaser from 'phaser';
import { THEME } from '../theme';
/** A parchment chip backing keeps navy glyphs readable even over the night sky. */
export function drawTextPill(
  graphics: Phaser.GameObjects.Graphics,
  text: Phaser.GameObjects.Text,
  scale: number,
): void {
  graphics.clear();
  if (!text.visible || !text.text) return;
  const bounds = text.getBounds(),
    pad = 12 * scale;
  const x = bounds.x - pad,
    y = bounds.y - 4 * scale,
    w = bounds.width + pad * 2,
    h = bounds.height + 8 * scale,
    r = Math.min(18 * scale, h / 2);
  // Parchment chip with a wooden rim, matching the generated panel kit.
  graphics
    .fillStyle(0x7a4a1f, 0.35)
    .fillRoundedRect(x, y + 4 * scale, w, h, r)
    .fillStyle(THEME.cream, 0.96)
    .fillRoundedRect(x, y, w, h, r)
    .lineStyle(Math.max(2, 4 * scale), 0x9a6a33, 1)
    .strokeRoundedRect(x, y, w, h, r);
}
