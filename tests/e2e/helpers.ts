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
  // Phaser applies queued scene starts/restarts at the next frame boundary.
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );
}

/** Chromium injects trusted native touches. Playwright WebKit exposes native tap
 * only, so its drag exercises the browser TouchEvent path rather than the reducer. */
export async function touchDrag(
  page: Page,
  browserName: string,
  from: string,
  end: { x: number; y: number },
) {
  const start = await target(page, from);
  const session =
    browserName === 'chromium'
      ? await page.context().newCDPSession(page)
      : undefined;
  const send = async (
    type: 'touchStart' | 'touchMove' | 'touchEnd',
    point: { x: number; y: number },
  ) => {
    if (session) {
      await session.send('Input.dispatchTouchEvent', {
        type,
        touchPoints: type === 'touchEnd' ? [] : [{ ...point, id: 1 }],
      });
    } else {
      await page.evaluate(
        ({ type, point }) => {
          const canvas = document.querySelector('canvas')!;
          // WebKit exposes Touch/TouchEvent but rejects their constructors.
          // Use its legacy event factory and a complete touch record instead.
          const touch: Touch = {
            identifier: 1,
            target: canvas,
            clientX: point.x,
            clientY: point.y,
            pageX: point.x + scrollX,
            pageY: point.y + scrollY,
            screenX: point.x,
            screenY: point.y,
            radiusX: 1,
            radiusY: 1,
            rotationAngle: 0,
            force: 1,
          };
          const event = document.createEvent('TouchEvent');
          event.initEvent(type.toLowerCase(), true, true);
          Object.defineProperties(event, {
            touches: { value: type === 'touchEnd' ? [] : [touch] },
            targetTouches: { value: type === 'touchEnd' ? [] : [touch] },
            changedTouches: { value: [touch] },
          });
          canvas.dispatchEvent(event);
        },
        { type, point },
      );
    }
    await page.evaluate(
      () =>
        new Promise<void>((resolve) => requestAnimationFrame(() => resolve())),
    );
  };
  try {
    await send('touchStart', start);
    for (let step = 1; step <= 6; step++)
      await send('touchMove', {
        x: start.x + ((end.x - start.x) * step) / 6,
        y: start.y + ((end.y - start.y) * step) / 6,
      });
    await send('touchEnd', end);
  } finally {
    await session?.detach();
  }
}
