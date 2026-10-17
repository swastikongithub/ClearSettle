// ClearSettle end-to-end validation against the LOCAL dev stack (deploy/). Synthetic identities only.
// Usage: node run.mjs <chromium|firefox|webkit> [groups]   groups: P,B,C,D,E,H,R,K,M,G (default P,B,C,D,E,H)
//   A preflight: app shell served (always runs)        P protocol/OIDC/IdP config (browser-independent; run once)
//   B login + universal MFA   C cookies/storage        D sessions/expiry/logout   E CSRF / cookie tossing
//   H step-up + sensitive-action confirmation           R MFA recovery controls    K sibling-subdomain tossing
//   M two application instances (needs `docker compose --profile multi-instance up -d backend-2`)
//   G secret/log scan
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { request as pwRequest } from "playwright";
import * as L from "./lib.mjs";

const BROWSER = process.argv[2] || "chromium";
// Playwright's WebKit build on Windows does not implement SameSite: it stores every cookie as None and sends
// it on all cross-site navigations (see engine-samesite-probe.mjs). Browser-jar SameSite assertions are then
// reported as ENGINE-LIMITATION (never PASS); everything else is asserted normally.
const ENGINE_WITHOUT_SAMESITE = BROWSER === "webkit" && process.platform === "win32";
const GROUPS = (process.argv[3] || "P,B,C,D,E,H").split(",");
const rec = new L.Recorder(L.DEVICE ? `${BROWSER}+${L.DEVICE.replace(/\s+/g, "-")}` : BROWSER);
const tag = `${BROWSER.slice(0, 2)}${Date.now().toString(36).slice(-5)}`;
const KC_DIRECT = "http://127.0.0.1:8081"; // host-side direct access (host.docker.internal is not resolvable on this host)
let browser;

async function test(id, title, requirement, fn) {
  try {
    const r = await fn();
    rec.add({ id, title, requirement, ...r });
  } catch (e) {
    rec.add({ id, title, requirement, layer: "integration", status: "ERROR", actual: String(e && e.message).slice(0, 500) });
  }
}

// ---------- fixtures ----------
function createUser(name, { requiredActions = ["CONFIGURE_TOTP"] } = {}) {
  const username = `${name}-${tag}`;
  const password = `Pw-${crypto.randomBytes(12).toString("base64url")}`;
  L.remember("password", password);
  L.kcadm(`create users -r clearsettle -s username=${username} -s enabled=true -s email=${username}@example.test -s emailVerified=true -s firstName=${name} -s lastName=Synthetic -s 'requiredActions=${JSON.stringify(requiredActions)}'`);
  L.kcadm(`set-password -r clearsettle --username ${username} --new-password ${password}`);
  return { username, password, totpSecret: null };
}

async function login(user, { context, start = `${L.APP}/oauth2/authorization/keycloak` } = {}) {
  const ctx = context || await browser.newContext(L.contextOptions);
  const page = await ctx.newPage();
  const net = { authUrl: null, callbackUrl: null };
  page.on("request", (r) => {
    const u = r.url();
    if (u.startsWith(L.KC) && u.includes("/protocol/openid-connect/auth")) net.authUrl = u;
    if (u.startsWith(`${L.APP}/login/oauth2/code/`)) {
      net.callbackUrl = u;
      const q = new URL(u).searchParams;
      L.remember("auth_code", q.get("code")); L.remember("state", q.get("state")); L.remember("session_state", q.get("session_state"));
    }
  });
  await page.goto(start, { waitUntil: "domcontentloaded" });
  const trace = await L.keycloakLogin(page, user);
  await page.waitForLoadState("networkidle").catch(() => {});
  return { context: ctx, page, trace, net };
}

/**
 * For a brand-new user: the first login enrols TOTP and is refused by the app (no previously enrolled
 * factor verified: amr is empty); the second login verifies the enrolled code and gets a session.
 */
async function loginReady(user, opts = {}) {
  const first = await login(user, opts);
  if ((await L.api(first.page, "/api/me")).status === 200) return first;
  return login(user, { context: first.context });
}

function kcUserId(user) {
  return JSON.parse(L.kcadm(`get users -r clearsettle -q username=${user.username} --fields id`))[0].id;
}

/** Executions of the dev stack's no-op sensitive operation for a user, counted from the event it records. */
function fixtureExecutions(appUserId) {
  return Number(L.sql(`select count(*) from security_event where event='dev_fixture_operation_executed' and app_user_id='${appUserId}'`));
}
function pendingStatus(id) {
  return L.sql(`select status from pending_action where id='${id}'`);
}
/** The dev fixture's "feature endpoint": requests the no-op sensitive operation (never executes it). */
async function requestFixtureAction(page) {
  await L.api(page, "/api/csrf");
  return L.api(page, "/api/dev-fixture/sensitive-actions", { method: "POST" });
}

/**
 * Exactly one sign-in attempt (no retries): password, then, if the IdP asks, one code (default: the current
 * valid code). Returns whether the OTP form was shown, whether the browser is still at the IdP, and /api/me.
 */
async function singleAttempt(user, { code } = {}) {
  const ctx = await browser.newContext(L.contextOptions);
  const page = await ctx.newPage();
  await page.goto(`${L.APP}/oauth2/authorization/keycloak`, { waitUntil: "domcontentloaded" });
  await page.fill("#username", user.username); await page.fill("#password", user.password);
  await Promise.all([page.waitForNavigation({ waitUntil: "domcontentloaded" }).catch(() => {}), page.click("#kc-login")]);
  const otpShown = (await page.locator("#otp").count()) > 0;
  if (otpShown) {
    await page.fill("#otp", code ?? await L.totpFor(user.totpSecret));
    await Promise.all([page.waitForNavigation({ waitUntil: "domcontentloaded" }).catch(() => {}), page.click("#kc-login")]);
  }
  await page.waitForLoadState("networkidle").catch(() => {});
  const onIdp = page.url().startsWith(L.KC);
  await page.goto(`${L.APP}/`, { waitUntil: "domcontentloaded" });
  const me = (await L.api(page, "/api/me")).status;
  await ctx.close();
  return { otpShown, onIdp, me };
}

function sessionRows(appUserId) {
  return Number(L.sql(`select count(*) from spring_session where principal_name='${appUserId}'`));
}

/** Decodes the ID-token claims stored in the persisted security context (the token itself is never printed). */
function persistedIdTokenClaims(appUserId) {
  const hex = L.sql(`select encode(a.attribute_bytes,'hex') from spring_session_attributes a join spring_session s on s.primary_id=a.session_primary_id where s.principal_name='${appUserId}' and a.attribute_name='SPRING_SECURITY_CONTEXT' order by s.last_access_time desc limit 1`);
  if (!hex) return null;
  const text = Buffer.from(hex, "hex").toString("latin1");
  const jwts = text.match(/eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g) || [];
  jwts.forEach((j) => L.remember("jwt", j));
  const claims = jwts.length ? JSON.parse(Buffer.from(jwts[0].split(".")[1], "base64url").toString()) : null;
  return { jwtCount: jwts.length, claims, mentionsAccessToken: /access_token|accessToken/i.test(text), mentionsRefreshToken: /refresh_token|refreshToken/i.test(text) };
}

function setAuthenticatedAt(appUserId, epochSeconds) {
  const hex = BigInt(epochSeconds).toString(16).padStart(16, "0");
  L.sql(`update spring_session_attributes set attribute_bytes = substring(attribute_bytes from 1 for length(attribute_bytes)-8) || decode('${hex}','hex') where attribute_name='cs.authenticatedAt' and session_primary_id in (select primary_id from spring_session where principal_name='${appUserId}')`);
}

function maskCsrf(raw) { // Spring XorCsrfTokenRequestAttributeHandler format with an all-zero mask
  const t = Buffer.from(raw); return Buffer.concat([Buffer.alloc(t.length), t]).toString("base64url");
}

