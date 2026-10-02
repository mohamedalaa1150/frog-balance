import { generatePlaceholderArt } from '../placeholder/placeholderArt';
import { BaseScene } from './BaseScene';

export class PreloadScene extends BaseScene {
  constructor() {
    super('PreloadScene');
  }

  preload(): void {
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
    generatePlaceholderArt(this);
    this.scene.start('TitleScene');
  }
}
