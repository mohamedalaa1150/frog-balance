import { CONFIG } from '../config';
import type { ItemSpec } from './types';

export const weightOf = (item: ItemSpec): number =>
  item.kind === 'frog' ? 1 : item.value!;
export const panWeight = (items: readonly ItemSpec[]): number =>
  items.reduce((sum, item) => sum + weightOf(item), 0);
export const diff = (
  left: readonly ItemSpec[],
  right: readonly ItemSpec[],
): number => panWeight(right) - panWeight(left);
export const isBalanced = (
  left: readonly ItemSpec[],
  right: readonly ItemSpec[],
): boolean => diff(left, right) === 0;

export function beamAngle(
  d: number,
  c: { base: number; step: number; maxAngle: number } = CONFIG.beam,
): number {
  if (d === 0) return 0;
  return (
    Math.sign(d) * Math.min(c.maxAngle, c.base + c.step * (Math.abs(d) - 1))
  );
}
export function withinCapacity(
  items: readonly ItemSpec[],
  cap: {
    numbers: number;
    frogs: number;
    mixedNumbers: number;
    mixedFrogs: number;
  } = CONFIG.capacity,
): boolean {
  const numbers = items.filter((item) => item.kind === 'number').length;
  const frogs = items.length - numbers;
  return numbers > 0 && frogs > 0
    ? numbers <= cap.mixedNumbers && frogs <= cap.mixedFrogs
    : numbers <= cap.numbers && frogs <= cap.frogs;
}
export function canPlace(
  pan: readonly ItemSpec[],
  item: ItemSpec,
  cap: {
    numbers: number;
    frogs: number;
    mixedNumbers: number;
    mixedFrogs: number;
  } = CONFIG.capacity,
): boolean {
  return withinCapacity([...pan, item], cap);
}