// ---------- P: protocol / OIDC (no browser) ----------
async function groupP() {
  const http = await pwRequest.newContext({ ignoreHTTPSErrors: true });

  await test("P-01", "Authorization request: code + PKCE S256 + state + nonce + exact redirect_uri; login-state cookie V3", "AC-157, D-SEC-15", async () => {
    const r = await http.get(`${L.APP}/oauth2/authorization/keycloak`, { maxRedirects: 0 });
    const loc = new URL(r.headers()["location"]);
    const q = Object.fromEntries(loc.searchParams);
    const setCookie = r.headersArray().filter((h) => h.name.toLowerCase() === "set-cookie").map((h) => h.value).find((v) => v.startsWith("__Host-CSLOGIN=")) || "";
    const ok = r.status() === 302 && loc.href.startsWith(`${L.ISSUER}/protocol/openid-connect/auth`) && q.response_type === "code"
      && q.code_challenge_method === "S256" && (q.code_challenge || "").length === 43 && q.state && q.nonce
      && q.redirect_uri === `${L.APP}/login/oauth2/code/keycloak`
      && /HttpOnly/i.test(setCookie) && /Secure/i.test(setCookie) && /SameSite=Lax/i.test(setCookie) && /Path=\//.test(setCookie) && !/Domain=/i.test(setCookie);
    return { layer: "integration", expected: "302 to issuer auth endpoint with S256 PKCE, state, nonce, exact redirect; __Host-CSLOGIN HttpOnly/Secure/Lax/Path=//no Domain",
      actual: { status: r.status(), endpoint: loc.origin + loc.pathname, response_type: q.response_type, method: q.code_challenge_method, challenge_len: (q.code_challenge || "").length,
        state: Boolean(q.state), nonce: Boolean(q.nonce), redirect_uri: q.redirect_uri, scope: q.scope, login_cookie_attrs: setCookie.replace(/^__Host-CSLOGIN=[^;]*/, "__Host-CSLOGIN=<value>") },
      status: ok ? "PASS" : "FAIL" };
  });

  await test("P-02", "Keycloak rejects an authorization request without code_challenge (PKCE required)", "AC-157", async () => {
    const u = `${KC_DIRECT}/realms/clearsettle/protocol/openid-connect/auth?client_id=clearsettle-web&response_type=code&scope=openid&redirect_uri=${encodeURIComponent(`${L.APP}/login/oauth2/code/keycloak`)}&state=s1&nonce=n1`;
    const r = await http.get(u, { maxRedirects: 0 });
    const loc = r.headers()["location"] || "";
    const ok = r.status() === 302 && /error=invalid_request/.test(loc) && !/[?&]code=/.test(loc);
    return { layer: "integration", expected: "redirect with error=invalid_request (missing code_challenge), no code", actual: { status: r.status(), location: loc.replace(/state=[^&]+/, "state=…") }, status: ok ? "PASS" : "FAIL" };
  });

  await test("P-03", "Keycloak refuses an unregistered redirect_uri (no code issued)", "AC-158", async () => {
    const challenge = crypto.createHash("sha256").update("verifier-verifier-verifier-verifier-verifier-1").digest("base64url");
    const u = `${KC_DIRECT}/realms/clearsettle/protocol/openid-connect/auth?client_id=clearsettle-web&response_type=code&scope=openid&redirect_uri=${encodeURIComponent("https://evil.example/callback")}&state=s2&nonce=n2&code_challenge=${challenge}&code_challenge_method=S256`;
    const r = await http.get(u, { maxRedirects: 0 });
    const body = await r.text();
    const ok = r.status() === 400 && !r.headers()["location"] && /redirect_uri|Invalid parameter/i.test(body);
    return { layer: "integration", expected: "HTTP 400 invalid redirect_uri, no Location", actual: { status: r.status(), location: r.headers()["location"] || null, mentions_redirect_uri: /redirect_uri/i.test(body) }, status: ok ? "PASS" : "FAIL" };
  });

  await test("P-04", "Forged callback (attacker code+state, no login state) is rejected; no session", "AC-157", async () => {
    const r = await http.get(`${L.APP}/login/oauth2/code/keycloak?code=forged-code-value-0001&state=forged-state-value-0001`, { maxRedirects: 0 });
    const loc = r.headers()["location"] || "";
    const me = await http.get(`${L.APP}/api/me`, { maxRedirects: 0 });
    const ok = r.status() === 302 && /auth_error=/.test(loc) && me.status() === 401;
    return { layer: "integration", expected: "redirect with auth_error; /api/me 401", actual: { status: r.status(), location: loc, me_status: me.status() }, status: ok ? "PASS" : "FAIL" };
  });

  await test("P-05", "Issuer discovered by the backend equals the token issuer used by the browser", "AC-157", async () => {
    const r = await http.get(`${KC_DIRECT}/realms/clearsettle/.well-known/openid-configuration`);
    const d = await r.json();
    const ok = d.issuer === L.ISSUER && (d.code_challenge_methods_supported || []).includes("S256") && (d.acr_values_supported || []).includes("mfa");
    return { layer: "integration", expected: `issuer ${L.ISSUER}; S256; acr mfa supported`, actual: { issuer: d.issuer, pkce: d.code_challenge_methods_supported, acr_values_supported: d.acr_values_supported }, status: ok ? "PASS" : "FAIL" };
  });

  await test("P-06", "Keycloak client config: PKCE S256 enforced, exact redirect URIs, default+minimum ACR = mfa", "D-SEC-12, D-SEC-14", async () => {
    // (kcadm --fields drops the nested attributes object, so fetch the full representation.)
    const c = JSON.parse(L.kcadm(`get clients -r clearsettle -q clientId=clearsettle-web`))[0];
    L.remember("client_secret", c.secret);
    const a = c.attributes || {};
    const ok = a["pkce.code.challenge.method"] === "S256" && a["default.acr.values"] === "mfa" && a["minimum.acr.value"] === "mfa"
      && c.redirectUris.length === 1 && c.redirectUris[0] === `${L.APP}/login/oauth2/code/keycloak` && !c.publicClient && !c.directAccessGrantsEnabled && !c.implicitFlowEnabled;
    return { layer: "integration", expected: "S256, exact single redirect URI, confidential, no implicit/direct grants, default+minimum acr mfa",
      actual: { pkce: a["pkce.code.challenge.method"], default_acr: a["default.acr.values"], minimum_acr: a["minimum.acr.value"], redirectUris: c.redirectUris, publicClient: c.publicClient, directAccessGrants: c.directAccessGrantsEnabled, implicit: c.implicitFlowEnabled },
      status: ok ? "PASS" : "FAIL" };
  });
  await test("P-07", "Realm flow evidence config: level 2 = OTP form only; AMR mapper on the ID token; authentication references pwd/otp", "D-SEC-14", async () => {
    const c = JSON.parse(L.kcadm(`get clients -r clearsettle -q clientId=clearsettle-web`))[0];
    const amrMapper = (c.protocolMappers || []).find((m) => m.protocolMapper === "oidc-amr-mapper");
    const ref = (flow, provider) => {
      const ex = JSON.parse(L.kcadm(`get authentication/flows/${flow}/executions -r clearsettle`));
      const e = ex.find((x) => x.providerId === provider);
      if (!e || !e.authenticationConfig) return { requirement: e && e.requirement, reference: null };
      const cfg = JSON.parse(L.kcadm(`get authentication/config/${e.authenticationConfig} -r clearsettle`));
      return { requirement: e.requirement, reference: cfg.config["default.reference.value"] };
    };
    const loa2 = JSON.parse(L.kcadm(`get authentication/flows/clearsettle-loa2/executions -r clearsettle`)).map((e) => `${e.providerId}:${e.requirement}`);
    const pwd = ref("clearsettle-loa1", "auth-username-password-form");
    const otp = ref("clearsettle-loa2", "auth-otp-form");
    const ok = amrMapper && amrMapper.config["id.token.claim"] === "true" && pwd.reference === "pwd" && otp.reference === "otp"
      && otp.requirement === "REQUIRED" && loa2.join(",") === "conditional-level-of-authentication:REQUIRED,auth-otp-form:REQUIRED";
    return { layer: "integration", expected: "AMR mapper emits to the ID token; password ref=pwd; OTP ref=otp; level-2 subflow is condition + REQUIRED OTP form only",
      actual: { amr_mapper_id_token: amrMapper && amrMapper.config["id.token.claim"], password: pwd, otp, loa2_executions: loa2 }, status: ok ? "PASS" : "FAIL" };
  });
  await test("P-08", "IdP MFA and recovery configuration: TOTP is the only second factor (6 digits, 30 s, SHA1, no code reuse) and enrolment is a default action; no self-service credential deletion; password reset off and its flow cannot reset OTP; brute-force detection on; user and admin events recorded (admin event bodies off)", "D-SEC-14 (factor, recovery), NFR-SEC-010, NFR-SEC-026", async () => {
    const r = JSON.parse(L.kcadm(`get realms/clearsettle`));
    const ra = JSON.parse(L.kcadm(`get authentication/required-actions -r clearsettle`));
    const enabled = ra.filter((a) => a.enabled).map((a) => a.providerId);
    const totp = ra.find((a) => a.providerId === "CONFIGURE_TOTP") || {};
    const resetSteps = JSON.parse(L.kcadm(`get authentication/flows/${r.resetCredentialsFlow}/executions -r clearsettle`)).map((e) => e.providerId).filter(Boolean);
    const otherFactors = ["webauthn-register", "webauthn-register-passwordless", "CONFIGURE_RECOVERY_AUTHN_CODES"];
    const events = r.enabledEventTypes || [];
    const ok = r.otpPolicyType === "totp" && r.otpPolicyDigits === 6 && r.otpPolicyPeriod === 30 && r.otpPolicyAlgorithm === "HmacSHA1" && r.otpPolicyCodeReusable === false
      && totp.enabled === true && totp.defaultAction === true && !enabled.includes("delete_credential") && !enabled.some((a) => otherFactors.includes(a))
      && r.resetPasswordAllowed === false && r.resetCredentialsFlow === "clearsettle-reset-credentials" && !resetSteps.includes("reset-otp")
      && r.bruteForceProtected === true && r.permanentLockout === false
      && r.eventsEnabled === true && r.adminEventsEnabled === true && r.adminEventsDetailsEnabled === false
      && ["LOGIN_ERROR", "UPDATE_CREDENTIAL", "REMOVE_CREDENTIAL", "USER_DISABLED_BY_TEMPORARY_LOCKOUT"].every((t) => events.includes(t));
    return { layer: "integration", expected: "TOTP only; CONFIGURE_TOTP enabled + default; delete_credential and other factors not enabled; reset off, reset flow without reset-otp; brute force (temporary); events + admin events, no admin bodies",
      actual: { otp_policy: { type: r.otpPolicyType, digits: r.otpPolicyDigits, period: r.otpPolicyPeriod, algorithm: r.otpPolicyAlgorithm, reusable: r.otpPolicyCodeReusable },
        enabled_required_actions: enabled, configure_totp_default: totp.defaultAction, reset_password_allowed: r.resetPasswordAllowed, reset_flow: r.resetCredentialsFlow, reset_flow_steps: resetSteps,
        brute_force: { on: r.bruteForceProtected, permanent: r.permanentLockout, failure_factor: r.failureFactor, wait_increment_s: r.waitIncrementSeconds, max_wait_s: r.maxFailureWaitSeconds },
        events: r.eventsEnabled, admin_events: r.adminEventsEnabled, admin_event_bodies: r.adminEventsDetailsEnabled, event_types: events.length }, status: ok ? "PASS" : "FAIL" };
  });
  await http.dispose();
}

// ---------- shared state across groups ----------
const S = {};

