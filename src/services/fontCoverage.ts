/** Match CSS unicode ranges without treating whitespace-only fallback subsets as needed. */
export function coversText(unicodeRange: string, text: string): boolean {
  const points = Array.from(text)
    .filter((character) => character.trim().length > 0)
    .map((character) => character.codePointAt(0)!);
  return unicodeRange.split(',').some((range) => {
    const match = /^U\+([0-9A-F?]+)(?:-([0-9A-F]+))?$/i.exec(range.trim());
    if (!match?.[1]) return false;
    const first = parseInt(match[1].replace(/\?/g, '0'), 16);
    const last = parseInt(match[2] ?? match[1].replace(/\?/g, 'F'), 16);
    return points.some((point) => point >= first && point <= last);
  });
}
