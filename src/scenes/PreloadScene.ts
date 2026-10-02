import { initializeTileColors } from '../theme';
import { RASTER_KEYS, VECTOR_KEYS } from '../assets';
import { getRenderScale } from '../layout/viewport';
import { generatePlaceholderArt } from '../placeholder/placeholderArt';
import { BaseScene } from './BaseScene';

export class PreloadScene extends BaseScene {
  constructor() {
    super('PreloadScene');
  }

  preload(): void {
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
    const assets = import.meta.glob<string>(
      '../../public/assets/audio/**/*.mp3',
      { eager: true, query: '?url', import: 'default' },
    );
    for (const [path, url] of Object.entries(assets))
      this.load.audio(
        path
          .split('/')
          .at(-1)!
          .replace(/\.mp3$/, ''),
        url,
      );
  }

  create(): void {
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
