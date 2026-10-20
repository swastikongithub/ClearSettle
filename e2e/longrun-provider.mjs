// Real wall-clock check of what OIDC back-channel logout cannot reach (documents a limitation; no shortened timers):
//  - LR-05: a ClearSettle session kept active for longer than Keycloak's SSO idle timeout (realm default 30 min)
//    outlives its Keycloak session, because the app never contacts Keycloak while the user works. An
//    administrator's sign-out at Keycloak then has no session to report, sends no logout token, and the
//    ClearSettle session stays valid. PASS means this documented behaviour was observed.
// Takes ~35 minutes. Usage: node longrun-provider.mjs [chromium|firefox]
import crypto from "node:crypto";
import * as L from "./lib.mjs";

const BROWSER = process.argv[2] || "chromium";
const rec = new L.Recorder(BROWSER);
const tag = `lp${Date.now().toString(36).slice(-5)}`;
const browser = await L.launch(BROWSER);
const t0 = Date.now();
const t = () => Math.round((Date.now() - t0) / 1000);

const username = `provider-${tag}`;
const password = `Pw-${crypto.randomBytes(12).toString("base64url")}`;
L.remember("password", password);
L.kcadm(`create users -r clearsettle -s username=${username} -s enabled=true -s email=${username}@example.test -s emailVerified=true -s firstName=Provider -s lastName=Synthetic -s 'requiredActions=["CONFIGURE_TOTP"]'`);
L.kcadm(`set-password -r clearsettle --username ${username} --new-password ${password}`);
const user = { username, password, totpSecret: null };
const kcId = JSON.parse(L.kcadm(`get users -r clearsettle -q username=${username} --fields id`))[0].id;
const kcSessions = () => JSON.parse(L.kcadm(`get users/${kcId}/sessions -r clearsettle`));
const realm = JSON.parse(L.kcadm(`get realms/clearsettle`));
const ssoIdle = realm.ssoSessionIdleTimeout;

const ctx = await browser.newContext(L.contextOptions);
const page = await L.signInReady(ctx, user); // a new user's enrolment sign-in gets no session; one more follows
const uid = (await L.api(page, "/api/me")).data.appUserId;
const timeline = [{ t: t(), app: (await L.api(page, "/api/me")).status, keycloak_sessions: kcSessions().length }];

// Keep the ClearSettle session active (a request every 5 minutes, well inside its 15-minute idle limit) and watch
// Keycloak's session, which nothing refreshes, until it has expired (its idle timeout plus Keycloak's 2-minute
// grace), at most 10 minutes past that.
const deadline = t0 + (ssoIdle + 600) * 1000;
let lastActivity = Date.now();
while (Date.now() < deadline) {
  await L.sleep(60_000);
  if (Date.now() - lastActivity >= 5 * 60_000) {
    timeline.push({ t: t(), app: (await L.api(page, "/api/me")).status, keycloak_sessions: kcSessions().length });
    lastActivity = Date.now();
  }
  if (kcSessions().length === 0) break;
}
const appWhenKeycloakEnded = (await L.api(page, "/api/me")).status;
const keycloakSessionsLeft = kcSessions().length;
timeline.push({ t: t(), app: appWhenKeycloakEnded, keycloak_sessions: keycloakSessionsLeft });

const since = Number(L.sql("select coalesce(max(id), 0) from security_event"));
L.kcadm(`create users/${kcId}/logout -r clearsettle`); // what the MFA-reset procedure does
await L.sleep(5000);
const appAfterAdminSignOut = (await L.api(page, "/api/me")).status;
const logoutEvents = Number(L.sql(`select count(*) from security_event where id > ${since} and event like 'backchannel_logout%' and app_user_id='${uid}'`));

// Clean up: end the session ClearSettle-side.
await L.api(page, "/api/csrf");
const cleanup = (await L.api(page, "/api/session/logout-everywhere", { method: "POST" })).status;
await ctx.close(); await browser.close();

rec.add({ id: "LR-05", title: "Back-channel logout cannot reach a ClearSettle session whose Keycloak session has expired (documents a limitation, wall clock): the app session is kept active past Keycloak's SSO idle timeout; Keycloak's session expires; the administrator's sign-out then sends no logout token and the ClearSettle session stays valid", requirement: "D-SEC-18, NFR-SEC-023", layer: "integration+browser",
  expected: "app 200 throughout; Keycloak sessions 1 -> 0 after the SSO idle timeout; after the admin sign-out the app session is still 200 and no back-channel event is recorded",
  actual: { sso_session_idle_timeout_s: ssoIdle, timeline, app_when_keycloak_session_ended: appWhenKeycloakEnded, keycloak_sessions_left: keycloakSessionsLeft,
    app_after_admin_sign_out: appAfterAdminSignOut, backchannel_events: logoutEvents, cleanup_logout_everywhere: cleanup },
  status: timeline[0].keycloak_sessions === 1 && timeline.every((r) => r.app === 200) && keycloakSessionsLeft === 0 && appAfterAdminSignOut === 200 && logoutEvents === 0 && cleanup === 200 ? "PASS" : "FAIL" });
console.log(`saved ${rec.save("-longrun-provider")}`);
