/** Approved style B. All colour literals live here, including CSS/HTML chrome. */
export const THEME = {
  sky: 0xfef1cf,
  sun: 0xfcd348,
  water: 0x77c5d3,
  waterDeep: 0x4fa6b8,
  leaf: 0x679a21,
  frog: 0xa0c838,
  frogOutline: 0x4e7f1c,
  belly: 0xf4e58a,
  cheek: 0xf79b7d,
  scarf: 0xdd3e2e,
  coral: 0xe36f51,
  gold: 0xfdc625,
  pan: 0xffd447,
  panOutline: 0xd99a1e,
  navy: 0x2e4a7d,
  cream: 0xfdf0c8,
  orange: 0xf2994a,
  green: 0x6dae3a,
  blue: 0x4c87c4,
  purple: 0x7d619f,
  white: 0xffffff,
  shadow: 0x000000,
  coralOutline: 0xb34e38,
  goldOutline: 0xb77c19,
  wood: 0xb57a42,
  woodOutline: 0x87522c,
  dawn: 0xf9e5db,
  noon: 0xfef1cf,
  forest: 0xe5edcd,
  waterfall: 0xe2eef2,
  cave: 0xe9e0f0,
  night: 0xcdd8eb,
} as const;
export const cssColor = (color: number): string =>
  `#${color.toString(16).padStart(6, '0')}`;
export const TILE_COLORS = [
  THEME.coral,
  THEME.orange,
  THEME.green,
  THEME.blue,
  THEME.purple,
] as const;
let deliveredTileColors: Record<string, number> = {};
export function initializeTileColors(data: unknown): void {
  if (!data || typeof data !== 'object') return;
  const colors: Record<string, number> = {};
  for (const [key, value] of Object.entries(data))
    if (typeof value === 'string' && /^#[\da-f]{6}$/i.test(value))
      colors[key] = Number.parseInt(value.slice(1), 16);
  deliveredTileColors = colors;
}
export const tileColor = (value: number): number =>
  deliveredTileColors[String(value)] ??
  TILE_COLORS[(value - 1) % TILE_COLORS.length]!;
export const WORLD_SKIES = [
  THEME.dawn,
  THEME.noon,
  THEME.forest,
  THEME.waterfall,
  THEME.cave,
  THEME.night,
] as const;
