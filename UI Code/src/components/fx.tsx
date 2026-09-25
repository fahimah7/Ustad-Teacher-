/* Live motion pieces from the design, ported one to one:
   mark, floaters, typing dots, waveforms, speaking glow, pulsing mic,
   scan bar, caret, journey, star burst, big star, page transfer, spinner. */
import { useMemo } from "react";
import { rng } from "../lib/rng";

const SAF = "#FFB31A", INK = "#1C1433";
export const STAR_D = "M12 2.5l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.3l-5.8 3.1 1.1-6.5L2.6 9.3l6.5-.9z";

/** The lit window: saffron arch, white outline, one dark dot that drops in. */
export function Mark({ size = 70, still = false }: { size?: number; still?: boolean }) {
  return (
    <svg viewBox="0 0 120 120" width={size} height={size} style={{ overflow: "visible", flex: "none" }} aria-hidden="true">
      <g style={{ transformBox: "view-box", transformOrigin: "60px 104px", transform: "rotate(-7deg)", animation: still ? undefined : "qWobble 3.6s ease-in-out infinite" }}>
        <path d="M26 104V50a34 34 0 0 1 68 0v54z" fill={SAF} stroke="#FFFFFF" strokeWidth={9} strokeLinejoin="round" paintOrder="stroke" />
        <circle cx={60} cy={68} r={12} fill={INK} style={{ transformBox: "view-box", transformOrigin: "60px 68px", animation: still ? undefined : "qDot 3.6s cubic-bezier(.3,1.4,.5,1) infinite" }} />
      </g>
    </svg>
  );
}

export function Floaters() {
  const shapes = [
    { l: "76%", t: "52%", w: 190, c: "rgba(255,255,255,.09)", d: "9s", dl: "0s" },
    { l: "-5%", t: "-14%", w: 140, c: "rgba(255,255,255,.07)", d: "11s", dl: "-3s" },
    { l: "58%", t: "-16%", w: 86, c: "rgba(255,179,26,.45)", d: "7s", dl: "-1s" },
    { l: "30%", t: "84%", w: 70, c: "rgba(216,30,87,.55)", d: "8s", dl: "-5s" },
  ];
  const dots: [string, string, string][] = [["88%", "20%", "0s"], ["46%", "12%", "-1.2s"], ["12%", "78%", "-2.4s"], ["68%", "88%", "-.6s"]];
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }} aria-hidden="true">
      {shapes.map((s, i) => (
        <svg key={i} viewBox="0 0 60 80" width={s.w} height={(s.w * 4) / 3} style={{ position: "absolute", left: s.l, top: s.t, animation: `qFloat ${s.d} ease-in-out ${s.dl} infinite` }}>
          <path d="M0 80V30a30 30 0 0 1 60 0v50z" fill={s.c} />
        </svg>
      ))}
      {dots.map((d, i) => (
        <div key={i} style={{ position: "absolute", left: d[0], top: d[1], width: 12, height: 12, borderRadius: 6, background: SAF, animation: `qTwinkle 2.4s ease-in-out ${d[2]} infinite` }} />
      ))}
    </div>
  );
}

export function Typing({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div className={className} role="status" aria-label="Ustad is writing" style={{ display: "flex", gap: 6, padding: "14px 16px", background: "#FFFFFF", border: "2px solid #EFE6DA", borderRadius: "20px 20px 20px 6px", width: "max-content", ...style }}>
      {[0, 1, 2].map((i) => (
        <div key={i} style={{ width: 9, height: 9, borderRadius: 5, background: "#D81E57", animation: `qDotJ 1s ease-in-out ${i * 0.15}s infinite` }} />
      ))}
    </div>
  );
}

/** Waveform bars; `level` (0..1) scales them when a live mic level is available. */
export function Wave({ n, color, h, gap = 3, level, still }: { n: number; color: string; h: number; gap?: number; level?: number; still?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap, height: h }} aria-hidden="true">
      {Array.from({ length: n }, (_, i) => (
        <div key={i} style={{ width: 4, height: h, borderRadius: 2, background: color, transformOrigin: "center", animation: still ? undefined : `qWave ${(0.7 + ((i * 37) % 9) / 10).toFixed(2)}s ease-in-out ${(-i * 0.11).toFixed(2)}s infinite`, transform: still ? `scaleY(${0.25 + 0.5 * (((i * 37) % 9) / 9)})` : level !== undefined ? `scaleY(${Math.max(0.2, level)})` : undefined }} />
      ))}
    </div>
  );
}

