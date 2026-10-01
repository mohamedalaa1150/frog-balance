import Phaser from 'phaser';
import { CONFIG } from '../config';
import { formatNumber } from '../core/numerals';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  create(): void {
    void this.loadFonts();
  }

  private async loadFonts(): Promise<void> {
    const sample = `${document.title} ${formatNumber(1234567890, 'arabic-indic')}`;
    await Promise.all(
      [500, 700, 800].map((weight) =>
        document.fonts.load(`${weight} 32px "${CONFIG.fontFamily}"`, sample),
      ),
    );
    if (this.scene.isActive()) this.scene.start('PreloadScene');
  }
}
