import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "./Icon";
import { Press } from "./ui";
import { useApp } from "../state/app";
import type { DoorHandlers } from "./Nav";

/** Long-press the saffron light for 1 s. A sheet opens with no title: six dots
 *  and a keypad. The first code ever entered becomes the door's code. A wrong
 *  code simply closes the sheet. Nothing about this is ever labelled. */
export function useSecondDoor() {
  const [open, setOpen] = useState(false);
  const [charging, setCharging] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  const start = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    setCharging(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      setCharging(false);
      navigator.vibrate?.(12);
      setOpen(true);
    }, 1000);
  }, []);
  const cancel = useCallback(() => { window.clearTimeout(timer.current); setCharging(false); }, []);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const handlers: DoorHandlers = {
    onPointerDown: start, onPointerUp: cancel, onPointerLeave: cancel, onPointerCancel: cancel,
    onContextMenu: (e) => e.preventDefault(),
  };
  return { open, setOpen, charging, handlers };
}

/** `to`: where the right code leads (her letters, by default). */
export function DoorSheet({ onClose, to = "/letters" }: { onClose: () => void; to?: string }) {
  const [code, setCode] = useState("");
  const { openVoice } = useApp();
  const go = useNavigate();
  const busy = useRef(false);

  const press = async (d: string) => {
    if (busy.current) return;
    const next = (code + d).slice(0, 6);
    setCode(next);
    if (next.length === 6) {
      busy.current = true;
      const ok = await openVoice(next);
      if (ok) go(to);
      onClose();
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (/^[0-9]$/.test(e.key)) press(e.key);
      else if (e.key === "Backspace") setCode((c) => c.slice(0, -1));
      else if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const key = (d: string) => (
    <Press key={d} ledge={4} onClick={() => press(d)} aria-label={d} style={{ height: 62, borderRadius: 18, background: "#F3ECE2", boxShadow: "0 4px 0 #E6DCCD", display: "flex", alignItems: "center", justifyContent: "center", font: "800 26px/1 var(--font-latin)", color: "#1C1433" }}>{d}</Press>
  );

  return (
    <>
      <div className="scrim" onClick={onClose} />
      <div className="sheet" role="dialog" aria-modal="true" aria-label=" " style={{ padding: "14px 28px 30px", display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div style={{ width: 44, height: 5, borderRadius: 3, background: "#E6DCCD" }} />
        <div style={{ display: "flex", gap: 14, margin: "30px 0 26px" }} aria-hidden="true">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} style={{ width: 16, height: 16, borderRadius: 8, background: i < code.length ? "#7443F0" : "transparent", border: i < code.length ? "0" : "3px solid #D9D0E6", transform: i === code.length - 1 ? "scale(1.15)" : "scale(1)", transition: "transform 160ms var(--ease-pop), background-color 120ms" }} />
          ))}
        </div>
        <div dir="ltr" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, width: "100%" }}>
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map(key)}
          <div />
          {key("0")}
          <button className="press flat" aria-label="Delete" onClick={() => setCode((c) => c.slice(0, -1))} style={{ height: 62, borderRadius: 18, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon n="back" s={26} c="#1C1433" w={2.6} />
          </button>
        </div>
      </div>
    </>
  );
}
