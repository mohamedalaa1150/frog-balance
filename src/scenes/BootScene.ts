import { BaseScene } from './BaseScene';
import { CONFIG } from '../config';
import { formatNumber } from '../core/numerals';
import { t } from '../services/strings';
import { coversText, failedFontRequest } from '../services/fontCoverage';
import font500 from '@fontsource/baloo-bhaijaan-2/files/baloo-bhaijaan-2-arabic-500-normal.woff2?url';
import font700 from '@fontsource/baloo-bhaijaan-2/files/baloo-bhaijaan-2-arabic-700-normal.woff2?url';
import font800 from '@fontsource/baloo-bhaijaan-2/files/baloo-bhaijaan-2-arabic-800-normal.woff2?url';

export class BootScene extends BaseScene {
  constructor() {
    super('BootScene');
  }

  create(): void {
    document.title = t('game_title');
    void this.loadFonts();
  }

  private async loadFonts(): Promise<void> {
    const started = performance.now();
    const sample = `${document.title} ${formatNumber(1234567890, 'arabic-indic')}`;
    const controller = new AbortController();
    let timer: number | undefined;
    let fallback:
      { reason: 'timeout' | 'failure'; message: string } | undefined;
    const requestedFaces = Array.from(document.fonts).filter(
      (face) =>
        face.family.replace(/["']/g, '') === CONFIG.fontFamily &&
        coversText(face.unicodeRange, sample),
    );
    try {
      await Promise.race([
        (async () => {
          // Check the same self-hosted assets first: WebKit can leave CSS font
          // promises pending on an abort, whereas fetch reliably rejects.
          // Reuse the browser cache when document.fonts.load requests them.
          await Promise.all(
            [font500, font700, font800].map(async (url) => {
              const response = await fetch(url, {
                cache: 'force-cache',
                signal: controller.signal,
              });
              if (!response.ok) throw new Error('Font resource failed to load');
              await response.arrayBuffer();
            }),
          );
          await Promise.all(
            [500, 700, 800].map((weight) =>
              document.fonts.load(
                `${weight} 32px "${CONFIG.fontFamily}"`,
                sample,
              ),
            ),
          );
        })(),
        // WebKit may leave FontFaceSet.load pending after a network abort.
        // Individual faces still expose their failure through loaded/status.
        new Promise<never>((_, reject) => {
          for (const face of requestedFaces) void face.loaded.catch(reject);
        }),
        new Promise<never>((_, reject) => {
          timer = window.setTimeout(
            () => reject(new Error('Font load timed out')),
            CONFIG.fontTimeoutMs,
          );
        }),
      ]);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      const resourceFailed = performance
        .getEntriesByType('resource')
        .some((entry) =>
          failedFontRequest(entry as PerformanceResourceTiming, started),
        );
      fallback = {
        reason:
          message === 'Font load timed out' && !resourceFailed
            ? 'timeout'
            : 'failure',
        message: resourceFailed ? 'Font resource failed to load' : message,
      };
    } finally {
      window.clearTimeout(timer);
      controller.abort();
    }
    if (fallback && this.scene.isActive())
      this.game.events.emit('font-fallback', fallback);
    if (this.scene.isActive()) this.scene.start('PreloadScene');
  }
}
