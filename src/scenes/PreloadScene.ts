import { initializeTileColors, THEME, cssColor } from '../theme';
import { RASTER_KEYS, VECTOR_KEYS } from '../assets';
import { getRenderScale } from '../layout/viewport';
import { generatePlaceholderArt } from '../placeholder/placeholderArt';
import { BaseScene } from './BaseScene';
import manifest from '../../public/assets/audio/vo/manifest.json';
import { SFX_KEYS } from '../services/audio';

export class PreloadScene extends BaseScene {
  constructor() {
    super('PreloadScene');
  }

  preload(): void {
    this.load.json('map-meta', 'assets/img/map_meta.json');
    this.load.json('tile-colors', 'assets/svg/tile_colors.json');
    if (!this.textures.exists('bg_title'))
      this.load.image('bg_title', 'assets/img/bg_world_1.webp');
    if (!this.textures.exists('mascot_base'))
      this.load.image('mascot_base', 'assets/img/mascot_idle.webp');
    for (const key of RASTER_KEYS)
      if (!this.textures.exists(key))
        this.load.image(key, `assets/img/${key}.webp`);
    for (const key of VECTOR_KEYS)
      if (!this.textures.exists(key))
        this.load.svg(key, `assets/svg/${key}.svg`, {
          scale: getRenderScale(),
        });
    for (const { key } of manifest.lines)
      this.load.audio(key, `assets/audio/vo/${key}.mp3`);
    for (const key of SFX_KEYS)
      this.load.audio(key, `assets/audio/sfx/${key}.mp3`);
  }

  create(): void {
    // SVG filters otherwise rerasterize on every scaled Canvas draw. Bake each
    // delivered vector once, keeping its key and render-scale dimensions.
    for (const key of VECTOR_KEYS) {
      if (!this.textures.exists(key)) continue;
      const source = this.textures.get(key).getSourceImage();
      const canvas = document.createElement('canvas');
      canvas.width = source.width;
      canvas.height = source.height;
      canvas.getContext('2d')!.drawImage(source as CanvasImageSource, 0, 0);
      this.textures.remove(key);
      this.textures.addCanvas(key, canvas);
    }
    // Canvas has no tint pipeline. Bake a desaturated locked island once.
    for (let world = 1; world <= 6; world++) {
      const key = `island_${world}_locked`;
      if (this.textures.exists(key)) continue;
      const source = this.textures.get(`island_${world}`).getSourceImage();
      const canvas = document.createElement('canvas');
      canvas.width = source.width;
      canvas.height = source.height;
      const context = canvas.getContext('2d', { willReadFrequently: true })!;
      context.drawImage(source as CanvasImageSource, 0, 0);
      const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
      for (let i = 0; i < pixels.data.length; i += 4) {
        const grey =
          (pixels.data[i]! * 0.2126 +
            pixels.data[i + 1]! * 0.7152 +
            pixels.data[i + 2]! * 0.0722) *
          (154 / 255);
        pixels.data[i] = pixels.data[i + 1] = pixels.data[i + 2] = grey;
      }
      context.putImageData(pixels, 0, 0);
      this.textures.addCanvas(key, canvas);
    }
    if (!this.textures.exists('world-current-glow')) {
      const canvas = document.createElement('canvas');
      canvas.width = 280;
      canvas.height = 220;
      const context = canvas.getContext('2d', { willReadFrequently: true })!;
      const glow = context.createRadialGradient(140, 110, 25, 140, 110, 140);
      glow.addColorStop(0, `${cssColor(THEME.gold)}a6`);
      glow.addColorStop(1, `${cssColor(THEME.gold)}00`);
      context.fillStyle = glow;
      context.fillRect(0, 0, 280, 220);
      this.textures.addCanvas('world-current-glow', canvas);
    }
    initializeTileColors(this.cache.json.get('tile-colors'));
    const missing = [...RASTER_KEYS, ...VECTOR_KEYS].filter(
      (key) => !this.textures.exists(key),
    );
    generatePlaceholderArt(this);
    if (import.meta.env.DEV)
      for (const key of missing)
        console.warn(`Art asset unavailable, using placeholder: ${key}`);
    this.game.events.emit('gameplay-event', {
      type: 'asset-pack',
      data: { raster: RASTER_KEYS, vector: VECTOR_KEYS, missing },
    });
    this.scene.start('TitleScene');
  }
}
