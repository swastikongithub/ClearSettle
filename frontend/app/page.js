"use client";
import { useEffect, useState } from "react";
import { api } from "../lib/api";

// Minimal home: shows authentication status and a sign-in link. Login is initiated by navigating to the
// backend's OIDC authorization endpoint (same origin); the backend owns the flow (D-SEC-11).
export default function Home() {
  const [me, setMe] = useState({ status: "loading" });
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    setAuthError(new URLSearchParams(window.location.search).get("auth_error"));
    api("/api/me").then(setMe);
  }, []);

  return (
    <main>
      <h1>ClearSettle</h1>
      <p id="auth-error">{authError ? `auth_error=${authError}` : "no auth error"}</p>
      {authError === "mfa_not_verified" && (
        // The approved first-login behaviour (D-SEC-14): the sign-in that enrols the authenticator does not
        // itself verify a factor, so no session is created; the next sign-in with a code does.
        <p id="auth-help">
          Your authenticator app is set up. For your security, sign in once more and enter a code from it.
        </p>
      )}
      <p id="me-status">session: {me.status === 200 ? "authenticated" : "not authenticated"}</p>
      <p>
        <a id="login" href="/oauth2/authorization/keycloak">Sign in</a>
      </p>
      {me.status === 200 && (
        <button
          id="logout"
          onClick={async () => {
            const r = await api("/logout", { method: "POST" });
            if (r.data && r.data.providerLogoutUrl) {
              window.location.href = r.data.providerLogoutUrl;
            } else {
              window.location.reload();
            }
          }}
        >
          Sign out
        </button>
      )}
    </main>
  );
}
