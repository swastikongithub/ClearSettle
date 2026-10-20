"use client";
// Shown in place of any page when there is no session (D-UI-12). The credentials themselves are entered on the
// identity provider’s pages; this screen explains what happened and starts the sign-in, remembering the page so
// the user returns to it. Sign-in errors arrive from the backend as ?auth_error=<code> (D-SEC-16).

import { useEffect, useState } from "react";
import { useSession } from "../lib/session";
import { Brand } from "./Brand";
import Icon from "./Icon";
import s from "./signin.module.css";

// Why the session ended (set by this browser).
const ENDED = {
  idle: { title: "You were signed out", kind: "info", icon: "clock",
    text: "Your session ended after 15 minutes without activity. Nothing you had not saved was submitted." },
  absolute: { title: "Your session has ended", kind: "info", icon: "clock",
    text: "Sessions end 8 hours after sign-in. Sign in again to continue where you were." },
  expired: { title: "You were signed out", kind: "info", icon: "info",
    text: "Your session has ended. Sign in again to continue where you were." },
  "signed-out": { title: "You signed out", kind: null },
  "signed-out-everywhere": { title: "You signed out everywhere", kind: "info", icon: "devices",
    text: "Your ClearSettle sessions in every browser and on every device have ended." },
};

// Sign-in refusals from the backend (LoginHandlers). Unknown codes get the generic message.
const REFUSED = {
  mfa_not_verified: { id: "auth-help", title: "Your authenticator app is set up", kind: "info", icon: "shield",
    text: "For your security, sign in once more and enter a code from the app you just set up." },
  mfa_required: { kind: "error", icon: "warn",
    text: "That sign-in didn’t include a code from your authenticator app, so it wasn’t accepted. Sign in with your password and a code." },
  account_disabled: { kind: "error", icon: "lock", text: "This account is disabled. Contact your administrator." },
  reauth_user_mismatch: { kind: "error", icon: "warn",
    text: "You verified with a different account from the one that started the action, so nothing ran and you were signed out. Sign in with your own account." },
  session_expired: { kind: "info", icon: "clock",
    text: "Your session ended before you finished verifying, so nothing ran. Sign in and start the action again." },
};
// Provider and protocol errors shown as a support reference. Only these codes are ever displayed.
const KNOWN_FAILURES = new Set(["access_denied", "authentication_failed", "authorization_request_not_found", "invalid_id_token",
  "invalid_nonce", "invalid_request", "invalid_state_parameter", "invalid_token_response", "server_error", "temporarily_unavailable"]);

export default function SignInScreen() {
  const session = useSession();
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    setAuthError(new URLSearchParams(window.location.search).get("auth_error"));
  }, []);

  if (session.unreachable) {
    return (
      <div className={s.screen} data-session="unreachable">
        <div className={s.field} aria-hidden="true" />
        <main className={s.column}>
          <div className={s.card}>
            <Brand />
            <h1 className={s.title}>ClearSettle can&rsquo;t be reached</h1>
            <p className="msg msg-error" role="alert">
              The server didn&rsquo;t respond, so we can&rsquo;t tell whether you&rsquo;re signed in. Check your connection and try again.
            </p>
            <button type="button" className={`btn btn-primary btn-large ${s.primary}`} onClick={() => session.reload()}>Try again</button>
          </div>
        </main>
      </div>
    );
  }

  const ended = session.reason ? ENDED[session.reason] : null;
  const refused = !ended && authError ? REFUSED[authError] || { kind: "error", icon: "warn", generic: true,
    text: "Sign-in didn’t complete. Try again; if it keeps happening, contact your administrator." } : null;
  const message = ended && ended.kind ? ended : refused;
  const title = (ended && ended.title) || (refused && refused.title) || "Sign in to ClearSettle";
  const again = Boolean(ended) || Boolean(refused);

  return (
    <div className={s.screen} data-session="signed-out" data-reason={session.reason || authError || ""}>
      <div className={s.field} aria-hidden="true" />
      <main className={s.column}>
        <div className={s.card}>
          <Brand />
          <h1 className={s.title}>{title}</h1>
          {message && message.text && (
            <div id={message.id} className={`msg msg-${message.kind}`} role={message.kind === "error" ? "alert" : "status"}>
              <Icon name={message.icon} />
              <div>
                <p>{message.text}</p>
                {message.generic && KNOWN_FAILURES.has(authError) && <p className={s.ref}>Reference: <span className="ref">{authError}</span></p>}
              </div>
            </div>
          )}
          <p className={s.lead}>You&rsquo;ll sign in with your password and a code from your authenticator app.</p>
          <button type="button" id="sign-in" className={`btn btn-primary btn-large ${s.primary}`} onClick={() => session.signIn()}>
            {again ? "Sign in again" : "Continue to sign in"}
          </button>
          <p className={s.help}>
            <Icon name="shield" />
            <span>
              Lost your authenticator app? Contact your administrator. ClearSettle has no self-service reset, so access
              to your email alone can&rsquo;t be used to take over your account.
            </span>
          </p>
        </div>
      </main>
    </div>
  );
}