// ---------- B: login + universal MFA ----------
async function groupB() {
  S.alice = createUser("alice");
  await test("B-01", "First login: TOTP enrolment is mandatory; the enrolment login itself gets NO session (acr=mfa but no verified factor in amr) and the user is told to sign in once more; the next sign-in with the enrolled code does", "D-SEC-14, AC-157", async () => {
    const e0 = Number(L.sql(`select count(*) from security_event where event='login_refused_mfa_required' and detail like '%reason=amr_insufficient%'`));
    const first = await login(S.alice);
    const firstLanded = first.page.url();
    const helpShown = await first.page.locator("#auth-help").waitFor({ timeout: 10000 }).then(() => true, () => false);
    const firstMe = await L.api(first.page, "/api/me");
    const refused = Number(L.sql(`select count(*) from security_event where event='login_refused_mfa_required' and detail like '%reason=amr_insufficient%'`)) > e0;
    const second = await login(S.alice, { context: first.context });
    const me = await L.api(second.page, "/api/me");
    S.aliceSession = second; S.aliceMe = me.data;
    const ok = first.trace.includes("otp-enrol") && /auth_error=mfa_not_verified/.test(firstLanded) && helpShown && firstMe.status === 401 && refused
      && second.trace.includes("otp") && me.status === 200 && me.data.acr === "mfa";
    return { layer: "browser", expected: "enrolment forced; enrolment login refused (auth_error=mfa_not_verified, event reason amr_insufficient) and the 'sign in once more' explanation shown; next sign-in = OTP -> session acr=mfa",
      actual: { enrolment_trace: first.trace, enrolment_landed_error: (firstLanded.match(/auth_error=[a-z_]+/) || [null])[0], sign_in_again_explained: helpShown, enrolment_me: firstMe.status,
        amr_insufficient_event: refused, second_trace: second.trace, me_status: me.status, acr: me.data && me.data.acr }, status: ok ? "PASS" : "FAIL" };
  });

  await test("B-02", "Identity maps to validated (iss, sub); app_user provisioned on that pair", "AC-157, D-SEC-12", async () => {
    const me = S.aliceMe;
    const kcId = JSON.parse(L.kcadm(`get users -r clearsettle -q username=${S.alice.username} --fields id`))[0].id;
    const row = L.sql(`select iss||'|'||sub from app_user where id='${me.appUserId}'`);
    const ok = me.iss === L.ISSUER && me.sub === kcId && row === `${L.ISSUER}|${kcId}`;
    return { layer: "integration", expected: "iss = realm issuer, sub = Keycloak user id; app_user row keyed on that pair", actual: { iss: me.iss, sub_matches_keycloak_id: me.sub === kcId, app_user_row_matches: row === `${L.ISSUER}|${kcId}` }, status: ok ? "PASS" : "FAIL" };
  });

  await test("B-03", "Persisted ID token: acr=mfa backed by amr containing otp; required claims present; no access/refresh token in session", "D-SEC-14, F-3", async () => {
    const p = persistedIdTokenClaims(S.aliceMe.appUserId);
    const c = p.claims || {};
    const amr = Array.isArray(c.amr) ? c.amr : [];
    const ok = c.acr === "mfa" && amr.includes("otp") && c.iss === L.ISSUER && c.aud && c.sub && c.exp && c.iat && c.auth_time && c.nonce && c.azp === "clearsettle-web"
      && !("access_token" in c) && !("refresh_token" in c)
      && p.jwtCount === 1 && !p.mentionsAccessToken && !p.mentionsRefreshToken;
    return { layer: "integration", expected: "acr=mfa with amr including otp; iss/aud/azp/sub/exp/iat/auth_time/nonce present; exactly one JWT (ID token); no access/refresh token",
      actual: { acr: c.acr, amr, claim_names: Object.keys(c).sort(), azp: c.azp, jwt_count_in_session: p.jwtCount, access_token_in_session: p.mentionsAccessToken, refresh_token_in_session: p.mentionsRefreshToken },
      status: ok ? "PASS" : "FAIL" };
  });

  await test("B-04", "Subsequent login requires password AND OTP (universal MFA on every login)", "D-SEC-14", async () => {
    const s = await login(S.alice);
    const me = await L.api(s.page, "/api/me");
    await s.context.close();
    const ok = s.trace.join(",") === "password,otp" && me.status === 200 && me.data.acr === "mfa";
    return { layer: "browser", expected: "trace password,otp; acr=mfa", actual: { trace: s.trace, me_status: me.status, acr: me.data && me.data.acr }, status: ok ? "PASS" : "FAIL" };
  });

  await test("B-05", "Wrong OTP does not establish a session", "D-SEC-14", async () => {
    const ctx = await browser.newContext(L.contextOptions);
    const page = await ctx.newPage();
    await page.goto(`${L.APP}/oauth2/authorization/keycloak`, { waitUntil: "domcontentloaded" });
    await page.fill("#username", S.alice.username); await page.fill("#password", S.alice.password);
    await Promise.all([page.waitForNavigation({ waitUntil: "domcontentloaded" }).catch(() => {}), page.click("#kc-login")]);
    const otpShown = (await page.locator("#otp").count()) > 0;
    await page.fill("#otp", "000000");
    await Promise.all([page.waitForNavigation({ waitUntil: "domcontentloaded" }).catch(() => {}), page.click("#kc-login")]);
    const stillOnIdp = page.url().startsWith(L.KC);
    await page.goto(`${L.APP}/`, { waitUntil: "domcontentloaded" });
    const me = await L.api(page, "/api/me");
    await ctx.close();
    const ok = otpShown && stillOnIdp && me.status === 401;
    return { layer: "browser", expected: "OTP prompted; wrong code keeps user on IdP; no app session", actual: { otp_prompted: otpShown, still_on_idp: stillOnIdp, me_status: me.status }, status: ok ? "PASS" : "FAIL" };
  });

  await test("B-07", "TOTP for every user: a user created with NO required action must still enrol TOTP (the level-2 flow requires the OTP form); that sign-in gets no session; the next one with a code does", "D-SEC-14 (factor: TOTP for every user)", async () => {
    const u = createUser("noaction", { requiredActions: [] });
    // CONFIGURE_TOTP is a default action, so Keycloak assigns it at creation: remove it to model a user
    // whose required action was cleared (for example by an administrator).
    const atCreation = JSON.parse(L.kcadm(`get users/${kcUserId(u)} -r clearsettle`)).requiredActions || [];
    L.kcadm(`update users/${kcUserId(u)} -r clearsettle -s 'requiredActions=[]'`);
    const assigned = JSON.parse(L.kcadm(`get users/${kcUserId(u)} -r clearsettle`)).requiredActions || [];
    const first = await login(u);
    const landed = first.page.url();
    const firstMe = await L.api(first.page, "/api/me");
    const second = await login(u, { context: first.context });
    const me = await L.api(second.page, "/api/me");
    const claims = me.status === 200 ? (persistedIdTokenClaims(me.data.appUserId) || {}).claims || {} : {};
    await first.context.close();
    const ok = assigned.length === 0 && first.trace.includes("otp-enrol") && /auth_error=mfa_not_verified/.test(landed) && firstMe.status === 401
      && second.trace.includes("otp") && me.status === 200 && Array.isArray(claims.amr) && claims.amr.includes("otp");
    return { layer: "browser", expected: "no required action before sign-in; enrolment forced anyway; first sign-in refused (mfa_not_verified); next sign-in asks the code (SSO covers the password) -> session with amr otp",
      actual: { required_actions_at_creation: atCreation, required_actions_before_sign_in: assigned, first_trace: first.trace, first_landed_error: (landed.match(/auth_error=[a-z_]+/) || [null])[0], first_me: firstMe.status, second_trace: second.trace, me_status: me.status, amr: claims.amr },
      status: ok ? "PASS" : "FAIL" };
  });

  await test("B-08", "TOTP brute-force protection: repeated wrong one-time codes lock the account temporarily at the IdP; during the lockout even the correct password and a valid code get no session", "D-SEC-14, NFR-SEC-010", async () => {
    const u = createUser("lockout");
    const ready = await loginReady(u); await ready.context.close();
    const id = kcUserId(u);
    const bf = () => JSON.parse(L.kcadm(`get attack-detection/brute-force/users/${id} -r clearsettle`));
    const ctx = await browser.newContext(L.contextOptions);
    const page = await ctx.newPage();
    await page.goto(`${L.APP}/oauth2/authorization/keycloak`, { waitUntil: "domcontentloaded" });
    await page.fill("#username", u.username); await page.fill("#password", u.password);
    await Promise.all([page.waitForNavigation({ waitUntil: "domcontentloaded" }).catch(() => {}), page.click("#kc-login")]);
    let attempts = 0, locked = false;
    while (attempts < 35 && !locked && (await page.locator("#otp").count())) {
      await page.fill("#otp", attempts % 2 ? "000000" : "999999"); // wrong (a real code collides with p < 2e-6)
      await Promise.all([page.waitForNavigation({ waitUntil: "domcontentloaded" }).catch(() => {}), page.click("#kc-login")]);
      attempts++;
      if (attempts % 2 === 0 || attempts >= 28) locked = bf().disabled === true;
    }
    await ctx.close();
    // During the lockout: one sign-in attempt with the correct password and (if asked) a valid current code.
    const retry = await singleAttempt(u);
    const during = bf();
    const lockEvents = JSON.parse(L.kcadm(`get events -r clearsettle -q type=USER_DISABLED_BY_TEMPORARY_LOCKOUT -q user=${id}`)).length;
    L.kcadm(`delete attack-detection/brute-force/users/${id} -r clearsettle`); // clear the lockout (dev user)
    const ok = locked && retry.onIdp && retry.me === 401 && during.disabled === true && lockEvents >= 1;
    return { layer: "browser", expected: "locked after repeated wrong codes; correct password + valid code during the lockout -> no session; the lockout is a Keycloak event",
      actual: { wrong_codes_until_locked: attempts, locked, retry_during_lockout: retry, idp_state: { disabled: during.disabled, numFailures: during.numFailures }, lockout_events: lockEvents },
      status: ok ? "PASS" : "FAIL" };
  });

  if (BROWSER === "chromium") {
    await test("B-06", "Misconfigured IdP issues a password-only token (acr=pwd): the app's MFA gate refuses the session", "D-SEC-14 (fail closed)", async () => {
      const cid = JSON.parse(L.kcadm(`get clients -r clearsettle -q clientId=clearsettle-web --fields id`))[0].id;
      // Simulate an IdP misconfiguration: remove the client's default/minimum ACR so Keycloak only runs level 1.
      L.kcadm(`update clients/${cid} -r clearsettle -s 'attributes."default.acr.values"=' -s 'attributes."minimum.acr.value"='`);
      let result;
      try {
        const s = await login(S.alice);
        const landed = s.page.url();
        const me = await L.api(s.page, "/api/me");
        const refusedEvent = Number(L.sql(`select count(*) from security_event where event='login_refused_mfa_required'`));
        await s.context.close();
        const ok = s.trace.join(",") === "password" && /auth_error=mfa_required/.test(landed) && me.status === 401 && refusedEvent > 0;
        result = { layer: "browser", expected: "IdP authenticates with password only (no OTP); backend refuses: auth_error=mfa_required, no session",
          actual: { trace: s.trace, landed_error: (landed.match(/auth_error=[a-z_]+/) || [null])[0], me_status: me.status, login_refused_mfa_required_events: refusedEvent }, status: ok ? "PASS" : "FAIL" };
      } finally {
        L.kcadm(`update clients/${cid} -r clearsettle -s 'attributes."default.acr.values"=mfa' -s 'attributes."minimum.acr.value"=mfa'`);
      }
      return result;
    });
  }
}

// ---------- C: cookies / storage ----------
async function groupC() {
  const s = S.aliceSession;
  await L.api(s.page, "/api/csrf");
  await test("C-01", "Session cookie __Host-CSSESSION: Secure, HttpOnly, SameSite=Strict, host-only, Path=/", "AC-159, D-SEC-15", async () => {
    const c = await L.cookieInfo(s.context, L.SESSION_COOKIE);
    const rest = c && c.secure && c.httpOnly && c.domain === "localhost" && c.path === "/" && c.session;
    const ok = rest && c.sameSite === "Strict";
    const status = ok ? "PASS" : rest && ENGINE_WITHOUT_SAMESITE && c.sameSite === "None" ? "ENGINE-LIMITATION" : "FAIL";
    return { layer: "browser", expected: "Secure, HttpOnly, Strict, host-only localhost, Path=/, session cookie", actual: c, status };
  });
  await test("C-02", "CSRF cookie __Host-XSRF-TOKEN: Secure, SameSite=Strict, host-only, Path=/, readable by script (double-submit)", "AC-159", async () => {
    const c = await L.cookieInfo(s.context, L.CSRF_COOKIE);
    const rest = c && c.secure && !c.httpOnly && c.domain === "localhost" && c.path === "/";
    const ok = rest && c.sameSite === "Strict";
    const status = ok ? "PASS" : rest && ENGINE_WITHOUT_SAMESITE && c.sameSite === "None" ? "ENGINE-LIMITATION" : "FAIL";
    return { layer: "browser", expected: "Secure, not HttpOnly, Strict, host-only, Path=/", actual: c, status };
  });
  await test("C-05", "Server Set-Cookie attributes (engine-independent): session and CSRF cookies Strict, login-state cookie Lax and short-lived; all __Host- (Secure, Path=/, no Domain)", "AC-159, D-SEC-15", async () => {
    // C-01/C-02 read the browser's cookie jar, which depends on the engine honouring SameSite. This reads
    // the attributes the server actually sends, so an engine that ignores SameSite cannot mask a server defect.
    const ctx = await browser.newContext(L.contextOptions);
    const responses = [];
    ctx.on("response", (r) => { if (r.url().startsWith(L.APP)) responses.push(r); }); // read headers later, before close
    const s2 = await login(S.alice, { context: ctx });
    await L.api(s2.page, "/api/csrf");
    const seen = {};
    for (const r of responses) {
      for (const h of await r.headersArray().catch(() => [])) {
        if (h.name.toLowerCase() !== "set-cookie") continue;
        for (const line of h.value.split("\n")) {
          const name = line.slice(0, line.indexOf("="));
          const attrs = line.split(";").slice(1).map((a) => a.trim()).filter((a) => a.length);
          if ([L.SESSION_COOKIE, L.CSRF_COOKIE, L.LOGIN_COOKIE].includes(name) && !line.includes("Max-Age=0")) seen[name] = attrs; // attributes only, never the value
        }
      }
    }
    await ctx.close();
    const has = (n, a) => (seen[n] || []).some((x) => x.toLowerCase() === a.toLowerCase());
    const noDomain = (n) => !(seen[n] || []).some((x) => /^domain=/i.test(x));
    const maxAge = Number(((seen[L.LOGIN_COOKIE] || []).find((x) => /^max-age=/i.test(x)) || "Max-Age=NaN").split("=")[1]);
    const ok = has(L.SESSION_COOKIE, "SameSite=Strict") && has(L.SESSION_COOKIE, "Secure") && has(L.SESSION_COOKIE, "HttpOnly") && has(L.SESSION_COOKIE, "Path=/") && noDomain(L.SESSION_COOKIE)
      && has(L.CSRF_COOKIE, "SameSite=Strict") && has(L.CSRF_COOKIE, "Secure") && !has(L.CSRF_COOKIE, "HttpOnly") && has(L.CSRF_COOKIE, "Path=/") && noDomain(L.CSRF_COOKIE)
      && has(L.LOGIN_COOKIE, "SameSite=Lax") && has(L.LOGIN_COOKIE, "Secure") && has(L.LOGIN_COOKIE, "HttpOnly") && has(L.LOGIN_COOKIE, "Path=/") && noDomain(L.LOGIN_COOKIE) && maxAge > 0 && maxAge <= 300;
    return { layer: "server header (observed in browser)", expected: "session: Secure; HttpOnly; SameSite=Strict; Path=/; no Domain | CSRF: same but not HttpOnly | __Host-CSLOGIN: Secure; HttpOnly; SameSite=Lax; Path=/; Max-Age<=300",
      // Some engines (Playwright WebKit on Windows) expose no Set-Cookie response headers at all: nothing can be asserted.
      actual: { set_cookie_attributes: seen, login_cookie_max_age: maxAge }, status: ok ? "PASS" : Object.keys(seen).length === 0 ? "NOT-OBSERVABLE" : "FAIL" };
  });
  await test("C-03", "Only intended cookies on the app origin; login-state cookie consumed; no OIDC tokens in cookies or web storage", "AC-159, NFR-SEC-020", async () => {
    const cookies = (await s.context.cookies()).filter((c) => c.domain === "localhost");
    const names = cookies.map((c) => c.name).sort();
    const anyJwt = cookies.some((c) => /^eyJ/.test(c.value));
    const storage = await s.page.evaluate(() => ({ local: Object.keys(localStorage), session: Object.keys(sessionStorage), blob: JSON.stringify({ ...localStorage }) + JSON.stringify({ ...sessionStorage }) }));
    const docCookie = await s.page.evaluate(() => document.cookie);
    const ok = names.every((n) => [L.SESSION_COOKIE, L.CSRF_COOKIE].includes(n)) && !names.includes(L.LOGIN_COOKIE) && !anyJwt
      && storage.local.length === 0 && storage.session.length === 0 && !docCookie.includes(L.SESSION_COOKIE);
    return { layer: "browser", expected: "cookies only session+CSRF; no __Host-CSLOGIN after callback; no JWT; empty web storage; session cookie not script-visible",
      actual: { cookie_names: names, jwt_in_cookie: anyJwt, localStorage_keys: storage.local, sessionStorage_keys: storage.session, session_cookie_in_document_cookie: docCookie.includes(L.SESSION_COOKIE) },
      status: ok ? "PASS" : "FAIL" };
  });
  await test("C-04", "__Host- prefix rules on the app's own host: a non-root Path is rejected; Domain=<same single-label host> is either rejected or normalised to host-only (RFC 6265 §5.3)", "F-4, D-SEC-15", async () => {
    // Originally asserted that both variants are rejected; Firefox accepted the Domain=localhost variant
    // (normalised to host-only because 'localhost' is a single-label/public-suffix host). That is the SAME
    // host setting its own cookie, not tossing. The sibling-host threat is tested separately in K-01.
    const res = await s.page.evaluate(() => {
      document.cookie = "__Host-XSRF-TOKEN=tossed-with-path; Path=/api; Secure";
      const pathAccepted = document.cookie.includes("tossed-with-path");
      document.cookie = "__Host-XSRF-TOKEN=tossed-with-domain; Domain=localhost; Path=/; Secure";
      const domainAccepted = document.cookie.includes("tossed-with-domain");
      return { pathAccepted, domainAccepted };
    });
    const jar = (await s.context.cookies()).filter((c) => c.name === L.CSRF_COOKIE).map((c) => c.domain);
    const domainVariantHostOnly = jar.every((d) => !d.startsWith("."));
    const ok = !res.pathAccepted && (!res.domainAccepted || domainVariantHostOnly);
    // Restore a valid CSRF cookie for later groups.
    await s.context.clearCookies({ name: L.CSRF_COOKIE });
    await L.api(s.page, "/api/csrf");
    return { layer: "browser", expected: "Path=/api variant rejected; Domain variant rejected, or (if accepted) stored host-only",
      actual: { path_variant_accepted: res.pathAccepted, domain_variant_accepted: res.domainAccepted, csrf_cookie_domains_after: jar, domain_variant_stored_host_only: domainVariantHostOnly },
      status: ok ? "PASS" : "FAIL" };
  });
}

