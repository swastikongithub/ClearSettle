"use client";
// Security and sessions (AC-163, D-SEC-13, D-SEC-17, D-SEC-18). Everything shown comes from GET /api/me and
// GET /api/session, read when the page opens; nothing is inferred. The gaps that are not built yet (ending
// sessions when an authenticator is reset, a list of signed-in devices) are stated, not hidden.

import { useCallback, useEffect, useState } from "react";
import { api } from "../lib/api";
import { formatDateTime, formatTime } from "../lib/format.mjs";
import { useSession } from "../lib/session";
import Icon from "./Icon";
import SignOutEverywhereDialog from "./SignOutEverywhereDialog";
import s from "./page.module.css";

function readiness(freshAuth) {
  const reasons = (freshAuth && freshAuth.reasons) || [];
  if (freshAuth && freshAuth.ok) {
    return { kind: "ok", icon: "check", state: "ready",
      text: "Your sign-in is less than 5 minutes old, so you can confirm a sensitive action now without verifying again." };
  }
  if (reasons.length > 0 && reasons.every((r) => r === "auth_time_too_old")) {
    return { kind: "info", icon: "clock", state: "verify-first",
      text: "Your sign-in is more than 5 minutes old, so you’ll verify with your password and a code before a sensitive action runs. This is expected." };
  }
  return { kind: "warn", icon: "warn", state: "verify-first", reasons,
    text: "Your sign-in doesn’t carry the evidence ClearSettle needs for sensitive actions, so you’ll be asked to verify again before one runs." };
}

export default function SecurityOverview() {
  const session = useSession();
  const [view, setView] = useState({ status: "loading" });
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const load = useCallback(async () => {
    setView((v) => (v.status === "ready" ? { ...v, refreshing: true } : { status: "loading" }));
    const [me, limits] = await Promise.all([api("/api/me"), api("/api/session")]);
    if (me.status === 200 && limits.status === 200) {
      setView({ status: "ready", me: me.data, limits: limits.data, checkedAt: me.receivedAt });
    } else if (me.status !== 401 && limits.status !== 401) {
      // A 401 ends the session; the shell then shows the sign-in screen.
      setView({ status: "error" });
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (view.status === "loading") {
    return (
      <div className={s.stack} aria-busy="true" data-state="loading">
        <section className={`${s.panel} ${s.loading}`}>
          <p className={s.panelText} role="status">Loading your session details&hellip;</p>
        </section>
      </div>
    );
  }

  if (view.status === "error") {
    return (
      <div className={s.stack} data-state="error">
        <div className="msg msg-error" role="alert">
          <Icon name="warn" />
          <div className={s.msgBody}>
            <p>Your session details couldn&rsquo;t be loaded. Check your connection and try again.</p>
            <div className={s.actions}>
              <button type="button" className="btn" onClick={load}>Try again</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const { me, limits } = view;
  const fresh = readiness(me.freshAuth);
  const idleMinutes = Math.round(limits.idleTimeoutSeconds / 60);
  const signedInAt = typeof me.sessionAuthenticatedAt === "number" ? new Date(me.sessionAuthenticatedAt * 1000) : null;
  const endsBy = limits.absoluteExpiresAt > 0 ? new Date(limits.absoluteExpiresAt * 1000) : null;

  const signOut = async () => {
    setSigningOut(true);
    await session.signOut();
    setSigningOut(false);
  };

  return (
    <div className={s.stack} data-state="ready">
      <section className={s.panel} aria-labelledby="this-session">
        <div className={s.panelHead}>
          <h2 className={s.panelTitle} id="this-session">This session</h2>
        </div>
        <div className={s.panelBody}>
          <dl className={s.facts}>
            <dt>Signed in as</dt>
            <dd id="session-email">{me.email || "No email address on your account"}</dd>
            <dt>Signed in</dt>
            <dd className="num">{signedInAt ? formatDateTime(signedInAt) : "Not recorded"}</dd>
            <dt>Verified with</dt>
            <dd>{me.acr === "mfa" ? "Your password and a code from your authenticator app" : "Your password"}</dd>
            <dt>Signs you out</dt>
            <dd>
              After {idleMinutes} minutes without activity, and at{" "}
              <span className="num" id="session-ends">{endsBy ? formatDateTime(endsBy) : "the 8-hour limit"}</span> at the latest
            </dd>
          </dl>
          <p className={s.panelText}>
            Sign out everywhere ends your ClearSettle sessions in every browser and on every device, including this
            one. Use it if you&rsquo;ve lost a device or signed in on a computer you don&rsquo;t control.
          </p>
          <div className={s.actions}>
            <button type="button" id="sign-out" className="btn" onClick={signOut} disabled={signingOut}>
              <Icon name="signout" />{signingOut ? "Signing out…" : "Sign out"}
            </button>
            <button type="button" id="sign-out-everywhere" className="btn" onClick={() => setConfirmOpen(true)}>
              <Icon name="devices" />Sign out everywhere&hellip;
            </button>
          </div>
        </div>
      </section>

      <section className={s.panel} aria-labelledby="sensitive-actions" data-step-up={fresh.state}>
        <div className={s.panelHead}>
          <h2 className={s.panelTitle} id="sensitive-actions">Sensitive actions</h2>
          <p className={s.panelNote}>
            Checked at <span className="num">{formatTime(new Date(view.checkedAt))}</span>
          </p>
          <button type="button" className={`btn btn-quiet ${s.headAction}`} onClick={load} disabled={view.refreshing}>
            {view.refreshing ? "Checking…" : "Check again"}
          </button>
        </div>
        <div className={s.panelBody}>
          <p className={s.panelText}>
            Some actions, such as posting a journal, ask you to verify again first. ClearSettle shows you exactly what
            will happen, and the action runs only when you confirm it. If anything it depends on changes after you
            review it, it&rsquo;s refused and nothing runs. No action in this build needs it yet; posting journals will
            be the first.
          </p>
          <div className={`msg msg-${fresh.kind}`} role="status">
            <Icon name={fresh.icon} />
            <div className={s.msgBody}>
              <p>{fresh.text}</p>
              {fresh.reasons && fresh.reasons.length > 0 && (
                <p>Reference: {fresh.reasons.map((r) => <span key={r} className="ref">{r} </span>)}</p>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className={s.panel} aria-labelledby="lost-authenticator">
        <div className={s.panelHead}>
          <h2 className={s.panelTitle} id="lost-authenticator">If you lose your authenticator app</h2>
        </div>
        <div className={s.panelBody}>
          <p className={s.panelText}>
            Contact your administrator. ClearSettle has no self-service reset, so someone with access to your email
            alone can&rsquo;t take over your account. If a lost device is still signed in, sign out everywhere from
            another device that is signed in.
          </p>
          <div className="msg msg-warn" data-gap="session-revocation">
            <Icon name="info" />
            <div className={s.msgBody}>
              <p className={s.msgTitle}>Not available yet</p>
              <ul className={s.msgList}>
                <li>
                  Resetting your authenticator doesn&rsquo;t yet end the sessions that are already signed in. Until it
                  does, your administrator has to ask the operator to end them.
                </li>
                <li>This page doesn&rsquo;t list your signed-in browsers and devices. Sign out everywhere ends all of them at once.</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <SignOutEverywhereDialog open={confirmOpen} onOpenChange={setConfirmOpen} />
    </div>
  );
}
