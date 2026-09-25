import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "./Icon";
import { Press } from "./ui";
import { useLang } from "../lib/i18n";
import type { IconName } from "../lib/icons";
import { Bar } from "./ui";
import { storage, type Storage } from "../native/bridge";
import { installedGrades } from "../content/library";
import { useApp } from "../state/app";

/** Space used by the books on this device and what is left on the disk. */
function StorageLine() {
  const { m, num } = useLang();
  const [s, setS] = useState<Storage | null>(null);
  useEffect(() => { storage().then(setS).catch(() => {}); }, []);
  const grades = installedGrades().length;
  const mb = s ? Math.round(s.contentBytes / 1048576) : 0;
  const free = s?.freeBytes != null ? s.freeBytes / 1073741824 : null;
  const pct = s && free !== null ? Math.max(2, Math.min(100, (s.contentBytes / (s.contentBytes + s.freeBytes!)) * 100)) : 2;
  return (
    <>
      <div style={{ display: "flex" }}><Bar pct={pct} h={8} bg="#E6DCCD" fill="#00827E" /></div>
      <div style={{ font: "600 12px/1.4 var(--font-latin)", color: "#6F6A88" }}>
        {m({ en: `${grades} grade${grades === 1 ? "" : "s"} · ${mb} MB`, fa: `${num(grades)} صنف · ${num(mb)} MB` })}
        {free !== null && m({ en: ` · ${free.toFixed(1)} GB free`, fa: ` · ${num(Math.round(free * 10) / 10)} GB خالی` })}
      </div>
    </>
  );
}

export type Tab = "home" | "library" | "ask" | "practice" | "me" | "rights";
const PATH: Record<Tab, string> = { home: "/", library: "/library", ask: "/ask", practice: "/practice", me: "/me", rights: "/rights" };

/** Bottom nav (phones and tablets): Home · Library · Ask · Practice · Me. */
export function BottomNav({ active }: { active: Tab | null }) {
  const { t, lang, dir } = useLang();
  const go = useNavigate();
  const fa = lang !== "en";
  const item = (k: Exclude<Tab, "ask">) => {
    const on = k === active;
    const color = on ? "#00827E" : "#6F6A88";
    return (
      <button key={k} onClick={() => go(PATH[k])} aria-current={on ? "page" : undefined} className="press flat" style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, minHeight: 56 }}>
        <div style={{ width: 56, height: 32, borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", background: on ? "#E3F7F4" : "transparent", transition: "background-color 160ms" }}>
          <Icon n={k as IconName} s={24} c={color} f={on ? "#BFEDE8" : "none"} />
        </div>
        <div style={{ fontSize: fa ? 13 : 12, lineHeight: "16px", fontWeight: on ? 800 : 600, color, fontFamily: fa ? "var(--font-rtl)" : "var(--font-latin)" }}>{t("nav" + k[0].toUpperCase() + k.slice(1))}</div>
      </button>
    );
  };
  return (
    <nav className="bottom-nav" aria-label="Main">
      <div dir={dir} style={{ height: 80, background: "#FFFFFF", borderTop: "1px solid #ECE5D8", display: "flex", alignItems: "flex-start", padding: "8px 4px 0" }}>
        {item("home")}
        {item("library")}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, marginTop: -24 }}>
          <Press onClick={() => go("/ask")} aria-label={t("askUstad")} aria-current={active === "ask" ? "page" : undefined} style={{ width: 60, height: 64, borderRadius: "30px 30px 16px 16px", background: active === "ask" ? "#9A1240" : "#D81E57", boxShadow: "0 5px 0 #9A1240", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon n="ask" s={28} c="#FFFFFF" w={2.4} />
          </Press>
          <div style={{ fontSize: fa ? 13 : 12, lineHeight: "16px", fontWeight: 800, color: "#D81E57", fontFamily: fa ? "var(--font-rtl)" : "var(--font-latin)" }}>{t("navAsk")}</div>
        </div>
        {item("practice")}
        {item("me")}
      </div>
    </nav>
  );
}

