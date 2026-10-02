export type NumeralSystem = 'arabic-indic' | 'western';

const ARABIC_INDIC = '٠١٢٣٤٥٦٧٨٩';

/** Localize digits only; preserve signs, decimal points, and exponent notation. */
export function formatNumber(n: number, system: NumeralSystem): string {
  const western = String(n);
  return system === 'western'
    ? western
    : western.replace(/[0-9]/g, (digit) => ARABIC_INDIC.charAt(Number(digit)));
}

export type EquationTerm = number | '?';
export interface EquationGroups {
  left: { side: 'left'; terms: string[]; text: string; direction: 'rtl' };
  center: '=';
  right: { side: 'right'; terms: string[]; text: string; direction: 'rtl' };
}
/** Terms stay in placement order. Each group is independently RTL; screen-side
 * labels are never swapped. '?' is the Arabic question-mark math symbol. */
export function formatEquation(
  leftTerms: readonly EquationTerm[],
  rightTerms: readonly EquationTerm[],
  system: NumeralSystem,
): EquationGroups {
  const format = (terms: readonly EquationTerm[]): string[] =>
    terms.map((term) => (term === '?' ? '؟' : formatNumber(term, system)));
  const left = format(leftTerms);
  const right = format(rightTerms);
  return {
    left: {
      side: 'left',
      terms: left,
      text: left.join(' + '),
      direction: 'rtl',
    },
    center: '=',
    right: {
      side: 'right',
      terms: right,
      text: right.join(' + '),
      direction: 'rtl',
    },
  };
}
