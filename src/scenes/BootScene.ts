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
    let timer: number | undefined;
    let fallback:
      { reason: 'timeout' | 'failure'; message: string } | undefined;
    try {
      await Promise.race([
        Promise.all(
          [500, 700, 800].map((weight) =>
            document.fonts.load(
              `${weight} 32px "${CONFIG.fontFamily}"`,
              sample,
            ),
          ),
        ),
        new Promise<never>((_, reject) => {
          timer = window.setTimeout(
            () => reject(new Error('Font load timed out')),
            CONFIG.fontTimeoutMs,
          );
        }),
      ]);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      fallback = {
        reason: message === 'Font load timed out' ? 'timeout' : 'failure',
        message,
      };
    } finally {
      window.clearTimeout(timer);
    }
    if (fallback && this.scene.isActive())
      this.game.events.emit('font-fallback', fallback);
    if (this.scene.isActive()) this.scene.start('PreloadScene');
  }
}
