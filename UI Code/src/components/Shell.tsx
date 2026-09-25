import { createContext, useContext } from "react";
import { BottomNav, SideNav, type DoorHandlers, type Tab } from "./Nav";
import { DoorSheet, useSecondDoor } from "./SecondDoor";
import { Chat } from "./Chat";
import { useReading } from "../state/app";
import { useLang } from "../lib/i18n";

type Door = { handlers: DoorHandlers; charging: boolean };
const DoorCtx = createContext<Door | null>(null);
export const useDoor = () => useContext(DoorCtx);

/** One app, two layouts. Under 1024 px: bottom nav, one column. From 1024 px:
 *  side nav, content on a 44 px margin, and Ustad as a permanent right panel. */
export function Tabbed({ tab, panel = true, children }: { tab: Tab | null; panel?: boolean; children: React.ReactNode }) {
  const door = useSecondDoor();
  const reading = useReading();
  const { dir } = useLang();
  return (
    <DoorCtx.Provider value={{ handlers: door.handlers, charging: door.charging }}>
      <div className="shell with-nav" dir={dir}>
        <SideNav active={tab} onDoorPress={door.handlers} />
        <main className="shell-main">{children}</main>
        {panel && (
          <aside className="ustad-panel" aria-label="Ustad" style={{ background: "#FFF8EF", borderInlineStart: "2px solid #F3ECE2", flexDirection: "column" }}>
            <Chat lessonId={reading?.lesson.id ?? ""} variant="panel" />
          </aside>
        )}
        <BottomNav active={tab} />
      </div>
      {door.open && <DoorSheet onClose={() => door.setOpen(false)} />}
    </DoorCtx.Provider>
  );
}

/** Full-screen flows (lesson, quiz, voice, letters): no nav. */
export function Full({ children, bg = "#FFF8EF" }: { children: React.ReactNode; bg?: string }) {
  const { dir } = useLang();
  return (
    <div dir={dir} className="screen" style={{ minHeight: "100dvh", background: bg }}>
      {children}
    </div>
  );
}
