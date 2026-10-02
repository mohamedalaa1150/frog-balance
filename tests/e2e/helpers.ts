import { expect, type Page } from '@playwright/test';
/** SwiftShader emits this precise Chromium diagnostic during Phaser's WebGL probe.
 * The context address varies; no other GL, console, resource, or application message is ignored. */
export function consoleErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (!['error', 'warning'].includes(message.type())) return;
    if (
      /^\[\.WebGL-0x[0-9a-f]+\]GL Driver Message \(OpenGL, Performance, GL_CLOSE_PATH_NV, High\): GPU stall due to ReadPixels(?: \(this message will no longer repeat\))?$/.test(
        message.text(),
      )
    )
      return;
    errors.push(message.text());
  });
  return errors;
}
export async function boot(page: Page) {
  await page.goto('/?test=1');
  await page.waitForFunction(() => !!window.__FROG__);
  await page.evaluate(() => window.__FROG__!.ready);
}
export async function target(page: Page, name: string) {
  let point: { x: number; y: number } | null = null;
  await expect
    .poll(
      async () => {
        point = await page.evaluate(
          (name) => window.__FROG__!.getPointerTarget(name),
          name,
        );
        return point;
      },
      { message: `pointer target ${name}` },
    )
    .not.toBeNull();
  return point!;
}
export async function drag(
  page: Page,
  from: string,
  to: string | { x: number; y: number },
) {
  const start = await target(page, from),
    end = typeof to === 'string' ? await target(page, to) : to;
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(end.x, end.y, { steps: 6 });
  if (typeof to === 'string') {
    const current = await target(page, to);
    await page.mouse.move(current.x, current.y);
  }
  await page.mouse.up();
}
export async function tap(page: Page, name: string, touch = false) {
  const point = await target(page, name);
  if (touch) await page.touchscreen.tap(point.x, point.y);
  else await page.mouse.click(point.x, point.y);
}
