import type { FigureSpec } from "../content/schema";
import { useLang } from "../lib/i18n";

/** Figures are redrawn from the textbook as our own diagrams; no scan ships. */
export function Figure({ spec, big, color = "#F46A24" }: { spec: FigureSpec; big?: boolean; color?: string }) {
  const { num } = useLang();
  if (spec.kind === "atoms") {
    const ring = big ? 76 : 52, bw = big ? 4 : 3, scale = big ? 1.45 : 1;
    return (
      <div style={{ display: "flex", justifyContent: "space-around" }}>
        {spec.items.map((it, i) => (
          <div key={it.label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: big ? 8 : 6 }}>
            <div style={{ width: ring, height: ring, borderRadius: ring / 2, border: `${bw}px solid ${color}`, display: "flex", alignItems: "center", justifyContent: "center", animation: `uPop 420ms var(--ease-pop) ${200 + i * 120}ms both` }}>
              <div style={{ width: it.nucleus * scale, height: it.nucleus * scale, borderRadius: "50%", background: color }} />
            </div>
            <div style={{ font: `800 ${big ? 14 : 12}px/1 var(--font-latin)`, color: "#1C1433" }}>{it.label}</div>
          </div>
        ))}
      </div>
    );
  }
  if (spec.kind === "fractionBars") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {spec.parts.map((p, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ flex: 1, display: "flex", gap: 3, height: big ? 26 : 20 }}>
              {Array.from({ length: p.d }, (_, j) => (
                <div key={j} style={{ flex: 1, borderRadius: 5, background: j < p.n ? "#00827E" : "#DDF6F3", transformOrigin: "left", animation: `uBarX 420ms var(--ease-settle) ${150 + i * 140 + j * 30}ms both` }} />
              ))}
            </div>
            <div style={{ width: 44, font: "900 15px/1 var(--font-latin)", color: "#1C1433", textAlign: "end" }}>{num(p.n)}⁄{num(p.d)}</div>
          </div>
        ))}
      </div>
    );
  }
  return (
    <div style={{ display: "flex", gap: 6, alignItems: "flex-end", height: 80 }}>
      {Array.from({ length: spec.steps }, (_, i) => (
        <div key={i} style={{ flex: 1, height: `${100 / 2 ** i}%`, borderRadius: "8px 8px 3px 3px", background: color, transformOrigin: "bottom", animation: `qWave 0s, uPop 360ms var(--ease-pop) ${i * 100}ms both` }} />
      ))}
    </div>
  );
}
