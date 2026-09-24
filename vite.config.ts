import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

/** Hard offline contract, written into every shipped build: nothing may be
 *  loaded from, or sent to, a network. (Left out of `vite dev` only so the
 *  local hot-reload socket can connect while we work.) */
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'wasm-unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "media-src 'self' blob:",
  "connect-src 'none'",
  "form-action 'none'",
  "frame-src 'none'",
  "object-src 'none'",
  "base-uri 'none'",
].join("; ");

function offlineCsp(): Plugin {
  return {
    name: "ustad-offline-csp",
    apply: "build",
    transformIndexHtml: (html) => html.replace("<head>", `<head>\n    <meta http-equiv="Content-Security-Policy" content="${CSP}" />`),
  };
}

export default defineConfig({
  base: "./",
  plugins: [react(), offlineCsp()],
  build: { target: "es2020", assetsInlineLimit: 0, chunkSizeWarningLimit: 1500 },
  server: { port: 5173 },
});
