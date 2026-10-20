"use client";
// The browser's view of the ClearSettle session (D-SEC-11, D-SEC-13, D-UI-13). The server decides everything:
// this only reflects it. It learns the user from GET /api/me, the limits from GET /api/session, counts idle
// time from the last request the server answered, warns before the limits, returns the user to the page they
// asked for after sign-in, and shares activity and sign-outs between this user's tabs. It never polls.

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { api, onApiResponse } from "./api";
import { rememberReturnTo, takeReturnTo } from "./returnTo.mjs";
import { sessionLimits, sessionPhase } from "./sessionClock.mjs";

const SessionContext = createContext(null);
const CHANNEL = "clearsettle-session";
const SIGNED_OUT_FLAG = "cs.signedOut";

function storage() {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function stripTrailingSlash(path) {
  return path.length > 1 ? path.replace(/\/+$/, "") : path;
}

export function SessionProvider({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  // status: loading | signed-in | signed-out. reason (signed-out): null, idle, absolute, expired, signed-out,
  // signed-out-everywhere.
  const [state, setState] = useState({ status: "loading" });
  const [phase, setPhase] = useState({ phase: "active", endsAt: null });
  const stateRef = useRef(state);
  const limits = useRef(null);
  const lastActivity = useRef(0);
  const ending = useRef(false);
  const channel = useRef(null);

  const update = useCallback((next) => {
    stateRef.current = next;
    setState(next);
  }, []);

  const end = useCallback((reason, extra = {}) => {
    ending.current = true;
    limits.current = null;
    update({ status: "signed-out", reason, ...extra });
  }, [update]);

  const recompute = useCallback(() => {
    if (!limits.current || stateRef.current.status !== "signed-in") return;
    const p = sessionPhase(limits.current, lastActivity.current, Date.now());
    if (p.phase === "idle-expired" || p.phase === "absolute-expired") {
      end(p.phase === "idle-expired" ? "idle" : "absolute");
      return;
    }
    setPhase((prev) => (prev.phase === p.phase && prev.endsAt === p.endsAt ? prev : p));
  }, [end]);

  const load = useCallback(async () => {
    const [me, session] = await Promise.all([api("/api/me"), api("/api/session")]);
    if (me.status !== 200 || session.status !== 200) {
      // The server says when the 8-hour limit ended the session (on whichever request reached it first); a
      // missing session can't be told apart from never having signed in.
      const limit = [me, session].some((r) => r.status === 401 && r.data && r.data.error === "session_expired");
      let reason = limit ? "absolute" : null;
      const s = storage();
      try {
        if (s && s.getItem(SIGNED_OUT_FLAG)) reason = s.getItem(SIGNED_OUT_FLAG);
        if (s) s.removeItem(SIGNED_OUT_FLAG);
      } catch {
        // ignore
      }
      update({ status: "signed-out", reason, unreachable: me.status === 0 || me.status >= 500 });
      return;
    }
    ending.current = false;
    limits.current = sessionLimits(session.data, session.serverDate, session.receivedAt);
    lastActivity.current = session.receivedAt;
    const s = storage();
    const target = s ? takeReturnTo(s) : null;
    const here = window.location.pathname + window.location.search;
    // Sign-in always lands on the overview, so only there does the remembered page apply. Anywhere else (the
    // return from a step-up to its review page, a bookmark) the page the user is on wins.
    if (target && window.location.pathname === "/" && target !== here) {
      update({ status: "signed-in", me: me.data, redirectTo: target });
      router.replace(target);
    } else {
      update({ status: "signed-in", me: me.data, redirectTo: null });
    }
    setPhase(sessionPhase(limits.current, lastActivity.current, Date.now()));
  }, [router, update]);

  useEffect(() => {
    load();
  }, [load]);

  // Arrived at the page the user asked for: show it.
  useEffect(() => {
    const s = stateRef.current;
    if (s.status === "signed-in" && s.redirectTo) {
      const target = stripTrailingSlash(new URL(s.redirectTo, window.location.origin).pathname);
      if (stripTrailingSlash(pathname) === target) update({ ...s, redirectTo: null });
    }
  }, [pathname, state, update]);

  // Every answered request resets the server's idle timer; a refused one means the session has ended.
  useEffect(() => onApiResponse(({ status, error, receivedAt }) => {
    if (ending.current || stateRef.current.status !== "signed-in") return;
    if (status === 401 && (error === "unauthenticated" || error === "session_expired")) {
      end(error === "session_expired" ? "absolute" : "expired");
      return;
    }
    if (status > 0 && status < 500) {
      lastActivity.current = Math.max(lastActivity.current, receivedAt);
      if (channel.current) channel.current.postMessage({ type: "activity", at: receivedAt });
      recompute();
    }
  }), [end, recompute]);

  // Share activity and sign-outs with this user's other tabs (they share one session).
  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return undefined;
    const ch = new BroadcastChannel(CHANNEL);
    channel.current = ch;
    ch.onmessage = (e) => {
      const msg = e.data || {};
      if (msg.type === "activity" && typeof msg.at === "number") {
        lastActivity.current = Math.max(lastActivity.current, msg.at);
        recompute();
      } else if (msg.type === "signed-out" && stateRef.current.status === "signed-in") {
        end(msg.reason === "signed-out-everywhere" ? "signed-out-everywhere" : "signed-out");
      }
    };
    return () => {
      ch.close();
      channel.current = null;
    };
  }, [end, recompute]);

  // The session clock: local arithmetic once a second while signed in, never a request.
  useEffect(() => {
    if (state.status !== "signed-in") return undefined;
    const t = setInterval(recompute, 1000);
    return () => clearInterval(t);
  }, [state.status, recompute]);

  const signIn = useCallback(() => {
    const s = storage();
    if (s) rememberReturnTo(window.location.pathname + window.location.search, s);
    window.location.assign("/oauth2/authorization/keycloak");
  }, []);

  /** Makes one request, which resets the server's idle timer. Cannot extend the 8-hour limit. */
  const staySignedIn = useCallback(async () => {
    const r = await api("/api/session");
    if (r.status === 200 && limits.current) {
      limits.current = sessionLimits(r.data, r.serverDate, r.receivedAt);
      recompute();
    }
    return r.status === 200;
  }, [recompute]);

  const signOut = useCallback(async () => {
    const r = await api("/logout", { method: "POST" });
    if (channel.current) channel.current.postMessage({ type: "signed-out", reason: "signed-out" });
    const providerLogoutUrl = r.data && r.data.providerLogoutUrl;
    if (r.status === 200 && typeof providerLogoutUrl === "string" && /^https?:\/\//.test(providerLogoutUrl)) {
      try {
        storage()?.setItem(SIGNED_OUT_FLAG, "signed-out");
      } catch {
        // ignore
      }
      ending.current = true;
      window.location.assign(providerLogoutUrl); // ends the identity provider's session too
      return;
    }
    end("signed-out");
  }, [end]);

  const signOutEverywhere = useCallback(async () => {
    const r = await api("/api/session/logout-everywhere", { method: "POST" });
    if (r.status !== 200) return { ok: false, status: r.status };
    if (channel.current) channel.current.postMessage({ type: "signed-out", reason: "signed-out-everywhere" });
    end("signed-out-everywhere", { deletedSessions: r.data && r.data.deletedSessions });
    return { ok: true };
  }, [end]);

  const value = useMemo(() => ({
    ...state,
    phase: phase.phase,
    endsAt: phase.endsAt,
    limits: limits.current,
    signIn,
    staySignedIn,
    signOut,
    signOutEverywhere,
    reload: load,
  }), [state, phase, signIn, staySignedIn, signOut, signOutEverywhere, load]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const s = useContext(SessionContext);
  if (!s) throw new Error("useSession outside SessionProvider");
  return s;
}