// ---------- D: sessions ----------
async function groupD() {
  const me = S.aliceMe;
  await test("D-01", "Session persisted server-side in PostgreSQL with the 15-minute idle policy and an absolute anchor; it holds only the security context, the anchor and the principal index", "D-SEC-11, D-SEC-13, F-3", async () => {
    // The cookie carries the base64 of the Spring Session id: inspect exactly this browser's session row.
    const cookie = (await S.aliceSession.context.cookies()).find((c) => c.name === L.SESSION_COOKIE);
    const sid = Buffer.from(cookie.value, "base64").toString("utf8");
    L.remember("session_id", sid);
    const row = L.sql(`select max_inactive_interval||'|'||principal_name from spring_session where session_id='${sid}'`);
    const attrs = L.sql(`select string_agg(a.attribute_name, ',' order by a.attribute_name) from spring_session_attributes a join spring_session s on s.primary_id=a.session_primary_id where s.session_id='${sid}'`);
    if (row.split("|")[1] !== me.appUserId) throw new Error("session row not owned by the expected user");
    const session = await L.api(S.aliceSession.page, "/api/session");
    const [maxInactive] = row.split("|");
    const auth = Number(me.sessionAuthenticatedAt);
    const expectedAttrs = "SPRING_SECURITY_CONTEXT,cs.authenticatedAt,org.springframework.session.FindByIndexNameSessionRepository.PRINCIPAL_NAME_INDEX_NAME";
    const ok = Number(maxInactive) === 900 && session.data.idleTimeoutSeconds === 900 && session.data.absoluteExpiresAt === auth + 28800 && attrs === expectedAttrs;
    return { layer: "integration", expected: `SPRING_SESSION row; MAX_INACTIVE_INTERVAL=900; absoluteExpiresAt = authenticatedAt + 28800; attributes exactly ${expectedAttrs}`,
      actual: { max_inactive_interval: Number(maxInactive), attributes: attrs, api_idle: session.data.idleTimeoutSeconds, absolute_minus_auth: session.data.absoluteExpiresAt - auth }, status: ok ? "PASS" : "FAIL" };
  });

  await test("D-02", "Session fixation: a pre-login session id (server-issued or attacker-planted) is never adopted at authentication", "AC-162", async () => {
    const user = createUser("rot");
    const ctx = await browser.newContext(L.contextOptions);
    const page = await ctx.newPage();
    // Top-level navigation to a protected URL: Spring may save the request and issue a pre-login session.
    await page.goto(`${L.APP}/api/me`, { waitUntil: "domcontentloaded" }).catch(() => {});
    let pre = (await ctx.cookies()).find((c) => c.name === L.SESSION_COOKIE);
    let method = "server-issued pre-login session";
    if (!pre) {
      method = "attacker-planted session id (the server issued none pre-login)";
      await ctx.addCookies([{ name: L.SESSION_COOKIE, value: "attacker-planted-session-id-0001", domain: "localhost", path: "/", secure: true, httpOnly: true, sameSite: "Strict" }]);
      pre = (await ctx.cookies()).find((c) => c.name === L.SESSION_COOKIE);
    }
    L.remember("session_id", pre.value);
    const s = await loginReady(user, { context: ctx });
    const post = (await ctx.cookies()).find((c) => c.name === L.SESSION_COOKIE);
    L.remember("session_id", post && post.value);
    const meNow = await L.api(s.page, "/api/me");
    const c2 = await browser.newContext(L.contextOptions);
    await c2.addCookies([{ ...pre }]);
    const p2 = await c2.newPage(); await p2.goto(`${L.APP}/`, { waitUntil: "domcontentloaded" });
    const replay = (await L.api(p2, "/api/me")).status; await c2.close(); await ctx.close();
    const ok = meNow.status === 200 && post && post.value !== pre.value && replay === 401;
    return { layer: "browser", expected: "authenticated session id differs from the pre-login id; the pre-login id is not authenticated",
      actual: { pre_login_source: method, id_changed: Boolean(post && post.value !== pre.value), me_after_login: meNow.status, pre_login_id_replay_status: replay }, status: ok ? "PASS" : "FAIL" };
  });

  await test("D-03", "Idle expiry (controlled): a session idle for >15 minutes is refused", "D-SEC-13, AC-162", async () => {
    const user = createUser("idle");
    const s = await loginReady(user);
    const m = await L.api(s.page, "/api/me");
    const before = (await L.api(s.page, "/api/me")).status;
    // Controlled time travel of the persisted session: last access 16 minutes ago.
    L.sql(`update spring_session set last_access_time = last_access_time - ${16 * 60 * 1000}, expiry_time = expiry_time - ${16 * 60 * 1000} where principal_name='${m.data.appUserId}'`);
    const after = await L.api(s.page, "/api/me");
    await s.context.close();
    const ok = before === 200 && after.status === 401;
    return { layer: "integration", expected: "200 before; 401 after the persisted session has been idle >900 s", actual: { before, after: after.status, after_error: after.data && after.data.error }, status: ok ? "PASS" : "FAIL" };
  });

  await test("D-04", "Absolute expiry (controlled): an ACTIVE session older than 8 h since authentication is refused; 8 h minus 2 min is allowed", "D-SEC-13, AC-162", async () => {
    const user = createUser("abs");
    const s = await loginReady(user);
    const m = await L.api(s.page, "/api/me");
    const now = Math.floor(Date.now() / 1000);
    setAuthenticatedAt(m.data.appUserId, now - 28800 + 120); // inside the window
    const inside = await L.api(s.page, "/api/me");
    const insideSession = await L.api(s.page, "/api/session");
    setAuthenticatedAt(m.data.appUserId, now - 28800 - 60); // past the window, while last access is current (active)
    const lastAccessAgeS = Number(L.sql(`select (extract(epoch from now())*1000 - last_access_time)/1000 from spring_session where principal_name='${m.data.appUserId}'`));
    const past = await L.api(s.page, "/api/me");
    const rowsAfter = sessionRows(m.data.appUserId);
    await s.context.close();
    const ok = inside.status === 200 && past.status === 401 && past.data && past.data.error === "session_expired" && lastAccessAgeS < 60 && rowsAfter === 0;
    return { layer: "integration", expected: "inside window 200; past 8 h -> 401 session_expired even though the session was just used; session row removed",
      actual: { inside: inside.status, inside_absolute_expires_in_s: insideSession.data.absoluteExpiresAt - now, last_access_age_s_before_check: Math.round(lastAccessAgeS), past: past.status, past_error: past.data && past.data.error, session_rows_after: rowsAfter },
      status: ok ? "PASS" : "FAIL" };
  });

  await test("D-05", "Logout invalidates the server-side session; the old cookie is refused", "AC-162", async () => {
    const user = createUser("logout");
    const s = await loginReady(user);
    const m = await L.api(s.page, "/api/me");
    const old = (await s.context.cookies()).find((c) => c.name === L.SESSION_COOKIE);
    await L.api(s.page, "/api/csrf");
    const out = await L.api(s.page, "/logout", { method: "POST" });
    const rows = sessionRows(m.data.appUserId);
    const c2 = await browser.newContext(L.contextOptions); await c2.addCookies([{ ...old }]);
    const p2 = await c2.newPage(); await p2.goto(`${L.APP}/`, { waitUntil: "domcontentloaded" });
    const replay = await L.api(p2, "/api/me"); await c2.close(); await s.context.close();
    const providerLogout = out.data && out.data.providerLogoutUrl ? new URL(out.data.providerLogoutUrl) : null;
    const ok = out.status === 200 && rows === 0 && replay.status === 401 && providerLogout
      && providerLogout.searchParams.get("client_id") === "clearsettle-web" && !providerLogout.searchParams.get("id_token_hint");
    return { layer: "browser", expected: "logout 200; session row deleted; old cookie -> 401; provider logout URL uses client_id (no ID token in URL)",
      actual: { logout_status: out.status, session_rows_after: rows, replay_status: replay.status, provider_logout_endpoint: providerLogout && providerLogout.origin + providerLogout.pathname, id_token_hint_in_url: Boolean(providerLogout && providerLogout.searchParams.get("id_token_hint")) },
      status: ok ? "PASS" : "FAIL" };
  });

  await test("D-06", "Sign-out-everywhere revokes all of the user's sessions (two browsers)", "AC-163", async () => {
    const user = createUser("everywhere");
    const a = await loginReady(user);
    const b = await login(user); // second, independent session (OTP waits for a fresh window)
    const m = await L.api(a.page, "/api/me");
    const rowsBefore = sessionRows(m.data.appUserId);
    await L.api(a.page, "/api/csrf");
    const res = await L.api(a.page, "/api/session/logout-everywhere", { method: "POST" });
    const aAfter = await L.api(a.page, "/api/me"); const bAfter = await L.api(b.page, "/api/me");
    const rowsAfter = sessionRows(m.data.appUserId);
    await a.context.close(); await b.context.close();
    const ok = rowsBefore === 2 && res.status === 200 && aAfter.status === 401 && bAfter.status === 401 && rowsAfter === 0;
    return { layer: "browser", expected: "2 sessions -> logout-everywhere 200 -> both 401, 0 rows", actual: { rows_before: rowsBefore, status: res.status, deleted: res.data && res.data.deletedSessions, a_after: aAfter.status, b_after: bAfter.status, rows_after: rowsAfter }, status: ok ? "PASS" : "FAIL" };
  });

  await test("D-07", "Disabling the user is enforced on the next request (per-request re-check)", "AC-163, NFR-SEC-023", async () => {
    const user = createUser("disable");
    const s = await loginReady(user);
    const m = await L.api(s.page, "/api/me");
    L.sql(`update app_user set disabled = true where id='${m.data.appUserId}'`);
    const after = await L.api(s.page, "/api/me");
    const rows = sessionRows(m.data.appUserId);
    L.sql(`update app_user set disabled = false where id='${m.data.appUserId}'`);
    await s.context.close();
    const ok = m.status === 200 && after.status === 401 && after.data.error === "account_disabled" && rows === 0;
    return { layer: "browser", expected: "200 -> 401 account_disabled; session invalidated", actual: { before: m.status, after: after.status, error: after.data && after.data.error, session_rows_after: rows }, status: ok ? "PASS" : "FAIL" };
  });
  await test("D-08", "Logout and sign-out-everywhere clear the session cookie: the server expires it and it is gone from the browser's jar (the CSRF cookie is reported)", "AC-162, NFR-SEC-023", async () => {
    const user = createUser("cookieclear");
    const s = await loginReady(user);
    const responses = [];
    s.context.on("response", (r) => { if (/\/logout(-everywhere)?$/.test(new URL(r.url()).pathname)) responses.push(r); });
    await L.api(s.page, "/api/csrf");
    const jar = async () => (await s.context.cookies()).filter((c) => c.domain === "localhost").map((c) => c.name);
    const before = await jar();
    const out = await L.api(s.page, "/logout", { method: "POST" });
    const afterLogout = await jar();
    const s2 = await login(user, { context: s.context }); // a new session in the same browser
    await L.api(s2.page, "/api/csrf");
    const beforeEverywhere = await jar();
    const every = await L.api(s2.page, "/api/session/logout-everywhere", { method: "POST" });
    const afterEverywhere = await jar();
    const lines = [];
    for (const r of responses) for (const h of await r.headersArray().catch(() => [])) {
      if (h.name.toLowerCase() !== "set-cookie") continue;
      for (const line of h.value.split("\n")) lines.push({ path: new URL(r.url()).pathname, name: line.slice(0, line.indexOf("=")), expired: /Max-Age=0/i.test(line) });
    }
    await s.context.close();
    const expired = (path, name) => lines.some((l) => l.path.endsWith(path) && l.name === name && l.expired);
    const observable = lines.length > 0;
    const headersOk = !observable || (expired("/logout", L.SESSION_COOKIE) && expired("/logout-everywhere", L.SESSION_COOKIE));
    const ok = before.includes(L.SESSION_COOKIE) && out.status === 200 && !afterLogout.includes(L.SESSION_COOKIE)
      && beforeEverywhere.includes(L.SESSION_COOKIE) && every.status === 200 && !afterEverywhere.includes(L.SESSION_COOKIE) && headersOk;
    return { layer: "browser", expected: "session cookie present before, absent from the jar after logout and after sign-out-everywhere; where Set-Cookie is observable, both responses expire it (Max-Age=0)",
      actual: { jar_before: before, jar_after_logout: afterLogout, jar_after_logout_everywhere: afterEverywhere, set_cookie_observable: observable,
        logout_expires: { session: expired("/logout", L.SESSION_COOKIE), csrf: expired("/logout", L.CSRF_COOKIE) }, logout_everywhere_expires: { session: expired("/logout-everywhere", L.SESSION_COOKIE), csrf: expired("/logout-everywhere", L.CSRF_COOKIE) } },
      status: ok ? "PASS" : "FAIL" };
  });
}

