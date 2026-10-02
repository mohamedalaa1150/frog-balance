import { expect, test } from '@playwright/test';
import { boot, drag, target, touchDrag } from './helpers';

test.use({ hasTouch: true });
for (const input of ['mouse', 'touch'] as const) {
  test(`BUG-201 ${input}: off-pan frogs and tiles return to their source; fixed tiles stay locked`, async ({
    page,
    browserName,
  }) => {
    await boot(page);
    await page.evaluate(async () => {
      await window.__FROG__!.gotoLevel('w1-l5');
      window.__FROG__!.place('frog', 'right');
      window.__FROG__!.place('frog', 'right');
    });
    await page.waitForTimeout(700);
    const floor = {
      x: page.viewportSize()!.width * 0.5,
      y: page.viewportSize()!.height * 0.95,
    };
    const takeAway = async (name: string) =>
      input === 'mouse'
        ? drag(page, name, floor)
        : touchDrag(page, browserName, name, floor);
    await takeAway('item-right-child-0');
    await expect
      .poll(() =>
        page.evaluate(
          () => window.__FROG__!.getLevelState()!.pans.right.length,
        ),
      )
      .toBe(1);
    expect(
      await page.evaluate(() =>
        window.__FROG__!.getPointerTarget('item-right-child-0'),
      ),
    ).toBeNull();
    expect(await page.evaluate(() => window.__FROG__!.events)).toContainEqual(
      expect.objectContaining({
        type: 'remove',
        data: { side: 'right', uid: 'child-0' },
      }),
    );
    expect(await page.evaluate(() => window.__FROG__!.events)).toContainEqual(
      expect.objectContaining({
        type: 'audio',
        data: { key: 'count_01', channel: 'vo' },
      }),
    );
    await takeAway('item-left-fixed-left-0');
    expect(
      await page.evaluate(() => window.__FROG__!.getLevelState()!.pans.left),
    ).toHaveLength(1);
    expect(await page.evaluate(() => window.__FROG__!.events)).toContainEqual(
      expect.objectContaining({
        type: 'feedback',
        data: { key: 'feedback_locked' },
      }),
    );
    await page.evaluate(async () => {
      await window.__FROG__!.gotoScene('SandboxScene');
      window.__FROG__!.place('number', 'right', 7);
    });
    await page.waitForTimeout(700);
    await target(page, 'item-right-child-0');
    await takeAway('item-right-child-0');
    await expect
      .poll(() =>
        page.evaluate(
          () => window.__FROG__!.getLevelState()!.pans.right.length,
        ),
      )
      .toBe(0);
    expect(
      await page.evaluate(() =>
        window.__FROG__!.getPointerTarget('item-right-child-0'),
      ),
    ).toBeNull();
    expect(await page.evaluate(() => window.__FROG__!.events)).toContainEqual(
      expect.objectContaining({
        type: 'remove',
        data: { side: 'right', uid: 'child-0' },
      }),
    );
    await expect
      .poll(() =>
        page.evaluate(() =>
          window.__FROG__!.getPointerTarget('return-item-right-child-0'),
        ),
      )
      .toBeNull();
  });
}
