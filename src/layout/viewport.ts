import type Phaser from 'phaser';
import { CONFIG } from '../config';

/**
 * Physical render scale. 3× screens render natively (sharp text and art);
 * fractional ratios between 2 and 3 snap to 2 so every texture keeps whole
 * pixel dimensions.
 */
export function getRenderScale(): number {
  const dpr = window.devicePixelRatio || 1;
  return dpr >= CONFIG.maxRenderScale
    ? CONFIG.maxRenderScale
    : Math.min(dpr, 2);
}

export function getViewport(parent: HTMLElement) {
  const renderScale = getRenderScale();
  const { width, height } = parent.getBoundingClientRect();
  return {
    renderScale,
    width: Math.max(1, Math.round(width * renderScale)),
    height: Math.max(1, Math.round(height * renderScale)),
  };
}

/** Keep the backing store in physical pixels and the display in CSS pixels. */
export function installViewportController(
  game: Phaser.Game,
  parent: HTMLElement,
): void {
  let frame = 0;
  const resize = () => {
    const { width, height, renderScale } = getViewport(parent);
    game.scale.setZoom(1 / renderScale);
    game.scale.resize(width, height);
  };
  const schedule = () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(resize);
  };
  const observer = new ResizeObserver(schedule);
  observer.observe(parent);
  window.addEventListener('resize', schedule);
  window.addEventListener('orientationchange', schedule);
  window.visualViewport?.addEventListener('resize', schedule);
  game.events.once('ready', resize);
  game.events.once('destroy', () => {
    cancelAnimationFrame(frame);
    observer.disconnect();
    window.removeEventListener('resize', schedule);
    window.removeEventListener('orientationchange', schedule);
    window.visualViewport?.removeEventListener('resize', schedule);
    game.events.off('ready', resize);
  });
}
