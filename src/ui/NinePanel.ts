import Phaser from 'phaser';

/**
 * Generated game-style panels (wooden sign, parchment board, speech bubble)
 * drawn as nine-slice so they stretch to any text without distorting their
 * decorated corners. Works in the Canvas renderer: each slice is an Image
 * using a sub-frame of the panel texture.
 */
export type PanelKey = 'panel_banner' | 'panel_board' | 'panel_bubble';

/** Insets in source pixels: [left, top, right, bottom]. */
const INSETS: Record<PanelKey, readonly [number, number, number, number]> = {
  // The banner keeps its full height; only the plank between caps stretches.
  panel_banner: [250, 0, 70, 0],
  panel_board: [96, 96, 96, 96],
  panel_bubble: [150, 110, 110, 150],
};

const SLICES = [0, 1, 2] as const;

export class NinePanel extends Phaser.GameObjects.Container {
  private parts: Phaser.GameObjects.Image[] = [];
  private readonly sourceWidth: number;
  private readonly sourceHeight: number;

  constructor(
    scene: Phaser.Scene,
    private readonly key: PanelKey,
  ) {
    super(scene, 0, 0);
    scene.add.existing(this);
    const texture = scene.textures.get(key);
    const source = texture.getSourceImage();
    this.sourceWidth = source.width;
    this.sourceHeight = source.height;
    const [l, t, r, b] = this.insets();
    const xs = [0, l, this.sourceWidth - r, this.sourceWidth];
    const ys = [0, t, this.sourceHeight - b, this.sourceHeight];
    for (const row of SLICES)
      for (const column of SLICES) {
        const name = `slice-${column}-${row}`;
        const w = xs[column + 1]! - xs[column]!;
        const h = ys[row + 1]! - ys[row]!;
        if (w <= 0 || h <= 0) continue;
        if (!texture.has(name))
          texture.add(name, 0, xs[column]!, ys[row]!, w, h);
        const part = scene.add
          .image(0, 0, key, name)
          .setOrigin(0)
          .setData('cell', [column, row]);
        this.parts.push(part);
      }
    this.add(this.parts);
  }

  private insets(): readonly [number, number, number, number] {
    // Missing texture (placeholder art): a plain stretch.
    const insets = INSETS[this.key];
    if (this.sourceWidth <= insets[0] + insets[2]) return [0, 0, 0, 0];
    return insets;
  }

  /**
   * Resize to `width`×`height` (centred on the container's position).
   * `corner` scales the decorated corners; banners derive it from height.
   */
  resize(width: number, height: number, corner?: number): this {
    const [l, t, r, b] = this.insets();
    const k =
      corner ??
      (this.key === 'panel_banner'
        ? height / this.sourceHeight
        : Math.min(1, height / (t + b + 1), width / (l + r + 1)));
    const kx = Math.min(k, width / Math.max(1, l + r));
    const ky =
      this.key === 'panel_banner'
        ? height / this.sourceHeight
        : Math.min(k, height / Math.max(1, t + b));
    const columns = [l * kx, width - (l + r) * kx, r * kx];
    const rows =
      this.key === 'panel_banner'
        ? [0, height, 0]
        : [t * ky, height - (t + b) * ky, b * ky];
    const left = -width / 2,
      top = -height / 2;
    for (const part of this.parts) {
      const [column, row] = part.getData('cell') as [number, number];
      const x = left + columns.slice(0, column).reduce((a, v) => a + v, 0);
      const y = top + rows.slice(0, row).reduce((a, v) => a + v, 0);
      part
        .setPosition(x, y)
        .setDisplaySize(Math.max(0, columns[column]!), Math.max(0, rows[row]!));
      part.setVisible(columns[column]! > 0.5 && rows[row]! > 0.5);
    }
    this.setSize(width, height);
    return this;
  }

  /** Fit behind a text object with padding (in display px). */
  fitText(text: Phaser.GameObjects.Text, padX: number, padY: number): this {
    if (!text.visible || !text.text) return this.setVisible(false);
    const bounds = text.getBounds();
    const height = bounds.height + padY * 2;
    // Banner caps are asymmetric (lotus on the left): widen by the difference
    // so the text sits centred on the plain plank.
    const [l, , r] = this.insets();
    const extraLeft =
      this.key === 'panel_banner' ? ((l - r) * height) / this.sourceHeight : 0;
    const width = bounds.width + padX * 2 + extraLeft;
    return this.setVisible(true)
      .setPosition(bounds.centerX - extraLeft / 2, bounds.centerY)
      .resize(width, height);
  }
}