// ---------- E: CSRF ----------
async function groupE() {
  const user = createUser("csrf");
  const s = await loginReady(user);
  const m = await L.api(s.page, "/api/me");
  await L.api(s.page, "/api/csrf");
  const uid = m.data.appUserId;
  const evt = () => Number(L.sql(`select count(*) from security_event where event='csrf_rejected'`));
  const post = (p, headers, body) => s.page.evaluate(async ({ p, headers, body }) => {
    const r = await fetch(p, { method: "POST", credentials: "same-origin", headers, body });
    let data = null; try { data = await r.json(); } catch { /* */ }
    return { status: r.status, error: data && data.error, cid: r.headers.get("X-Correlation-Id") };
  }, { p, headers, body });
  const realToken = (await s.context.cookies()).find((c) => c.name === L.CSRF_COOKIE).value;
  L.remember("csrf_token", realToken);

  const cases = [
    ["E-01", "No CSRF token (custom header present) on a no-body endpoint", "/api/session/logout-everywhere", { "X-CS-Request": "1" }, undefined, (r) => r.status === 403 && /^csrf_/.test(r.error)],
    ["E-02", "Forged CSRF token", "/api/session/logout-everywhere", { "X-CS-Request": "1", "X-XSRF-TOKEN": "forged-token-value-0001" }, undefined, (r) => r.status === 403 && r.error === "csrf_invalid"],
    ["E-03", "Valid token but missing custom header", "/api/session/logout-everywhere", { "X-XSRF-TOKEN": realToken }, undefined, (r) => r.status === 403 && r.error === "custom_header_missing"],
    ["E-04", "JSON body, no CSRF token, to an unmapped API path: CSRF layer rejects before routing", "/api/e2e-unmapped", { "X-CS-Request": "1", "Content-Type": "application/json" }, '{"x":1}', (r) => r.status === 403 && /^csrf_/.test(r.error)],
    ["E-05", "JSON body WITH valid CSRF+header to the same unmapped path: passes the security layer, reaches routing (404)", "/api/e2e-unmapped", { "X-CS-Request": "1", "X-XSRF-TOKEN": realToken, "Content-Type": "application/json" }, '{"x":1}', (r) => r.status === 404],
  ];
  for (const [id, title, p, headers, body, check] of cases) {
    await test(id, title, "AC-160, NFR-SEC-022, F-4", async () => {
      const e0 = evt();
      const r = await post(p, headers, body);
      const csrfEvent = evt() > e0;
      const ok = check(r) && sessionRows(uid) >= 1 && (/^E-0[124]$/.test(id) ? csrfEvent : true);
      return { layer: "browser", expected: "rejected by the named security control; session intact", actual: { status: r.status, error: r.error, csrf_rejected_event_recorded: csrfEvent, session_rows: sessionRows(uid) }, status: ok ? "PASS" : "FAIL" };
    });
  }

  await test("E-06", "Cross-session token: another user's valid CSRF token is rejected", "AC-160", async () => {
    const other = createUser("csrf2");
    const o = await loginReady(other);
    await L.api(o.page, "/api/csrf");
    const otherToken = (await o.context.cookies()).find((c) => c.name === L.CSRF_COOKIE).value;
    L.remember("csrf_token", otherToken);
    await o.context.close();
    const r = await post("/api/session/logout-everywhere", { "X-CS-Request": "1", "X-XSRF-TOKEN": otherToken });
    const ok = r.status === 403 && r.error === "csrf_invalid" && sessionRows(uid) >= 1;
    return { layer: "browser", expected: "403 csrf_invalid; session intact", actual: { status: r.status, error: r.error, session_rows: sessionRows(uid) }, status: ok ? "PASS" : "FAIL" };
  });

  await test("E-07", "Cookie-tossing simulation: victim session cookie + attacker-planted XSRF-TOKEN + matching _csrf (form, no custom header) on a no-body endpoint", "F-4", async () => {
    const http = await pwRequest.newContext({ ignoreHTTPSErrors: true });
    const sess = (await s.context.cookies()).find((c) => c.name === L.SESSION_COOKIE).value;
    const attacker = "attacker-chosen-csrf-token-0001";
    const baseHeaders = { Cookie: `${L.SESSION_COOKIE}=${sess}; ${L.CSRF_COOKIE}=${realToken}; XSRF-TOKEN=${attacker}` };
    const rows0 = sessionRows(uid);
    const r1 = await http.post(`${L.APP}/api/session/logout-everywhere`, { headers: baseHeaders, form: { _csrf: maskCsrf(attacker) }, maxRedirects: 0 });
    const r2 = await http.post(`${L.APP}/api/session/logout-everywhere`, { headers: { ...baseHeaders, "X-CS-Request": "1" }, form: { _csrf: maskCsrf(attacker) }, maxRedirects: 0 });
    const b1 = await r1.json().catch(() => ({})); const b2 = await r2.json().catch(() => ({}));
    const rows1 = sessionRows(uid);
    await http.dispose();
    const ok = r1.status() === 403 && /^csrf_/.test(b1.error) && r2.status() === 403 && /^csrf_/.test(b2.error) && rows1 === rows0;
    return { layer: "integration", expected: "both variants rejected by the CSRF layer (the app only trusts __Host-XSRF-TOKEN, which a sibling cannot set); no sessions deleted",
      actual: { without_custom_header: `${r1.status()} ${b1.error}`, with_custom_header: `${r2.status()} ${b2.error}`, sessions_before: rows0, sessions_after: rows1 }, status: ok ? "PASS" : "FAIL" };
  });

  await test("E-08", "Cross-site form POST from another site (no CORS preflight) cannot change state", "AC-161", async () => {
    const page = await s.context.newPage();
    await page.route("https://evil.example:8443/**", (route) => route.fulfill({ status: 200, contentType: "text/html",
      body: `<html><body><form id=f method=POST action="${L.APP}/api/session/logout-everywhere"><input name=x value=1></form><script>document.getElementById('f').submit()</script></body></html>` }));
    const csrfBefore = (await s.context.cookies()).find((c) => c.name === L.CSRF_COOKIE).value;
    const respP = page.waitForResponse((r) => r.url() === `${L.APP}/api/session/logout-everywhere`, { timeout: 15000 }).catch(() => null);
    await page.goto("https://evil.example:8443/attack", { waitUntil: "domcontentloaded" }).catch(() => {});
    const resp = await respP;
    const body = resp ? await resp.json().catch(() => ({})) : {};
    await page.close();
    const csrfAfter = (await s.context.cookies()).find((c) => c.name === L.CSRF_COOKIE).value;
    L.remember("csrf_token", csrfAfter);
    const ok = resp && resp.status() === 403 && /^csrf_/.test(body.error) && sessionRows(uid) >= 1;
    return { layer: "browser", expected: "server rejects with a CSRF error (Strict cookies not sent cross-site); session intact",
      actual: { status: resp && resp.status(), error: body.error, session_rows: sessionRows(uid),
        observation_csrf_cookie_reissued_by_rejection_response: csrfBefore !== csrfAfter }, status: ok ? "PASS" : "FAIL" };
  });

  await test("E-09", "Cross-site credentialed fetch from another site is blocked (CORS) and changes nothing", "AC-161", async () => {
    const page = await s.context.newPage();
    await page.route("https://evil.example:8443/**", (route) => route.fulfill({ status: 200, contentType: "text/html", body: "<html><body>evil</body></html>" }));
    await page.goto("https://evil.example:8443/x", { waitUntil: "domcontentloaded" });
    const r = await page.evaluate(async (app) => {
      const out = {};
      try { const x = await fetch(`${app}/api/session/logout-everywhere`, { method: "POST", credentials: "include", headers: { "X-CS-Request": "1", "Content-Type": "application/json" }, body: "{}" }); out.post = `status ${x.status}`; }
      catch (e) { out.post = `blocked: ${e.name}`; }
      try { const x = await fetch(`${app}/api/me`, { credentials: "include" }); out.read = `status ${x.status}`; }
      catch (e) { out.read = `blocked: ${e.name}`; }
      return out;
    }, L.APP);
    await page.close();
    const ok = /blocked/.test(r.post) && /blocked/.test(r.read) && sessionRows(uid) >= 1;
    return { layer: "browser", expected: "both blocked by the browser; session intact", actual: { ...r, session_rows: sessionRows(uid) }, status: ok ? "PASS" : "FAIL" };
  });

  await test("E-10", "Positive control: valid CSRF token (read at request time, like the SPA) + custom header on the no-body endpoint succeeds", "AC-160", async () => {
    const r = await L.api(s.page, "/api/session/logout-everywhere", { method: "POST" });
    const ok = r.status === 200 && sessionRows(uid) === 0;
    return { layer: "browser", expected: "200; the user's sessions are revoked", actual: { status: r.status, session_rows_after: sessionRows(uid) }, status: ok ? "PASS" : "FAIL" };
  });
  await s.context.close();
}

