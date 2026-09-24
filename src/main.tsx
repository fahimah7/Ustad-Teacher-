import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { installNetworkGuard } from "./lib/net-guard";
import "./styles/tokens.css";
import "./styles/animations.css";
import "./styles/base.css";
import { App } from "./App";

installNetworkGuard();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
