export const CONFIG = {
  fontFamily: 'Baloo Bhaijaan 2',
  maxRenderScale: 2,
  design: {
    landscape: { width: 1280, height: 720 },
    portrait: { width: 720, height: 1280 },
  },
  beam: { base: 6, step: 3, maxAngle: 20 },
  capacity: { numbers: 3, frogs: 10, mixedNumbers: 2, mixedFrogs: 6 },
  settleMs: 1000,
} as const;
