import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { installNetworkGuard } from "./lib/net-guard";
import { initLibrary } from "./content/library";
import "./styles/tokens.css";
import "./styles/animations.css";
import "./styles/base.css";
import { App } from "./App";

installNetworkGuard();

// The shelf is read from disk once, before the first screen.
initLibrary().finally(() => {
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});
