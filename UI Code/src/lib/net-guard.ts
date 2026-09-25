/**
 * Ustad never talks to a network. Not once, not to check for updates, not for
 * fonts, not for a model. The CSP already forbids it at the browser level; this
 * closes the same door from inside the bundle, so a mistake in app code fails
 * loudly during development instead of quietly leaking a request from a phone
 * that must not be seen making one.
 *
 * Two local doors stay open: Tauri's IPC to the app's own native side (which
 * only talks to the teacher model on 127.0.0.1), and, in `npm run dev` only,
 * the dev server's /__ustad routes that stand in for that native side.
 */
const BLOCKED = "Ustad is offline by design: network access is disabled.";

type Anyfn = (...args: unknown[]) => unknown;

function deny(name: string): Anyfn {
  return () => {
    const err = new Error(`${BLOCKED} (${name})`);
    // Surfaced in dev, swallowed by callers in production builds.
    if (import.meta.env.DEV) console.error(err);
    throw err;
  };
}

function isLocalDoor(input: unknown): boolean {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input instanceof Request ? input.url : "";
  if (url.startsWith("ipc:") || url.startsWith("http://ipc.localhost/")) return true;
  if (!import.meta.env.DEV) return false;
  try {
    const u = new URL(url, location.href);
    return u.origin === location.origin && u.pathname.startsWith("/__ustad/");
  } catch {
    return false;
  }
}

export function installNetworkGuard(): void {
  const w = window as unknown as Record<string, unknown>;
  const realFetch = window.fetch.bind(window);
  const blocked = deny("fetch");
  w.fetch = (input: RequestInfo | URL, init?: RequestInit) => (isLocalDoor(input) ? realFetch(input, init) : blocked());
  w.XMLHttpRequest = function XMLHttpRequestBlocked() {
    throw new Error(`${BLOCKED} (XMLHttpRequest)`);
  };
  w.WebSocket = function WebSocketBlocked() {
    throw new Error(`${BLOCKED} (WebSocket)`);
  };
  w.EventSource = function EventSourceBlocked() {
    throw new Error(`${BLOCKED} (EventSource)`);
  };
  if ("sendBeacon" in navigator) {
    Object.defineProperty(navigator, "sendBeacon", { value: () => false, configurable: true });
  }
  if ("RTCPeerConnection" in window) {
    w.RTCPeerConnection = function RTCPeerConnectionBlocked() {
      throw new Error(`${BLOCKED} (RTCPeerConnection)`);
    };
  }
}