export function VoiceGlow({ speaking = true }: { speaking?: boolean }) {
  return (
    <div style={{ width: 236, height: 296, borderRadius: "118px 118px 30px 30px", border: "8px solid #FFFFFF", boxSizing: "border-box", display: "flex", alignItems: "flex-end", justifyContent: "center", gap: 9, paddingBottom: 36, overflow: "hidden", background: "#2A1F4D", animation: "qBob 4s ease-in-out infinite" }} aria-hidden="true">
      {Array.from({ length: 7 }, (_, i) => (
        <div key={i} style={{ width: 16, height: 150, borderRadius: 8, background: i % 2 ? SAF : "#FFD166", transformOrigin: "bottom", transform: speaking ? undefined : "scaleY(.2)", transition: "transform 280ms var(--ease-settle)", animation: speaking ? `qGlow ${(1 + (i % 3) * 0.28).toFixed(2)}s ease-in-out ${(-i * 0.19).toFixed(2)}s infinite` : undefined }} />
      ))}
    </div>
  );
}

export function MicGlyph({ s, c = "#FFFFFF" }: { s: number; c?: string }) {
  return (
    <svg viewBox="0 0 24 24" width={s} height={s} aria-hidden="true">
      <path d="M12 3.5a3 3 0 0 1 3 3v5a3 3 0 0 1-6 0v-5a3 3 0 0 1 3-3zM5.5 11a6.5 6.5 0 0 0 13 0M12 17.5v3" fill="none" stroke={c} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ScanBar({ travel = 190 }: { travel?: number }) {
  return <div aria-hidden="true" style={{ position: "absolute", left: 10, right: 10, top: 10, height: 30, borderRadius: 10, background: "linear-gradient(180deg,rgba(255,179,26,0),rgba(255,179,26,.45),rgba(255,179,26,0))", animation: "qScan 4.5s ease-in-out infinite", pointerEvents: "none", ["--scan" as string]: `${travel}px` }} />;
}

export function Caret() {
  return <span aria-hidden="true" style={{ display: "inline-block", width: 2, height: "1.1em", background: "#00827E", verticalAlign: "-3px", marginInlineStart: 2, animation: "qCaret 1s step-end infinite" }} />;
}

export function Journey({ nodes }: { nodes: [string, string, string][] }) {
  return (
    <div style={{ position: "relative", display: "flex", flexDirection: "column", gap: 30, padding: "4px 0" }}>
      <div style={{ position: "absolute", insetInlineStart: 27, top: 30, bottom: 30, width: 4, borderRadius: 2, background: "repeating-linear-gradient(180deg,rgba(255,255,255,.35) 0 8px,transparent 8px 16px)" }} />
      <div style={{ position: "absolute", insetInlineStart: 21, top: 26, width: 16, height: 16, borderRadius: 8, background: SAF, boxShadow: "0 0 0 6px rgba(255,179,26,.25)", animation: "qTravel 4s cubic-bezier(.45,0,.25,1) infinite" }} />
      {nodes.map((n, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, position: "relative" }}>
          <div style={{ width: 58, height: 64, borderRadius: "29px 29px 12px 12px", background: n[2], boxShadow: "0 5px 0 rgba(0,0,0,.3)", display: "flex", alignItems: "center", justifyContent: "center", font: "900 20px/1 var(--font-latin)", color: i === 3 ? INK : "#FFFFFF", animation: `qNode 4s ease-in-out ${i}s infinite`, flex: "none" }}>{i + 1}</div>
          <div>
            <div style={{ font: "800 17px/1.2 var(--font-latin)", color: "#FFFFFF" }}>{n[0]}</div>
            <div style={{ font: "600 13px/1.4 var(--font-latin)", color: "#BDB6D9" }}>{n[1]}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

/** Six stars fly out of the chosen tile, once. */
export function StarBurst() {
  const stars = [
    { x: -70, y: -80, s: 30, r: -30, sc: 1, d: 0 },
    { x: 10, y: -110, s: 36, r: 20, sc: 1.2, d: 0.05 },
    { x: 80, y: -70, s: 28, r: 40, sc: 0.9, d: 0.1 },
    { x: -70, y: -80, s: 22, r: -30, sc: 1, d: 0.3 },
    { x: 80, y: -70, s: 20, r: 40, sc: 0.9, d: 0.35 },
    { x: 10, y: -110, s: 18, r: 20, sc: 1.2, d: 0.4 },
  ];
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }} aria-hidden="true">
      {stars.map((st, i) => (
        <svg key={i} viewBox="0 0 24 24" width={st.s} height={st.s} style={{ position: "absolute", left: "50%", top: "50%", marginLeft: -st.s / 2, marginTop: -st.s / 2, animation: `uStar 900ms ease-out ${st.d}s both`, ["--sx" as string]: `${st.x}px`, ["--sy" as string]: `${st.y}px`, ["--ss" as string]: st.sc, ["--sr" as string]: `${st.r}deg` }}>
          <path d={STAR_D} fill={SAF} stroke="#FFFFFF" strokeWidth={1.5} strokeLinejoin="round" />
        </svg>
      ))}
    </div>
  );
}

export function BigStar({ s = 96 }: { s?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={s} height={s} style={{ overflow: "visible", animation: "uStarBig 900ms cubic-bezier(.3,1.4,.5,1) .25s both" }} aria-hidden="true">
      <path d={STAR_D} fill={SAF} stroke="#FFFFFF" strokeWidth={1.3} strokeLinejoin="round" />
    </svg>
  );
}

export function Transfer({ running = true }: { running?: boolean }) {
  const phone = (c: string) => (
    <div style={{ width: 54, height: 90, borderRadius: 14, background: c, boxShadow: "0 5px 0 rgba(0,0,0,.25)", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
      <div style={{ width: 22, height: 26, borderRadius: "11px 11px 5px 5px", background: SAF }} />
    </div>
  );
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }} aria-hidden="true">
      {phone("#00827E")}
      <div style={{ position: "relative", width: 150, height: 90 }}>
        {running && [0, 0.4, 0.8, 1.2].map((d, i) => (
          <div key={i} style={{ position: "absolute", insetInlineStart: 0, top: 38, width: 14, height: 14, borderRadius: 4, background: i % 2 ? "#FFFFFF" : SAF, animation: `qHop 1.6s linear ${d}s infinite` }} />
        ))}
      </div>
      {phone("#7443F0")}
    </div>
  );
}

export function Spinner({ c = "#FFFFFF" }: { c?: string }) {
  return <div aria-hidden="true" style={{ width: 20, height: 20, borderRadius: 10, border: "3px solid rgba(255,255,255,.3)", borderTopColor: c, boxSizing: "border-box", animation: "qSpin .8s linear infinite" }} />;
}

/** Decorative QR from the design, used only where a real code is not needed. */
export function QrArt({ seed, size }: { seed: string; size: number }) {
  const cells = useMemo(() => {
    const r = rng(seed), n = 25, out: React.JSX.Element[] = [];
    const inF = (x: number, y: number) => (x < 8 && y < 8) || (x > n - 9 && y < 8) || (x < 8 && y > n - 9);
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (!inF(x, y) && r() < 0.5) out.push(<rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} />);
    return out;
  }, [seed]);
  const fd = (x: number, y: number) => (
    <g key={`${x}.${y}`}><rect x={x} y={y} width={7} height={7} rx={1.4} /><rect x={x + 1} y={y + 1} width={5} height={5} rx={0.9} fill="#FFFFFF" /><rect x={x + 2} y={y + 2} width={3} height={3} rx={0.7} /></g>
  );
  return (
    <svg viewBox="-1 -1 27 27" width={size} height={size} style={{ display: "block" }} aria-hidden="true">
      <g fill={INK}>{cells}{fd(0, 0)}{fd(18, 0)}{fd(0, 18)}</g>
    </svg>
  );
}