/** Side nav (from 1024 px): 240 px, pomegranate "Ask Ustad", storage card. */
export function SideNav({ active, onDoorPress }: { active: Tab | null; onDoorPress?: DoorHandlers }) {
  const { t, lang } = useLang();
  const { name } = useApp();
  const go = useNavigate();
  const fa = lang !== "en";
  const link = (k: Tab, label: string) => {
    const on = k === active;
    return (
      <button key={k} onClick={() => go(PATH[k])} aria-current={on ? "page" : undefined} className="press flat" style={{ height: 50, borderRadius: 14, background: on ? "#E3F7F4" : "transparent", display: "flex", alignItems: "center", gap: 12, padding: "0 14px", font: `${on ? 800 : 700} 16px/1 ${fa ? "var(--font-rtl)" : "var(--font-latin)"}`, color: on ? "#00827E" : "#4E4868", width: "100%", transition: "background-color 160ms" }}>
        <Icon n={k === "ask" ? "ask" : k === "rights" ? "heart" : (k as IconName)} s={22} c={on ? "#00827E" : "#6F6A88"} f={on ? "#BFEDE8" : "none"} />
        {label}
      </button>
    );
  };
  return (
    <aside className="side-nav" aria-label="Main" style={{ background: "#FFFFFF", borderInlineEnd: "2px solid #F3ECE2", flexDirection: "column", padding: "28px 14px 20px", gap: 6 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 12px 24px" }}>
        <DoorDot handlers={onDoorPress} size={14} ring={5} />
        <div style={{ font: `700 15px/1.3 ${fa ? "var(--font-rtl)" : "var(--font-latin)"}`, color: "#4E4868" }}>{greeting(lang)}{name ? (fa ? ` ${name} جان` : `, ${name}`) : ""}</div>
      </div>
      {link("home", t("navHome"))}
      {link("library", t("navLibrary"))}
      {link("practice", t("navPractice"))}
      {link("me", t("navMyLearning"))}
      {link("rights", t("navRights"))}
      <Press onClick={() => go("/ask")} style={{ marginTop: 10, height: 56, borderRadius: 16, background: "#D81E57", boxShadow: "0 5px 0 #9A1240", display: "flex", alignItems: "center", gap: 12, padding: "0 16px", font: `800 16px/1 ${fa ? "var(--font-rtl)" : "var(--font-latin)"}`, color: "#FFFFFF", width: "100%" }}>
        <Icon n="ask" s={22} c="#FFFFFF" w={2.4} />
        {t("askUstad")}
      </Press>
      <div style={{ flex: 1 }} />
      <button onClick={() => go("/packs")} className="press flat" style={{ background: "#F3ECE2", borderRadius: 16, padding: 14, display: "flex", flexDirection: "column", gap: 10, textAlign: "start" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, font: "800 13px/1 var(--font-latin)", color: "#005F5B" }}><Icon n="ondevice" s={16} c="#005F5B" w={2.4} />{t("offlineAllHere")}</div>
        <StorageLine />
      </button>
    </aside>
  );
}

export function greeting(lang: string): string {
  const h = new Date().getHours();
  if (lang !== "en") return h < 12 ? "صبح بخیر" : h < 17 ? "روز بخیر" : "شب بخیر";
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

/* ── the saffron light: long-press 1 s opens the second door ────── */

export type DoorHandlers = {
  onPointerDown: (e: React.PointerEvent) => void;
  onPointerUp: () => void;
  onPointerLeave: () => void;
  onPointerCancel: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
};

export function DoorDot({ handlers, size = 14, ring = 5, strong }: { handlers?: DoorHandlers; size?: number; ring?: number; strong?: boolean }) {
  // Never labelled, never announced. The hit area is still 44 px.
  return (
    <div {...handlers} aria-hidden="true" style={{ width: 44, height: 44, margin: -15, display: "flex", alignItems: "center", justifyContent: "center", flex: "none", touchAction: "none", WebkitTouchCallout: "none", userSelect: "none" } as React.CSSProperties}>
      <div style={{ width: size, height: size, borderRadius: size / 2, background: "#FFB31A", boxShadow: strong ? "0 0 0 10px rgba(255,179,26,.35),0 0 0 20px rgba(255,179,26,.15)" : `0 0 0 ${ring}px rgba(255,179,26,.25)`, transition: "box-shadow 600ms var(--ease-settle)" }} />
    </div>
  );
}
