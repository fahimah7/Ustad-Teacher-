import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { devBackend } from "./vite.backend.ts";

/** Hard offline contract, written into every shipped build: nothing may be loaded from, or sent
 *  to, a network. The only doors are the app's own: Tauri IPC (ipc:) to the native side, and the
 *  `book:` scheme that serves page images of the books on the device. Same policy as
 *  src-tauri/tauri.conf.json. (Left out of `vite dev` so hot reload can connect.) */
const CSP = [
  "default-src 'self' ipc: http://ipc.localhost",
  "script-src 'self' 'wasm-unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: book: http://book.localhost",
  "font-src 'self' data:",
  "media-src 'self' blob:",
  "connect-src ipc: http://ipc.localhost",
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
  plugins: [react(), offlineCsp(), devBackend()],
  build: { target: "es2020", assetsInlineLimit: 0, chunkSizeWarningLimit: 1500 },
  server: { port: 5173, strictPort: true },
  test: { environment: "node", include: ["src/**/*.test.ts"] },
} as Parameters<typeof defineConfig>[0]);
