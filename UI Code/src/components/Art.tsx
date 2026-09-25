import { useMemo } from "react";
import { rng, starPath } from "../lib/rng";

/** Ustad generative visuals — seeded, deterministic, offline.
 *  Covers, headers, rewards and seals are drawn from arches, dots, halves,
 *  quarters, rings, stars and stripes: one base colour, at most three accents.
 *  No photo is ever used, and nothing is ever downloaded. */

export const HARM: Record<string, string[]> = {
  "#00827E": ["#FFB31A", "#FFF8EF", "#D81E57", "#1C1433", "#19B8B0"],
  "#D81E57": ["#FFF8EF", "#FFB31A", "#1C1433", "#FF7FA3"],
  "#FFB31A": ["#1C1433", "#D81E57", "#00827E", "#FFF8EF"],
  "#7443F0": ["#FFB31A", "#FFF8EF", "#19B8B0", "#B9A2FF"],
  "#7BC043": ["#1C1433", "#FFF8EF", "#00827E", "#FFB31A"],
  "#F46A24": ["#1C1433", "#FFF8EF", "#FFB31A", "#7443F0"],
  "#1C1433": ["#FFB31A", "#19B8B0", "#D81E57", "#FFF8EF", "#7443F0"],
  "#FFF8EF": ["#00827E", "#D81E57", "#FFB31A", "#7443F0", "#1C1433"],
  "#2F7CF6": ["#FFF8EF", "#FFB31A", "#1C1433", "#9CC3FF"],
  "#8A5A3B": ["#FFF8EF", "#FFB31A", "#F46A24", "#1C1433"],
};

export type ArtKind =
  | "arch" | "circle" | "half" | "quarter" | "ring" | "dots" | "stripes" | "star" | "window" | "blank";

export type ArtProps = {
  seed: string | number;
  w?: number;
  h?: number;
  cols?: number;
  bg?: string;
  anim?: boolean;
  kinds?: ArtKind[];
  opacity?: number;
  className?: string;
  style?: React.CSSProperties;
};

const DEFAULT_KINDS: ArtKind[] = [
  "arch", "arch", "circle", "half", "half", "quarter", "quarter",
  "ring", "dots", "stripes", "star", "window", "blank",
];

export function Art({ seed, w = 120, h = 120, cols, bg, anim, kinds, opacity, className, style }: ArtProps) {
  const cells = useMemo(() => {
    const r = rng(seed);
    const pick = <T,>(a: T[]): T => a[Math.floor(r() * a.length)];
    const C = cols || (r() < 0.5 ? 2 : 3);
    const c = w / C;
    const rows = Math.ceil(h / c);
    const base = bg || pick(["#00827E", "#7443F0", "#1C1433", "#FFF8EF", "#D81E57", "#FFB31A"]);
    const pool = (HARM[base] || HARM["#FFF8EF"]).slice().sort(() => r() - 0.5).slice(0, 3);
    const list = kinds || DEFAULT_KINDS;
    const out: { key: string; shapes: React.JSX.Element[]; anim?: React.CSSProperties }[] = [];
    let n = 0;
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < C; i++) {
        const x = i * c, y = j * c;
        const f = pick(pool);
        const kind = pick(list);
        const rot = Math.floor(r() * 4) * 90;
        const cx = x + c / 2, cy = y + c / 2;
        const shapes: React.JSX.Element[] = [];
        const key = (k: number) => `s${k}`;
        if (kind === "arch") {
          shapes.push(<path key={key(0)} d={`M${x} ${y + c}V${y + c / 2}a${c / 2} ${c / 2} 0 0 1 ${c} 0V${y + c}z`} fill={f} transform={r() < 0.25 ? `rotate(180 ${cx} ${cy})` : undefined} />);
        } else if (kind === "window") {
          shapes.push(<path key={key(0)} d={`M${x + c * 0.16} ${y + c}V${y + c * 0.52}a${c * 0.34} ${c * 0.34} 0 0 1 ${c * 0.68} 0V${y + c}z`} fill={f} />);
          shapes.push(<circle key={key(1)} cx={cx} cy={y + c * 0.68} r={c * 0.1} fill={f === "#1C1433" ? "#FFB31A" : "#1C1433"} />);
        } else if (kind === "circle") {
          shapes.push(<circle key={key(0)} cx={cx} cy={cy} r={c * 0.42} fill={f} />);
        } else if (kind === "ring") {
          shapes.push(<circle key={key(0)} cx={cx} cy={cy} r={c * 0.33} fill="none" stroke={f} strokeWidth={c * 0.13} />);
        } else if (kind === "half") {
          shapes.push(<path key={key(0)} d={`M${x} ${cy}a${c / 2} ${c / 2} 0 0 1 ${c} 0z`} fill={f} transform={`rotate(${rot} ${cx} ${cy})`} />);
        } else if (kind === "quarter") {
          shapes.push(<path key={key(0)} d={`M${x} ${y}h${c}a${c} ${c} 0 0 1 ${-c} ${c}z`} fill={f} transform={`rotate(${rot} ${cx} ${cy})`} />);
        } else if (kind === "dots") {
          for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++)
            shapes.push(<circle key={`d${a}${b}`} cx={x + c * (0.22 + a * 0.28)} cy={y + c * (0.22 + b * 0.28)} r={c * 0.07} fill={f} />);
        } else if (kind === "stripes") {
          for (let a = 0; a < 3; a++)
            shapes.push(<rect key={`r${a}`} x={x + c * 0.12} y={y + c * (0.16 + a * 0.26)} width={c * 0.76} height={c * 0.15} rx={c * 0.075} fill={f} transform={`rotate(${rot % 180} ${cx} ${cy})`} />);
        } else if (kind === "star") {
          shapes.push(<path key={key(0)} d={starPath(cx, cy, c * 0.38)} fill={f} />);
        }
        const a = anim && r() < 0.35
          ? { transformBox: "fill-box" as const, transformOrigin: "center", animation: `qTwinkle ${2 + r() * 2}s ease-in-out ${-r() * 2}s infinite` }
          : undefined;
        out.push({ key: "c" + n++, shapes, anim: a });
      }
    }
    return { base, out };
  }, [seed, w, h, cols, bg, anim, kinds]);

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      width="100%"
      height="100%"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      className={className}
      style={{ display: "block", opacity, ...style }}
    >
      <rect width={w} height={h} fill={cells.base} />
      {cells.out.map((g) => (
        <g key={g.key} style={g.anim}>{g.shapes}</g>
      ))}
    </svg>
  );
}

/** Cover seed convention from the handoff: `${subject}-g${grade}`. */
export const coverSeed = (subject: string, grade: number) => `${subject}-g${grade}`;