// ---------- H: step-up ----------
async function groupH() {
  const alice = createUser("stepup");
  const mallory = createUser("mallory");
  const m0 = await loginReady(mallory); await m0.context.close(); // enrol mallory's TOTP first
  const s = await loginReady(alice);
  const me = await L.api(s.page, "/api/me");
  const uid = me.data.appUserId;
  const authAtBefore = me.data.sessionAuthenticatedAt;

  await test("H-01", "Sensitive action, full sequence: the request executes nothing; step-up with prompt=login, max_age=0, acr_values=mfa (password + OTP); the review page shows the action and nothing has run; only the explicit Confirm executes it, exactly once", "AC-164, D-SEC-14, NFR-SEC-024", async () => {
    const req = await requestFixtureAction(s.page);
    const id = req.data && req.data.actionId;
    S.h1Action = id;
    const afterRequest = { executions: fixtureExecutions(uid), status: pendingStatus(id) };
    const step = await login(alice, { context: s.context, start: `${L.APP}/oauth2/authorization/keycloak?step_up=${id}` });
    S.stepUpCallback = step.net.callbackUrl;
    const q = step.net.authUrl ? new URL(step.net.authUrl).searchParams : new URLSearchParams();
    // The review page's own script must have run (and fetched the action) before "nothing ran" is asserted.
    const reviewRendered = await step.page.locator("#action-summary").waitFor({ timeout: 10000 }).then(() => true, () => false);
    const summary = reviewRendered ? await step.page.locator("#action-summary").innerText() : null;
    const beforeConfirm = { executions: fixtureExecutions(uid), status: pendingStatus(id) };
    const after = await L.api(step.page, "/api/me");
    const landed = new URL(step.page.url());
    const rows = sessionRows(uid);
    await step.page.click("#confirm");
    const result = await step.page.locator("#confirm-result").innerText({ timeout: 10000 }).catch(() => "");
    const afterConfirm = { executions: fixtureExecutions(uid), status: pendingStatus(id) };
    await step.page.close();
    const ok = req.status === 202 && req.data.status === "confirmation_required" && afterRequest.executions === 0 && afterRequest.status === "PENDING"
      && q.get("prompt") === "login" && q.get("max_age") === "0" && q.get("acr_values") === "mfa" && step.trace.includes("otp")
      && landed.pathname.startsWith("/review") && landed.searchParams.get("action") === id && reviewRendered && /no-op/.test(summary || "")
      && beforeConfirm.executions === 0 && beforeConfirm.status === "PENDING" && after.data?.freshAuth?.ok === true
      && after.data?.sessionAuthenticatedAt === authAtBefore && rows === 1
      && /result: 200 executed/.test(result) && afterConfirm.executions === 1 && afterConfirm.status === "EXECUTED";
    return { layer: "browser", expected: "202 confirmation_required, nothing run; step-up params; OTP re-entered; review page shows the action, still PENDING and not run; freshAuth ok; anchor unchanged; 1 session; Confirm -> 200 executed, exactly 1 execution, EXECUTED",
      actual: { request_status: req.status, request_body_status: req.data && req.data.status, after_request: afterRequest, prompt: q.get("prompt"), max_age: q.get("max_age"), acr_values: q.get("acr_values"), trace: step.trace,
        landed: landed.pathname, action_matches: landed.searchParams.get("action") === id, review_rendered: reviewRendered, summary, before_confirm: beforeConfirm, fresh_auth: after.data?.freshAuth ?? null,
        absolute_anchor_unchanged: after.data?.sessionAuthenticatedAt === authAtBefore, user_session_rows: rows, confirm_result: result, after_confirm: afterConfirm }, status: ok ? "PASS" : "FAIL" };
  });

  await test("H-06", "Replaying the confirmation is refused; the action does not run again", "AC-164, NFR-SEC-024", async () => {
    const replay = await L.api(s.page, `/api/sensitive-actions/${S.h1Action}/confirm`, { method: "POST" });
    const ok = replay.status === 409 && replay.data?.error === "action_not_pending" && fixtureExecutions(uid) === 1;
    return { layer: "browser", expected: "409 action_not_pending; still exactly 1 execution", actual: { status: replay.status, error: replay.data?.error, executions: fixtureExecutions(uid) }, status: ok ? "PASS" : "FAIL" };
  });

  await test("H-07", "Concurrent confirmations from the browser: exactly one executes, the rest are refused", "AC-164, NFR-SEC-024", async () => {
    const before = fixtureExecutions(uid);
    const req = await requestFixtureAction(s.page);
    const id = req.data && req.data.actionId;
    const statuses = await s.page.evaluate(async (id) => {
      const tok = document.cookie.split("; ").find((c) => c.startsWith("__Host-XSRF-TOKEN="));
      const h = { Accept: "application/json", "X-CS-Request": "1", "X-XSRF-TOKEN": decodeURIComponent(tok.split("=").slice(1).join("=")) };
      return Promise.all(Array.from({ length: 6 }, () => fetch(`/api/sensitive-actions/${id}/confirm`, { method: "POST", headers: h, credentials: "same-origin" }).then((r) => r.status)));
    }, id);
    const executed = fixtureExecutions(uid) - before;
    const ok = req.status === 202 && statuses.filter((x) => x === 200).length === 1 && statuses.filter((x) => x === 409).length === 5 && executed === 1 && pendingStatus(id) === "EXECUTED";
    return { layer: "browser", expected: "6 parallel confirms -> one 200, five 409; exactly one execution", actual: { request_status: req.status, statuses, executions: executed, status: pendingStatus(id) }, status: ok ? "PASS" : "FAIL" };
  });

  await test("H-08", "Refused confirmations change nothing: another user's action, an unknown id, no CSRF token, a cancelled action, an expired action (which also cannot start a step-up)", "AC-164, AC-160, NFR-SEC-024", async () => {
    const malloryUid = L.sql(`select id from app_user where email like '${mallory.username}@%' limit 1`);
    const foreign = crypto.randomUUID();
    L.sql(`insert into pending_action(id,user_id,action_type,context,status) values ('${foreign}','${malloryUid}','dev.fixture.noop','{}','PENDING')`);
    const r = {};
    r.foreign = (await L.api(s.page, `/api/sensitive-actions/${foreign}/confirm`, { method: "POST" })).status;
    r.foreign_review = (await L.api(s.page, `/api/sensitive-actions/${foreign}`)).status;
    r.unknown = (await L.api(s.page, `/api/sensitive-actions/${crypto.randomUUID()}/confirm`, { method: "POST" })).status;
    const a = (await requestFixtureAction(s.page)).data.actionId;
    const noCsrf = await L.api(s.page, `/api/sensitive-actions/${a}/confirm`, { method: "POST", raw: true, headers: { "X-CS-Request": "1" } });
    r.no_csrf = `${noCsrf.status}:${noCsrf.data && noCsrf.data.error}`;
    r.no_csrf_after = pendingStatus(a);
    r.cancel = (await L.api(s.page, `/api/sensitive-actions/${a}/cancel`, { method: "POST" })).status;
    r.confirm_cancelled = (await L.api(s.page, `/api/sensitive-actions/${a}/confirm`, { method: "POST" })).status;
    const e = (await requestFixtureAction(s.page)).data.actionId;
    L.sql(`update pending_action set created_at = now() - interval '301 seconds' where id='${e}'`);
    const exp = await L.api(s.page, `/api/sensitive-actions/${e}/confirm`, { method: "POST" });
    r.expired = `${exp.status}:${exp.data && exp.data.error}`;
    const page = await s.context.newPage();
    let authUrl = null;
    page.on("request", (x) => { if (x.url().includes("/protocol/openid-connect/auth")) authUrl = x.url(); });
    await page.goto(`${L.APP}/oauth2/authorization/keycloak?step_up=${e}`, { waitUntil: "domcontentloaded" }).catch(() => {});
    await page.close();
    r.expired_step_up_prompt = authUrl ? new URL(authUrl).searchParams.get("prompt") : "no-auth-request";
    r.mallory_action_status = pendingStatus(foreign);
    r.executions_alice = fixtureExecutions(uid); r.executions_mallory = fixtureExecutions(malloryUid);
    const ok = r.foreign === 404 && r.foreign_review === 404 && r.unknown === 404 && /^403:csrf/.test(r.no_csrf) && r.no_csrf_after === "PENDING"
      && r.cancel === 200 && r.confirm_cancelled === 409 && r.expired === "410:action_expired" && authUrl && r.expired_step_up_prompt === null
      && r.mallory_action_status === "PENDING" && r.executions_alice === 2 && r.executions_mallory === 0;
    return { layer: "browser", expected: "foreign 404 (confirm and review); unknown 404; no CSRF token 403 csrf_*, still PENDING; cancel 200 then confirm 409; expired 410 and a step-up for it gets no step-up parameters; nothing executed",
      actual: r, status: ok ? "PASS" : "FAIL" };
  });

  await test("H-02", "Replay of the step-up callback is rejected", "AC-157, AC-164", async () => {
    const ctx = await browser.newContext(L.contextOptions); const page = await ctx.newPage();
    await page.goto(S.stepUpCallback, { waitUntil: "domcontentloaded" }).catch(() => {});
    const landed = page.url(); const r = await L.api(page, "/api/me"); await ctx.close();
    const ok = /auth_error=/.test(landed) && r.status === 401;
    return { layer: "browser", expected: "auth_error; no session", actual: { landed_error: (landed.match(/auth_error=[a-z_]+/) || [null])[0], me_status: r.status }, status: ok ? "PASS" : "FAIL" };
  });

  await test("H-03", "Step-up for ANOTHER user's pending action is not honoured (no step-up parameters)", "AC-164", async () => {
    const otherId = crypto.randomUUID();
    const malloryUid = L.sql(`select id from app_user where sub=(select sub from app_user where email like '${mallory.username}@%' limit 1) limit 1`);
    L.sql(`insert into pending_action(id,user_id,action_type,status) values ('${otherId}','${malloryUid}','e2e.sensitive.test','PENDING')`);
    const page = await s.context.newPage();
    let authUrl = null;
    page.on("request", (r) => { if (r.url().includes("/protocol/openid-connect/auth")) authUrl = r.url(); });
    await page.goto(`${L.APP}/oauth2/authorization/keycloak?step_up=${otherId}`, { waitUntil: "domcontentloaded" }).catch(() => {});
    await page.close();
    const q = authUrl ? new URL(authUrl).searchParams : new URLSearchParams();
    const ok = authUrl && !q.get("prompt") && !q.get("max_age");
    return { layer: "browser", expected: "resolver ignores a foreign action id: no prompt/max_age step-up params", actual: { auth_request_seen: Boolean(authUrl), prompt: q.get("prompt"), max_age: q.get("max_age") }, status: ok ? "PASS" : "FAIL" };
  });

  await test("H-04", "A different person completing the step-up is rejected (same-user binding); session invalidated; action not executed", "AC-164", async () => {
    const id = crypto.randomUUID();
    L.sql(`insert into pending_action(id,user_id,action_type,status) values ('${id}','${uid}','e2e.sensitive.test','PENDING')`);
    // Precondition: alice holds a live session, otherwise no step-up is started and the test is vacuous.
    const precondition = (await L.api(s.page, "/api/me")).status === 200 && sessionRows(uid) === 1;
    const mismatchBefore = Number(L.sql(`select count(*) from security_event where event='reauth_user_mismatch' and app_user_id='${uid}'`));
    await s.context.clearCookies({ domain: "host.docker.internal" }); // a different person at the IdP, no SSO carry-over
    const step = await login(mallory, { context: s.context, start: `${L.APP}/oauth2/authorization/keycloak?step_up=${id}` });
    const q = step.net.authUrl ? new URL(step.net.authUrl).searchParams : new URLSearchParams();
    const landed = step.page.url();
    const after = await L.api(step.page, "/api/me");
    const status = L.sql(`select status from pending_action where id='${id}'`);
    const mismatch = Number(L.sql(`select count(*) from security_event where event='reauth_user_mismatch' and app_user_id='${uid}'`)) - mismatchBefore;
    const ok = precondition && q.get("prompt") === "login" && /auth_error=reauth_user_mismatch/.test(landed) && after.status === 401 && status === "PENDING" && mismatch === 1 && sessionRows(uid) === 0;
    return { layer: "browser", expected: "precondition: alice signed in; step-up started (prompt=login); auth_error=reauth_user_mismatch; one mismatch event for alice; alice's session invalidated; action still PENDING",
      actual: { precondition_alice_signed_in: precondition, step_up_started: q.get("prompt") === "login", trace: step.trace, landed_error: (landed.match(/auth_error=[a-z_]+/) || [null])[0], me_status: after.status, pending_status: status, alice_session_rows: sessionRows(uid), mismatch_events_for_alice: mismatch }, status: ok ? "PASS" : "FAIL" };
  });
  await s.context.close();

  await test("H-05", "A step-up that is refused at the callback (account disabled mid-step-up) ends the originating session: no orphaned server-side session remains", "AC-163, AC-164", async () => {
    const user = createUser("stepupabort");
    const t = await loginReady(user);
    const tuid = (await L.api(t.page, "/api/me")).data.appUserId;
    const before = sessionRows(tuid);
    const id = crypto.randomUUID();
    L.sql(`insert into pending_action(id,user_id,action_type,status) values ('${id}','${tuid}','e2e.sensitive.test','PENDING')`);
    const page = await t.context.newPage();
    let authUrl = null;
    page.on("request", (r) => { if (r.url().includes("/protocol/openid-connect/auth")) authUrl = r.url(); });
    await page.goto(`${L.APP}/oauth2/authorization/keycloak?step_up=${id}`, { waitUntil: "domcontentloaded" });
    L.sql(`update app_user set disabled = true where id='${tuid}'`); // disabled while the user is at the IdP
    const trace = await L.keycloakLogin(page, user);
    await page.waitForLoadState("networkidle").catch(() => {});
    const landed = page.url();
    const me = await L.api(page, "/api/me");
    const rows = sessionRows(tuid);
    const status = L.sql(`select status from pending_action where id='${id}'`);
    L.sql(`update app_user set disabled = false where id='${tuid}'`);
    await t.context.close();
    const stepUp = authUrl && new URL(authUrl).searchParams.get("prompt") === "login";
    const ok = before === 1 && stepUp && /auth_error=account_disabled/.test(landed) && me.status === 401 && rows === 0 && status === "PENDING";
    return { layer: "browser", expected: "precondition 1 session; step-up started; auth_error=account_disabled; browser signed out; 0 server-side sessions; action PENDING",
      actual: { session_rows_before: before, step_up_started: Boolean(stepUp), trace, landed_error: (landed.match(/auth_error=[a-z_]+/) || [null])[0], me_status: me.status, session_rows_after: rows, pending_status: status }, status: ok ? "PASS" : "FAIL" };
  });
}

