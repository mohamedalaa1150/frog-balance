/** Schedule an entire sentence on the audio clock, independently of frame/JS latency.
 * The pack pads each edge by 150 ms; trim those edges inside a chain. */
export function scheduleVoice(
  keys: readonly string[],
  duration: (key: string) => number,
  now: number,
) {
  let start = now + 0.02;
  return keys.map((key) => {
    const full = duration(key);
    const offset = keys.length > 1 && full > 0.3 ? 0.15 : 0;
    const length = Math.max(0, full - offset * 2);
    const clip = { key, start, end: start + length, offset, duration: length };
    start = clip.end;
    return clip;
  });
}
export class DuckingState {
  active = false;
  change(active: boolean) {
    this.active = active;
    return { factor: active ? 0.25 : 1, seconds: active ? 0.15 : 0.4 };
  }
  get factor() {
    return this.active ? 0.25 : 1;
  }
}
