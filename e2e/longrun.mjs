// Real wall-clock checks against the integrated app's PRODUCTION policy values (no shortened timers):
//  - 15-minute idle timeout: an idle session is refused after 15 min; an active one is not.
//  - 5-minute fresh-authentication window: freshAuth turns false after 5 min even for an active session.
// Takes ~16 minutes. Usage: node longrun.mjs [chromium|firefox]
import crypto from "node:crypto";
import * as L from "./lib.mjs";

const BROWSER = process.argv[2] || "chromium";
const rec = new L.Recorder(BROWSER);
const tag = `lr${Date.now().toString(36).slice(-5)}`;
const browser = await L.launch(BROWSER);
const t = () => Math.round((Date.now() - t0) / 1000);
const waitUntil = async (s) => { const ms = t0 + s * 1000 - Date.now(); if (ms > 0) await L.sleep(ms); };

const username = `idle-${tag}`;
const password = `Pw-${crypto.randomBytes(12).toString("base64url")}`;
L.remember("password", password);
L.kcadm(`create users -r clearsettle -s username=${username} -s enabled=true -s email=${username}@example.test -s emailVerified=true -s firstName=Idle -s lastName=Synthetic -s 'requiredActions=["CONFIGURE_TOTP"]'`);
L.kcadm(`set-password -r clearsettle --username ${username} --new-password ${password}`);
const user = { username, password, totpSecret: null };

async function session() {
  const ctx = await browser.newContext(L.contextOptions);
  for (let attempt = 0; attempt < 2; attempt++) { // a new user's enrolment login gets no session; sign in again
    const page = await ctx.newPage();
    await page.goto(`${L.APP}/oauth2/authorization/keycloak`, { waitUntil: "domcontentloaded" });
    await L.keycloakLogin(page, user);
    await page.waitForLoadState("networkidle").catch(() => {});
    if ((await L.api(page, "/api/me")).status === 200) return { ctx, page };
  }
  throw new Error("could not establish a session");
}

const A = await session(); // will stay idle
const B = await session(); // will stay active
let t0 = Date.now();
const a0 = await L.api(A.page, "/api/me"); // A's last activity
t0 = Date.now();
const b0 = await L.api(B.page, "/api/me");
const log = [{ t: 0, a: a0.status, b: b0.status, b_fresh: b0.data && b0.data.freshAuth }];

await waitUntil(330); // 5.5 min
const b1 = await L.api(B.page, "/api/me");
log.push({ t: t(), b: b1.status, b_fresh: b1.data && b1.data.freshAuth });
await waitUntil(660); // 11 min: keep B active
const b2 = await L.api(B.page, "/api/me");
log.push({ t: t(), b: b2.status });
await waitUntil(15 * 60 + 45); // 15 min 45 s after A's last activity
const a3 = await L.api(A.page, "/api/me");
const b3 = await L.api(B.page, "/api/me");
log.push({ t: t(), a: a3.status, a_error: a3.data && a3.data.error, b: b3.status });

rec.add({ id: "LR-01", title: "Idle timeout at the production value (15 min, wall clock): idle session refused, active session kept", requirement: "D-SEC-13, AC-162", layer: "integration+browser",
  expected: "A (idle 15m45s) -> 401; B (active, last request at 11 min) -> 200", actual: { timeline: log.map(({ t, a, b, a_error }) => ({ t, a, a_error, b })) },
  status: a0.status === 200 && a3.status === 401 && b3.status === 200 ? "PASS" : "FAIL" });
rec.add({ id: "LR-02", title: "Fresh-authentication window at the production value (5 min, wall clock): fresh at login, stale after 5 min despite activity", requirement: "D-SEC-13, D-SEC-14, AC-165", layer: "integration+browser",
  expected: "freshAuth.ok true at t=0; false with auth_time_too_old at t=5.5 min while the session is still valid",
  actual: { at_0: b0.data && b0.data.freshAuth, at_5_5min: b1.data && b1.data.freshAuth, session_status_at_5_5min: b1.status },
  status: b0.data && b0.data.freshAuth.ok === true && b1.status === 200 && b1.data.freshAuth.ok === false && b1.data.freshAuth.reasons.includes("auth_time_too_old") ? "PASS" : "FAIL" });

await A.ctx.close(); await B.ctx.close(); await browser.close();
console.log(`saved ${rec.save("-longrun")}`);