// ---------- R: MFA recovery controls (no self-service reset; administrator-assisted reset) ----------
async function groupR() {
  await test("R-01", "No self-service MFA reset: no reset link on the login page; the reset endpoint is refused; a signed-in user's account console offers no way to remove the authenticator and the account API refuses the deletion; the factor remains", "D-SEC-14 (recovery), NFR-SEC-026", async () => {
    const u = createUser("selfreset");
    const ctx = await browser.newContext(L.contextOptions);
    const page = await ctx.newPage();
    await page.goto(`${L.APP}/oauth2/authorization/keycloak`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("#username");
    const resetLinks = await page.locator("a[href*='reset-credentials']").count();
    await page.goto(`${L.KC}/realms/clearsettle/login-actions/reset-credentials?client_id=clearsettle-web`, { waitUntil: "domcontentloaded" });
    const resetPage = (await page.locator("body").innerText()).replace(/\s+/g, " ");
    const resetRefused = /not allowed/i.test(resetPage) && !(await page.locator("#username").count());
    let bearer = null;
    page.on("request", (r) => { const a = r.headers()["authorization"]; if (a && a.startsWith("Bearer ") && r.url().includes("/account")) { bearer = a; L.remember("bearer", a.slice(7)); } });
    await page.goto(`${L.KC}/realms/clearsettle/account/`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("#username");
    const trace = await L.keycloakLogin(page, u);
    await page.goto(`${L.KC}/realms/clearsettle/account/account-security/signing-in`, { waitUntil: "networkidle" }).catch(() => {});
    await page.getByText("Authenticator application").first().waitFor({ timeout: 15000 }).catch(() => {});
    const controls = await page.locator("button, a").evaluateAll((els) => els.map((e) => (e.innerText || e.getAttribute("aria-label") || "").trim()).filter(Boolean));
    const removalOffered = controls.some((t) => /delete|remove/i.test(t));
    const id = kcUserId(u);
    const otp = JSON.parse(L.kcadm(`get users/${id}/credentials -r clearsettle`)).find((c) => c.type === "otp");
    const del = bearer && otp ? await page.evaluate(async ({ url, auth }) => (await fetch(url, { method: "DELETE", headers: { Authorization: auth } })).status,
      { url: `${L.KC}/realms/clearsettle/account/credentials/${otp.id}`, auth: bearer }) : null;
    const after = JSON.parse(L.kcadm(`get users/${id}/credentials -r clearsettle`)).map((c) => c.type);
    await ctx.close();
    const ok = resetLinks === 0 && resetRefused && trace.includes("otp-enrol") && controls.length > 3 && !removalOffered && del !== null && (del < 200 || del >= 300) && after.includes("otp");
    return { layer: "browser", expected: "no reset link; reset endpoint 'not allowed'; account console without delete/remove; account API DELETE refused; OTP credential still present",
      actual: { reset_links: resetLinks, reset_endpoint_refused: resetRefused, account_console_trace: trace, account_console_controls: controls, removal_offered: removalOffered, account_api_delete_status: del, credentials_after: after },
      status: ok ? "PASS" : "FAIL" };
  });

  await test("R-02", "Administrator-assisted MFA reset: the factor removal is an admin event naming the administrator; the user must enrol a new authenticator (the old code is not accepted); the enrolment sign-in gets no session and the next sign-in with the new code does, on the same account. The pre-reset application session survives the IdP-side reset and is ended by the interim operator step", "D-SEC-14 (recovery), NFR-SEC-026, NFR-SEC-023", async () => {
    const u = createUser("recover");
    const before = await loginReady(u);
    const uid = (await L.api(before.page, "/api/me")).data.appUserId;
    const oldSecret = u.totpSecret;
    const id = kcUserId(u);
    const otp = JSON.parse(L.kcadm(`get users/${id}/credentials -r clearsettle`)).find((c) => c.type === "otp");
    const t0 = Date.now() - 5000;
    // Administrator actions after the (manual, out-of-band) identity verification.
    L.kcadm(`delete users/${id}/credentials/${otp.id} -r clearsettle`);
    L.kcadm(`update users/${id} -r clearsettle -s 'requiredActions=["CONFIGURE_TOTP"]'`);
    L.kcadm(`create users/${id}/logout -r clearsettle`);
    const adminEvents = JSON.parse(L.kcadm(`get admin-events -r clearsettle`)).filter((e) => e.time >= t0 && (e.resourcePath || "").includes(id));
    // Keycloak records the credential removal as an ACTION admin event on the credential's resource path.
    const removal = adminEvents.find((e) => e.resourcePath === `users/${id}/credentials/${otp.id}`);
    const preResetSession = (await L.api(before.page, "/api/me")).status; // no back-channel logout: expected to still be 200
    // Interim operator step (until an audited admin session revocation or back-channel logout exists).
    L.sql(`delete from spring_session where principal_name='${uid}'`);
    const preResetAfterOperator = (await L.api(before.page, "/api/me")).status;
    await before.context.close();
    u.totpSecret = null;
    const first = await login(u);
    const landed = first.page.url();
    const firstMe = await L.api(first.page, "/api/me");
    const second = await login(u, { context: first.context });
    const me = await L.api(second.page, "/api/me");
    await first.context.close();
    const oldCode = await singleAttempt(u, { code: await L.totpFor(oldSecret) });
    const ok = removal && removal.authDetails && removal.authDetails.userId && removal.authDetails.realmId
      && first.trace.includes("otp-enrol") && first.trace.indexOf("otp") === -1 && /auth_error=mfa_not_verified/.test(landed) && firstMe.status === 401
      && u.totpSecret && u.totpSecret !== oldSecret && me.status === 200 && me.data.appUserId === uid && oldCode.otpShown && oldCode.onIdp && oldCode.me === 401
      && preResetAfterOperator === 401;
    return { layer: "browser", expected: "admin event on the removed credential with the administrator's identity; re-enrolment forced (no OTP prompt for the old factor); enrolment sign-in refused; next sign-in -> same app user; old code refused; operator step ends the pre-reset session",
      actual: { admin_event: removal ? { operation: removal.operationType, resource: "users/<id>/credentials/<cred>", admin_user_present: Boolean(removal.authDetails && removal.authDetails.userId), admin_realm: removal.authDetails && removal.authDetails.realmId } : null,
        pre_reset_session_after_idp_reset: preResetSession, pre_reset_session_after_operator_step: preResetAfterOperator,
        reenrol_trace: first.trace, reenrol_landed_error: (landed.match(/auth_error=[a-z_]+/) || [null])[0], new_factor_differs: Boolean(u.totpSecret && u.totpSecret !== oldSecret),
        after_reenrol_me: me.status, same_app_user: me.data && me.data.appUserId === uid, old_code_attempt: oldCode },
      status: ok ? "PASS" : "FAIL" };
  });
}

// ---------- M: two application instances on one PostgreSQL session store ----------
const INSTANCE_2 = "http://127.0.0.1:8082";
/** A request straight to the second instance with the given browser cookies, as a load balancer would route it. */
async function onInstance2(cookies, p, { method = "GET" } = {}) {
  const jar = Object.fromEntries(cookies.map((c) => [c.name, c.value]));
  const headers = { Accept: "application/json", Cookie: Object.entries(jar).filter(([n]) => n.startsWith("__Host-")).map(([n, v]) => `${n}=${v}`).join("; ") };
  if (method !== "GET") { headers["X-XSRF-TOKEN"] = decodeURIComponent(jar[L.CSRF_COOKIE] || ""); headers["X-CS-Request"] = "1"; }
  const r = await fetch(INSTANCE_2 + p, { method, headers, redirect: "manual" });
  let data = null; try { data = await r.json(); } catch { /* not json */ }
  return { status: r.status, data };
}
const appCookies = (context) => context.cookies(L.APP);

async function groupM() {
  await test("M-00", "Precondition: a second application instance (separate container, same image) serves the API against the same PostgreSQL session store", "AC-163, NFR-SEC-023", async () => {
    const health = await fetch(`${INSTANCE_2}/actuator/health`).then((r) => r.json()).catch(() => null);
    const inspect = (n) => { try { return execFileSync("docker", ["inspect", "-f", "{{.Id}} {{.Config.Image}}", n], { encoding: "utf8" }).trim().split(" "); } catch { return [null, null]; } };
    const [id1, img1] = inspect("clearsettle-backend"); const [id2, img2] = inspect("clearsettle-backend-2");
    S.instance2 = Boolean(health && health.status === "UP" && id1 && id2 && id1 !== id2 && img1 === img2);
    return { layer: "integration", expected: "instance 2 health UP; two different containers of the same image", actual: { health: health && health.status, containers_differ: Boolean(id1 && id2 && id1 !== id2), same_image: img1 === img2 }, status: S.instance2 ? "PASS" : "FAIL" };
  });
  if (!S.instance2) return;

  const user = createUser("multi");
  const a = await loginReady(user); // via the proxy: instance 1
  const uid = (await L.api(a.page, "/api/me")).data.appUserId;
  await L.api(a.page, "/api/csrf");

  await test("M-01", "A session created on instance 1 is valid on instance 2 with the same user and the same absolute expiry", "D-SEC-11, NFR-SEC-023", async () => {
    const me2 = await onInstance2(await appCookies(a.context), "/api/me");
    const s1 = await L.api(a.page, "/api/session");
    const s2 = await onInstance2(await appCookies(a.context), "/api/session");
    const ok = me2.status === 200 && me2.data.appUserId === uid && s2.data && s2.data.absoluteExpiresAt === s1.data.absoluteExpiresAt;
    return { layer: "integration", expected: "instance 2: 200, same appUserId, same absoluteExpiresAt", actual: { me_on_2: me2.status, same_user: me2.data && me2.data.appUserId === uid, same_absolute_expiry: s2.data && s2.data.absoluteExpiresAt === s1.data.absoluteExpiresAt }, status: ok ? "PASS" : "FAIL" };
  });

  await test("M-02", "Single use across instances: a sensitive action requested on instance 1 and confirmed on instance 2 executes once; a replay on instance 1 is refused", "AC-164, NFR-SEC-024", async () => {
    const req = await requestFixtureAction(a.page);
    const id = req.data && req.data.actionId;
    const c2 = await onInstance2(await appCookies(a.context), `/api/sensitive-actions/${id}/confirm`, { method: "POST" });
    const replay1 = await L.api(a.page, `/api/sensitive-actions/${id}/confirm`, { method: "POST" });
    const ok = req.status === 202 && c2.status === 200 && replay1.status === 409 && fixtureExecutions(uid) === 1;
    return { layer: "integration", expected: "202; confirm on instance 2 -> 200; replay on instance 1 -> 409; 1 execution", actual: { request: req.status, confirm_on_2: c2.status, replay_on_1: replay1.status, executions: fixtureExecutions(uid) }, status: ok ? "PASS" : "FAIL" };
  });

  await test("M-03", "Sign-out-everywhere on instance 2 ends both browsers' sessions, refused on both instances", "AC-163", async () => {
    const b = await login(user); // a second browser
    const rowsBefore = sessionRows(uid);
    const aCookies = await appCookies(a.context); const bCookies = await appCookies(b.context);
    const out = await onInstance2(aCookies, "/api/session/logout-everywhere", { method: "POST" });
    const r = { a_on_1: (await L.api(a.page, "/api/me")).status, b_on_1: (await L.api(b.page, "/api/me")).status,
      a_on_2: (await onInstance2(aCookies, "/api/me")).status, b_on_2: (await onInstance2(bCookies, "/api/me")).status };
    await b.context.close();
    const ok = rowsBefore === 2 && out.status === 200 && Object.values(r).every((x) => x === 401) && sessionRows(uid) === 0;
    return { layer: "integration+browser", expected: "2 sessions; logout-everywhere on instance 2 -> 200; both sessions 401 on instance 1 (browser) and instance 2; 0 rows", actual: { rows_before: rowsBefore, logout_everywhere_on_2: out.status, ...r, rows_after: sessionRows(uid) }, status: ok ? "PASS" : "FAIL" };
  });
  await a.context.close();

  await test("M-04", "Logout on instance 1: the old session cookie is refused on instance 2", "AC-162, AC-163", async () => {
    const c = await login(user);
    const cookies = await appCookies(c.context);
    const before2 = (await onInstance2(cookies, "/api/me")).status;
    await L.api(c.page, "/api/csrf");
    const out = await L.api(c.page, "/logout", { method: "POST" });
    const after2 = (await onInstance2(cookies, "/api/me")).status;
    await c.context.close();
    const ok = before2 === 200 && out.status === 200 && after2 === 401;
    return { layer: "integration+browser", expected: "200 on instance 2 before; logout on instance 1; 401 on instance 2 after", actual: { before_on_2: before2, logout_on_1: out.status, after_on_2: after2 }, status: ok ? "PASS" : "FAIL" };
  });

  await test("M-05", "Disabling the user is enforced by instance 2 on its next request, and by instance 1", "AC-163, NFR-SEC-023", async () => {
    const c = await login(user);
    const cookies = await appCookies(c.context);
    L.sql(`update app_user set disabled = true where id='${uid}'`);
    const on2 = await onInstance2(cookies, "/api/me");
    const on1 = await L.api(c.page, "/api/me");
    L.sql(`update app_user set disabled = false where id='${uid}'`);
    await c.context.close();
    const ok = on2.status === 401 && on2.data && on2.data.error === "account_disabled" && on1.status === 401 && sessionRows(uid) === 0;
    return { layer: "integration+browser", expected: "instance 2: 401 account_disabled; instance 1: 401; session removed", actual: { on_2: on2.status, on_2_error: on2.data && on2.data.error, on_1: on1.status, rows_after: sessionRows(uid) }, status: ok ? "PASS" : "FAIL" };
  });

  await test("M-06", "Idle and absolute expiry recorded in the shared store are enforced by instance 2", "D-SEC-13, NFR-SEC-023", async () => {
    const c = await login(user);
    const cookies = await appCookies(c.context);
    L.sql(`update spring_session set last_access_time = last_access_time - ${16 * 60 * 1000}, expiry_time = expiry_time - ${16 * 60 * 1000} where principal_name='${uid}'`);
    const idle = await onInstance2(cookies, "/api/me");
    await c.context.close();
    const d = await login(user);
    const dCookies = await appCookies(d.context);
    setAuthenticatedAt(uid, Math.floor(Date.now() / 1000) - 28800 - 60);
    const abs = await onInstance2(dCookies, "/api/me");
    await d.context.close();
    const ok = idle.status === 401 && abs.status === 401 && abs.data && abs.data.error === "session_expired";
    return { layer: "integration", expected: "idle > 15 min -> 401 on instance 2; past 8 h -> 401 session_expired on instance 2", actual: { idle_on_2: idle.status, absolute_on_2: abs.status, absolute_error: abs.data && abs.data.error }, status: ok ? "PASS" : "FAIL" };
  });
}

// ---------- K: sibling-host cookie tossing (browser cookie policy; no login needed) ----------
async function groupK() {
  await test("K-01", "Sibling-subdomain cookie tossing: a sibling host cannot plant a __Host- cookie for the shared parent domain (control: a non-prefixed parent-domain cookie IS planted)", "F-4, D-SEC-15", async () => {
    const ctx = await browser.newContext(L.contextOptions);
    const page = (script) => `<html><body><script>${script}</script></body></html>`;
    await ctx.route("https://evil.clearsettle-e2e.test:8443/**", (r) => r.fulfill({ status: 200, contentType: "text/html", body: page(
      "document.cookie='__Host-XSRF-TOKEN=tossed-prefixed; Domain=clearsettle-e2e.test; Path=/; Secure';" +
      "document.cookie='XSRF-TOKEN=tossed-plain; Domain=clearsettle-e2e.test; Path=/; Secure';") }));
    await ctx.route("https://app.clearsettle-e2e.test:8443/**", (r) => r.fulfill({ status: 200, contentType: "text/html", body: page("") }));
    const p = await ctx.newPage();
    await p.goto("https://evil.clearsettle-e2e.test:8443/");
    await p.goto("https://app.clearsettle-e2e.test:8443/");
    const visibleToApp = await p.evaluate(() => document.cookie);
    const jar = (await ctx.cookies()).map((c) => `${c.name}@${c.domain}`);
    await ctx.close();
    const prefixedPlanted = visibleToApp.includes("tossed-prefixed");
    const plainPlanted = visibleToApp.includes("tossed-plain");
    const ok = !prefixedPlanted && plainPlanted;
    return { layer: "browser", expected: "app host sees the plain tossed cookie (control: tossing works for unprefixed names) but NOT a tossed __Host- cookie",
      actual: { tossed_host_prefixed_visible_to_app: prefixedPlanted, tossed_plain_visible_to_app: plainPlanted, jar }, status: ok ? "PASS" : "FAIL" };
  });
}

// ---------- G: log-leak scan over this run's window ----------
async function groupG() {
  await test("G-01", "No secret observed in this run appears in any container log or the security_event table; callback lines are logged without their query; the AC-168 events were recorded", "AC-168, NFR-SEC-012/025, F-1", async () => {
    const sources = {
      proxy: L.dockerLogs("clearsettle-proxy", RUN_START), backend: L.dockerLogs("clearsettle-backend", RUN_START),
      keycloak: L.dockerLogs("clearsettle-keycloak", RUN_START), postgres: L.dockerLogs("clearsettle-db", RUN_START),
      security_event: L.sql(`select coalesce(string_agg(coalesce(correlation_id,'')||' '||event||' '||coalesce(detail,''), E'\\n'), '') from security_event where at >= '${RUN_START}'`),
    };
    if (GROUPS.includes("M")) sources.backend_2 = L.dockerLogs("clearsettle-backend-2", RUN_START);
    const needles = new Map();
    for (const [label, set] of L.observed) for (const v of set) needles.set(v, label);
    for (const [k, v] of Object.entries(L.ENV)) if (v && v.length >= 8) needles.set(v, `env:${k}`);
    const hits = [];
    for (const [src, text] of Object.entries(sources)) for (const [v, label] of needles) if (text.includes(v)) hits.push(`${src}:${label}`);
    const counts = Object.fromEntries([...L.observed].map(([k, s]) => [k, s.size]));
    const redactedCallbacks = (sources.proxy.match(/"GET \/login\/oauth2\/code\/keycloak HTTP\/[0-9.]+" \d{3} [^\n]*redacted_query/g) || []).length;
    const callbacksWithQuery = (sources.proxy.match(/\/login\/oauth2\/code\/keycloak\?/g) || []).length;
    const eventsWithCid = Number(L.sql(`select count(*) from security_event where at >= '${RUN_START}' and correlation_id is not null`));
    const eventsTotal = Number(L.sql(`select count(*) from security_event where at >= '${RUN_START}'`));
    // AC-168's event list, each with the group whose tests produce it; only groups that ran are required.
    const ac168 = { login_success: "B", login_failure: "H", step_up_success: "H", logout: "D", logout_everywhere: "D", csrf_rejected: "E",
      sensitive_action_requested: "H", sensitive_action_executed: "H", sensitive_action_refused: "H" };
    const seenTypes = L.sql(`select coalesce(string_agg(distinct event, ','), '') from security_event where at >= '${RUN_START}'`).split(",").filter(Boolean);
    const requiredTypes = Object.entries(ac168).filter(([, g]) => GROUPS.includes(g)).map(([e]) => e);
    const missingTypes = requiredTypes.filter((e) => !seenTypes.includes(e));
    const ok = hits.length === 0 && redactedCallbacks > 0 && callbacksWithQuery === 0 && (counts.auth_code || 0) > 0 && eventsTotal > 0 && eventsWithCid === eventsTotal
      && missingTypes.length === 0;
    return { layer: "integration", expected: "0 hits across proxy/backend/keycloak/postgres logs + security_event; redacted callback lines present; no callback query logged; every event has a correlation id; every AC-168 event type of the groups run was recorded",
      actual: { secrets_checked_by_type: counts, env_values_checked: Object.keys(L.ENV).length, hits, redacted_callback_lines: redactedCallbacks, callback_lines_with_query: callbacksWithQuery,
        security_events: eventsTotal, security_events_with_correlation_id: eventsWithCid, ac168_event_types_required: requiredTypes, ac168_event_types_missing: missingTypes }, status: ok ? "PASS" : "FAIL" };
  });
}

// ---------- A: preflight (every run) — the proxy serves the app shell and its script runs ----------
// The other groups drive the IdP and the API directly, so a proxy serving no frontend (e.g. a stale bind
// mount after rebuilding frontend/out) would otherwise go unnoticed.
async function preflight() {
  await test("A-01", "The proxy serves the app shell (/, /review/); its script runs against the API; anonymous visits create no server-side session", "D-SEC-11, NFR-SEC-020", async () => {
    const t0 = Number(L.sql(`select (extract(epoch from now()) * 1000)::bigint`)) - 2000;
    const ctx = await browser.newContext(L.contextOptions);
    const page = await ctx.newPage();
    const home = await page.goto(`${L.APP}/`, { waitUntil: "domcontentloaded" });
    const homeRendered = await page.locator("#me-status").filter({ hasText: "not authenticated" }).waitFor({ timeout: 10000 }).then(() => true, () => false);
    const review = await page.goto(`${L.APP}/review/?action=preflight`, { waitUntil: "domcontentloaded" });
    const reviewRendered = await page.locator("#action-id").filter({ hasText: "preflight" }).waitFor({ timeout: 10000 }).then(() => true, () => false);
    const sessionCookie = await L.cookieInfo(ctx, L.SESSION_COOKIE);
    await ctx.close();
    const created = Number(L.sql(`select count(*) from spring_session where creation_time >= ${t0}`));
    const ok = home.status() === 200 && homeRendered && review.status() === 200 && reviewRendered && created === 0 && !sessionCookie;
    return { layer: "browser", expected: "200 + rendered home (anonymous) and review pages; 0 sessions created; no session cookie",
      actual: { home_status: home.status(), home_rendered: homeRendered, review_status: review.status(), review_rendered: reviewRendered, sessions_created: created, session_cookie_set: !!sessionCookie },
      status: ok ? "PASS" : "FAIL" };
  });
}

const RUN_START = new Date().toISOString();
const FNS = { P: groupP, B: groupB, C: groupC, D: groupD, E: groupE, H: groupH, R: groupR, K: groupK, M: groupM, G: groupG };
(async () => {
  browser = await L.launch(BROWSER);
  try {
    await preflight();
    for (const g of GROUPS) {
      if (!FNS[g]) continue;
      if ((g === "C" || g === "D") && !S.aliceSession) await groupB();
      console.log(`\n=== ${BROWSER} group ${g} ===`);
      try {
        await FNS[g]();
      } catch (e) { // a setup failure must be recorded, never silently end the run
        rec.add({ id: `${g}-SETUP`, title: `group ${g} setup failed; remaining tests in this group did not run`, layer: "harness", status: "ERROR", actual: String(e && e.stack || e).slice(0, 600) });
      }
    }
  } finally {
    if (S.aliceSession) await S.aliceSession.context.close().catch(() => {});
    await browser.close();
    const file = rec.save(`-${GROUPS.join("")}`);
    const t = rec.rows.reduce((a, r) => ((a[r.status] = (a[r.status] || 0) + 1), a), {});
    console.log(`\nsaved ${file}\ntotals ${JSON.stringify(t)}`);
  }
})();
