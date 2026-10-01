import { BaseScene } from './BaseScene';

export class PreloadScene extends BaseScene {
  constructor() {
    super('PreloadScene');
  }

  create(): void {
    // TODO: Phase 2: generate placeholder textures and load available audio.
    this.scene.start('TitleScene');
  }
}
