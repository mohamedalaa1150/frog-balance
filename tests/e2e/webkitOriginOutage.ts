/** Playwright 1.63 WebKit offline emulation rejects even local SW responses.
 * https://github.com/microsoft/playwright/issues/42775
 * Use a real origin outage for WebKit: no test is skipped, an uncached context
 * must fail, and a controlled page must reload from its worker and finish a level.
 * Chromium retains the exact context.setOffline(true) test in offline-pwa.spec.ts.
 */
import { expect, type Page } from '@playwright/test';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import type { AddressInfo } from 'node:net';

export async function verifyWebkitOriginOutage(
  page: Page,
  audioChecks?: {
    before(page: Page): Promise<void>;
    after(page: Page): Promise<void>;
  },
): Promise<void> {
  const root = resolve('dist');
  const contentTypes: Record<string, string> = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.webmanifest': 'application/manifest+json',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.webp': 'image/webp',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.mp3': 'audio/mpeg',
    '.ogg': 'audio/ogg',
  };
  const origin = createServer(async (request, response) => {
    const pathname = decodeURIComponent(
      new URL(request.url!, 'http://localhost').pathname,
    );
    const file = resolve(
      root,
      '.' + (pathname === '/' ? '/index.html' : pathname),
    );
    if (!file.startsWith(root + sep)) {
      response.writeHead(403).end();
      return;
    }
    try {
      const bytes = await readFile(file);
      response.writeHead(200, {
        'Content-Type':
          contentTypes[extname(file)] ?? 'application/octet-stream',
        'Cache-Control': 'no-store',
      });
      response.end(bytes);
    } catch {
      response.writeHead(404).end();
    }
  });
  const stop = async () => {
    if (!origin.listening) return;
    const stopped = new Promise<void>((resolve, reject) =>
      origin.close((error) => (error ? reject(error) : resolve())),
    );
    origin.closeAllConnections();
    await stopped;
  };
  await new Promise<void>((resolve) => origin.listen(0, '127.0.0.1', resolve));
  const url = `http://127.0.0.1:${(origin.address() as AddressInfo).port}`;
  try {
    await page.goto(`${url}/?test=1`);
    await page.waitForFunction(() => !!window.__FROG__);
    await page.evaluate(() => window.__FROG__!.ready);
    await page.evaluate(() => navigator.serviceWorker.ready);
    await expect
      .poll(() => page.evaluate(() => !!navigator.serviceWorker.controller), {
        timeout: 20000,
      })
      .toBe(true);
    const manifest = await page.evaluate(async () =>
      (
        await fetch(
          document.querySelector<HTMLLinkElement>('link[rel="manifest"]')!.href,
        )
      ).json(),
    );
    expect(manifest).toMatchObject({
      lang: 'ar',
      dir: 'rtl',
      display: 'standalone',
    });
    expect(manifest.icons).toHaveLength(3);

    await audioChecks?.before(page);
    await stop();
    expect(origin.listening).toBe(false);
    // Without a worker, this origin must be unreachable. HTTP caching is disabled
    // by the server, so a successful reload below requires the real SW cache.
    const control = await page
      .context()
      .browser()!
      .newContext({ serviceWorkers: 'block' });
    try {
      const uncached = await control.newPage();
      await expect(uncached.goto(url, { timeout: 5000 })).rejects.toThrow();
    } finally {
      await control.close();
    }

    const response = await page.reload();
    expect(response?.status()).toBe(200);
    expect(response?.fromServiceWorker()).toBe(true);
    await page.waitForFunction(() => !!window.__FROG__);
    await page.evaluate(() => window.__FROG__!.ready);
    await audioChecks?.after(page);
    await page.evaluate(async () => {
      const api = window.__FROG__!;
      api.setFastMode(true);
      await api.gotoLevel('w6-l3');
      await api.solveCurrent();
    });
    expect(
      await page.evaluate(() => window.__FROG__!.getLevelState()?.phase),
    ).toBe('success');
  } finally {
    await stop();
  }
}
