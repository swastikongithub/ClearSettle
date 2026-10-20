// When the session will end, as the browser can know it (AC-162, D-SEC-13). The server ends a session after
// 15 minutes without a request and 8 hours after sign-in; every request resets the idle timer. The browser
// therefore counts from its last successful request and never makes a request on its own: polling would keep
// an unattended session alive and defeat the idle limit.

export const IDLE_WARNING_MS = 2 * 60 * 1000;
export const ABSOLUTE_WARNING_MS = 10 * 60 * 1000;
// The browser's count starts when a response arrives, a little after the server's: it ends a little later too,
// so it never claims the session is alive after the server has ended it. A small margin covers clock jitter.
const MARGIN_MS = 2000;

/**
 * Converts the server's session facts to times on this browser's clock.
 *
 * idleTimeoutSeconds and absoluteExpiresAt (epoch seconds, server clock) come from GET /api/session;
 * serverNowMs is the response's Date header and clientNowMs the browser time when it arrived.
 */
export function sessionLimits({ idleTimeoutSeconds, absoluteExpiresAt }, serverNowMs, clientNowMs) {
  const offset = Number.isFinite(serverNowMs) ? serverNowMs - clientNowMs : 0;
  return {
    idleMs: Math.max(0, idleTimeoutSeconds) * 1000,
    absoluteAt: absoluteExpiresAt > 0 ? absoluteExpiresAt * 1000 - offset : null,
  };
}

/**
 * The session's phase at `now`, given the last request time (both on the browser's clock):
 * "active", "idle-warning", "absolute-warning", "idle-expired" or "absolute-expired".
 * An expiry wins over a warning; the absolute limit wins over the idle one when both apply.
 */
export function sessionPhase(limits, lastActivityAt, now) {
  const idleEndsAt = lastActivityAt + limits.idleMs + MARGIN_MS;
  const absoluteEndsAt = limits.absoluteAt;
  if (absoluteEndsAt !== null && now >= absoluteEndsAt) return { phase: "absolute-expired", endsAt: absoluteEndsAt };
  if (now >= idleEndsAt) return { phase: "idle-expired", endsAt: idleEndsAt };
  if (absoluteEndsAt !== null && absoluteEndsAt <= idleEndsAt && now >= absoluteEndsAt - ABSOLUTE_WARNING_MS) {
    return { phase: "absolute-warning", endsAt: absoluteEndsAt };
  }
  if (now >= idleEndsAt - IDLE_WARNING_MS) return { phase: "idle-warning", endsAt: idleEndsAt };
  if (absoluteEndsAt !== null && now >= absoluteEndsAt - ABSOLUTE_WARNING_MS) {
    return { phase: "absolute-warning", endsAt: absoluteEndsAt };
  }
  return { phase: "active", endsAt: Math.min(idleEndsAt, absoluteEndsAt ?? Infinity) };
}
