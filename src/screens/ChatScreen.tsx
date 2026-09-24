import { useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { Chat } from "../components/Chat";
import { Full, Tabbed } from "../components/Shell";
import { useApp } from "../state/app";
import { useDesktop } from "../lib/useMedia";

/** 02/03 Chat with Ustad. Full screen on phones; centred beside the side nav on laptops. */
export function ChatScreen() {
  const { id = "" } = useParams();
  const [params] = useSearchParams();
  const initial = params.get("q") ?? undefined;
  const { update } = useApp();
  const desk = useDesktop();
  useEffect(() => { if (id) update((s) => (s.reading === id ? s : { ...s, reading: id })); }, [id, update]);
  if (desk) {
    return (
      <Tabbed tab="ask" panel={false}>
        <div className="screen" style={{ height: "100dvh", padding: "24px 44px" }}>
          <div style={{ flex: 1, minHeight: 0, maxWidth: 820, width: "100%", margin: "0 auto", borderRadius: 32, overflow: "hidden", boxShadow: "0 7px 0 #E6DCCD", background: "#FFFFFF" }}>
            <Chat lessonId={id} initial={initial} />
          </div>
        </div>
      </Tabbed>
    );
  }
  return (
    <Full>
      <div style={{ height: "100dvh", display: "flex", flexDirection: "column" }}><Chat lessonId={id} initial={initial} /></div>
    </Full>
  );
}
