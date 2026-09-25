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
import { Packs } from "./screens/Packs";
import { Me } from "./screens/Me";
import { Letters, Rights, RightsLessonScreen, RolePlay } from "./screens/Rights";
import { LetterCheck, LetterSent, LetterShare, LetterWrite } from "./screens/Letter";
import { WelcomeBook, WelcomeGrade, WelcomeName } from "./screens/Welcome";

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

/** Every start begins by asking her name (kept in memory only), then grade and book. */
function Welcomed({ children }: { children: React.ReactNode }) {
  const { name } = useApp();
  const { pathname } = useLocation();
  return name ? <>{children}</> : <Navigate to={`/welcome?next=${encodeURIComponent(pathname)}`} replace />;
}

function Routed() {
  const { ready } = useApp();
  if (!ready) return <div style={{ minHeight: "100dvh", background: "#00827E" }} />;
  const w = (el: React.ReactNode) => <Welcomed>{el}</Welcomed>;
  return (
    <>
      <ScrollTop />
      <Routes>
        <Route path="/welcome" element={<WelcomeName />} />
        <Route path="/welcome/grade" element={<WelcomeGrade />} />
        <Route path="/welcome/book" element={<WelcomeBook />} />
        <Route path="/" element={w(<Home />)} />
        <Route path="/library" element={w(<Library />)} />
        <Route path="/search" element={w(<Search />)} />
        <Route path="/lesson/:id" element={w(<LessonScreen />)} />
        <Route path="/ask" element={w(<AskHub />)} />
        <Route path="/chat/:id" element={w(<ChatScreen />)} />
        <Route path="/talk/:id" element={w(<Talk />)} />
        <Route path="/practice" element={w(<PracticeHub />)} />
        <Route path="/quiz/:id" element={w(<Quiz />)} />
        <Route path="/done/:id" element={w(<ChapterDone />)} />
        <Route path="/me" element={w(<Me />)} />
        <Route path="/certificates" element={w(<Certificates />)} />
        <Route path="/packs" element={w(<Packs />)} />
        <Route path="/rights" element={w(<Rights />)} />
        <Route path="/rights/l/:id" element={w(<RightsLessonScreen />)} />
        <Route path="/rights/practice/:id" element={w(<RolePlay />)} />
        <Route path="/letters" element={<Voice><Letters /></Voice>} />
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
