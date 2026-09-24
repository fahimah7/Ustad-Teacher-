/** Deterministic, seeded RNG from the handoff: same seed, same picture, on every phone. */
export function rng(seed: string | number) {
  let s = 2166136261;
  for (const ch of String(seed)) {
    s ^= ch.charCodeAt(0);
    s = Math.imul(s, 16777619) >>> 0;
  }
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export function starPath(cx: number, cy: number, R: number): string {
  let d = "";
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? R * 0.46 : R;
    d += (i ? "L" : "M") + (cx + rr * Math.cos(a)).toFixed(1) + " " + (cy + rr * Math.sin(a)).toFixed(1);
  }
  return d + "z";
}
