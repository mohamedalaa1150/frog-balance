import { expect, test } from '@playwright/test';
import { boot } from './helpers';

test.use({ deviceScaleFactor: 2 });
test('BUG-401/402: pan contents stay clear throughout animated weight reversals', async ({
  page,
}) => {
  test.setTimeout(90000);
  await boot(page);
  for (const [width, height] of [
    [844, 390],
    [1366, 768],
    [1024, 768],
    [1920, 1080],
    [390, 844],
    [360, 740],
    [768, 1024],
  ] as const) {
    await page.setViewportSize({ width, height });
    for (const reverse of [false, true]) {
      const samples = await page.evaluate(async (reverse) => {
        const api = window.__FROG__!;
        api.setFastMode(true);
        await api.gotoScene('SandboxScene');
        api.place('number', 'left', 10);
        for (const value of [7, 6]) api.place('number', 'right', value);
        for (let i = 0; i < 6; i++) api.place('frog', 'right');
        if (reverse) {
          api.place('number', 'left', 9);
          api.place('number', 'left', 8);
        }
        api.setFastMode(false);
        if (reverse) {
          api.removeLast('left');
          api.removeLast('left');
        } else {
          api.place('number', 'left', 9);
          api.place('number', 'left', 8);
        }
        type Box = { x: number; y: number; width: number; height: number };
        const intersects = (a: Box, b: Box) =>
          a.x < b.x + b.width - 0.01 &&
          b.x < a.x + a.width - 0.01 &&
          a.y < b.y + b.height - 0.01 &&
          b.y < a.y + a.height - 0.01;
        const result: Array<{ beam: number; collisions: string[] }> = [];
        for (let frame = 0; frame < 50; frame++) {
          await new Promise<void>((resolve) =>
            requestAnimationFrame(() => resolve()),
          );
          const head = api.getBounds('mascot-head')!;
          const rings = api.getBeamGeometry().rings;
          const hud = ['btn-home', 'btn-sound', 'btn-read'].map((n) =>
            api.getBounds(n)!,
          );
          const collisions: string[] = [];
          const pans = ['pan-left', 'pan-right'].map((n) => api.getBounds(n)!);
          if (intersects(pans[0]!, pans[1]!)) collisions.push('pans');
          for (const side of ['left', 'right'] as const) {
            const dish = api.getBounds(`dish-${side}`)!;
            for (const item of api.getLevelState()!.pans[side]) {
              const b = api.getBounds(`item-${side}-${item.uid}`)!;
              if (intersects(b, head)) collisions.push('head');
              for (const ring of rings)
                if (intersects(b, ring))
                  collisions.push(
                    `${frame}: ${side} ${item.kind} ${JSON.stringify(b)} touches ring ${JSON.stringify(ring)}`,
                  );
              if (hud.some((button) => intersects(b, button)))
                collisions.push('HUD');
              if (
                b.x < dish.x - 0.01 ||
                b.x + b.width > dish.x + dish.width + 0.01
              )
                collisions.push('dish');
              if (
                b.x < 0 ||
                b.y < 0 ||
                b.x + b.width > innerWidth + 0.01 ||
                b.y + b.height > innerHeight + 0.01
              )
                collisions.push('viewport');
            }
          }
          result.push({
            beam: api.getBounds('beam')!.width / innerWidth,
            collisions,
          });
        }
        return result;
      }, reverse);
      expect(
        samples.flatMap((s) => s.collisions),
        `${width}x${height}: animated collisions`,
      ).toEqual([]);
      expect(Math.min(...samples.map((s) => s.beam))).toBeGreaterThanOrEqual(
        (width < height ? 0.6 : height < 500 ? 0.45 : 0.62) - 0.0001,
      );
      if (width < height)
        expect(Math.max(...samples.map((s) => s.beam))).toBeLessThanOrEqual(
          0.7201,
        );
    }
  }
});
