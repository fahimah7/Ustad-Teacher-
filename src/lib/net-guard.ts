/**
 * Ustad never talks to a network. Not once, not to check for updates, not for
 * fonts, not for a model. The CSP in index.html already forbids it at the
 * browser level; this closes the same door from inside the bundle, so a
 * mistake in app code fails loudly during development instead of quietly
 * leaking a request from a phone that must not be seen making one.
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

export function installNetworkGuard(): void {
  const w = window as unknown as Record<string, unknown>;
  w.fetch = deny("fetch");
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
