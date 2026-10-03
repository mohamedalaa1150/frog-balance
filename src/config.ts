export const CONFIG = {
  fontFamily: 'Baloo Bhaijaan 2',
  fontStack: '"Baloo Bhaijaan 2", "Noto Naskh Arabic", "Tahoma", sans-serif',
  fontTimeoutMs: 2500,
  maxRenderScale: 3,
  design: {
    landscape: { width: 1280, height: 720 },
    portrait: { width: 720, height: 1280 },
  },
  beam: { base: 6, step: 3, maxAngle: 20, overshootAllowance: 2 },
  capacity: { numbers: 3, frogs: 10, mixedNumbers: 2, mixedFrogs: 6 },
  settleMs: 1000,
} as const;
