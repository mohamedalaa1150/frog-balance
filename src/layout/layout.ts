import { CONFIG } from '../config';

export function getLayout(width: number, height: number) {
  const orientation = width >= height ? 'landscape' : 'portrait';
  const design = CONFIG.design[orientation];
  return {
    orientation,
    uiScale: Math.min(width / design.width, height / design.height),
    centerX: width / 2,
    centerY: height / 2,
  };
}

// TODO: Phase 2–4: pan, tray, and navigation anchor maps.
