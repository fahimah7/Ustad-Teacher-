import { HashRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { AppProvider, useApp } from "./state/app";
import { Home } from "./screens/Home";
import { ChatScreen } from "./screens/ChatScreen";
import { Talk } from "./screens/Talk";
import { AskHub } from "./screens/AskHub";
import { Library } from "./screens/Library";
import { Search } from "./screens/Search";
import { LessonScreen } from "./screens/Lesson";
import { PracticeHub, Quiz } from "./screens/Practice";
import { ChapterDone } from "./screens/ChapterDone";
import { Certificates } from "./screens/Certificates";
import { Packs, restorePacks } from "./screens/Packs";
import { Me } from "./screens/Me";
import { Rights, RightsLesson } from "./screens/Rights";
import { LetterCheck, LetterSent, LetterShare, LetterWrite } from "./screens/Letter";

/** The second door stays shut unless its vault is open in memory. */
function Voice({ children }: { children: React.ReactNode }) {
  const { voiceOpen } = useApp();
  return voiceOpen ? <>{children}</> : <Navigate to="/" replace />;
}

function ScrollTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

restorePacks();

function Routed() {
  const { ready } = useApp();
  if (!ready) return <div style={{ minHeight: "100dvh", background: "#00827E" }} />;
  return (
    <>
      <ScrollTop />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/library" element={<Library />} />
        <Route path="/search" element={<Search />} />
        <Route path="/lesson/:id" element={<LessonScreen />} />
        <Route path="/ask" element={<AskHub />} />
        <Route path="/chat/:id" element={<ChatScreen />} />
        <Route path="/talk/:id" element={<Talk />} />
        <Route path="/practice" element={<PracticeHub />} />
        <Route path="/quiz/:id" element={<Quiz />} />
        <Route path="/done/:id" element={<ChapterDone />} />
        <Route path="/me" element={<Me />} />
        <Route path="/certificates" element={<Certificates />} />
        <Route path="/packs" element={<Packs />} />
        <Route path="/rights" element={<Voice><Rights /></Voice>} />
        <Route path="/rights/a26" element={<Voice><RightsLesson /></Voice>} />
        <Route path="/letter/new" element={<Voice><LetterWrite /></Voice>} />
        <Route path="/letter/:id" element={<Voice><LetterWrite /></Voice>} />
        <Route path="/letter/:id/check" element={<Voice><LetterCheck /></Voice>} />
        <Route path="/letter/:id/share" element={<Voice><LetterShare /></Voice>} />
        <Route path="/letter/:id/sent" element={<Voice><LetterSent /></Voice>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export function App() {
  return (
    <AppProvider>
      <HashRouter>
        <Routed />
      </HashRouter>
    </AppProvider>
  );
}
