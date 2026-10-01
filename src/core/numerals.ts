export type NumeralSystem = 'arabic-indic' | 'western';

const ARABIC_INDIC = '٠١٢٣٤٥٦٧٨٩';

/** Localize digits only; preserve signs, decimal points, and exponent notation. */
export function formatNumber(n: number, system: NumeralSystem): string {
  const western = String(n);
  return system === 'western'
    ? western
    : western.replace(/[0-9]/g, (digit) => ARABIC_INDIC.charAt(Number(digit)));
}

// TODO: Phase 1: equation formatting for the pan-aligned EquationBar.
