import Phaser from 'phaser';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('PreloadScene');
  }

  create(): void {
    // TODO: Phase 2: generate placeholder textures and load available audio.
    this.scene.start('TitleScene');
  }
}
