// Real wall-clock checks against the integrated app's PRODUCTION policy values (no shortened timers):
//  - 15-minute idle timeout: an idle session is refused after 15 min; an active one is not.
//  - 5-minute fresh-authentication window: freshAuth turns false after 5 min even for an active session.
//  - Sensitive actions after 5 min: the request and the confirmation demand a step-up; after the step-up only
//    the explicit confirmation executes, once. An action left unconfirmed for 5 min has expired.
// Takes ~17 minutes. Usage: node longrun.mjs [chromium|firefox]
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
  return { ctx, page: await L.signInReady(ctx, user) }; // a new user's enrolment sign-in gets no session; one more follows
}

const executions = (uid) => Number(L.sql(`select count(*) from security_event where event='dev_fixture_operation_executed' and app_user_id='${uid}'`));
const A = await session(); // will stay idle
const B = await session(); // will stay active
const C = await session(); // requests sensitive actions (dev fixture operation)
await L.api(C.page, "/api/csrf");
const cMe = (await L.api(C.page, "/api/me")).data;
const x1 = await L.api(C.page, "/api/dev-fixture/sensitive-actions", { method: "POST" }); // fresh: 202; never confirmed in time
let t0 = Date.now();
const a0 = await L.api(A.page, "/api/me"); // A's last activity
t0 = Date.now();
const b0 = await L.api(B.page, "/api/me");
const log = [{ t: 0, a: a0.status, b: b0.status, b_fresh: b0.data && b0.data.freshAuth }];

await waitUntil(330); // 5.5 min
const b1 = await L.api(B.page, "/api/me");
log.push({ t: t(), b: b1.status, b_fresh: b1.data && b1.data.freshAuth });

// C's authentication is now older than 5 minutes (C signed in before t0).
const x2 = await L.api(C.page, "/api/dev-fixture/sensitive-actions", { method: "POST" });
const x2id = x2.data && x2.data.actionId;
const x2confirmStale = await L.api(C.page, `/api/sensitive-actions/${x2id}/confirm`, { method: "POST" });
const x1confirm = await L.api(C.page, `/api/sensitive-actions/${x1.data && x1.data.actionId}/confirm`, { method: "POST" });
const execBeforeStepUp = executions(cMe.appUserId);
const stepPage = await C.ctx.newPage();
await stepPage.goto(`${L.APP}${x2.data && x2.data.stepUpUrl}`, { waitUntil: "domcontentloaded" });
const stepTrace = await L.keycloakLogin(stepPage, user);
await stepPage.waitForLoadState("networkidle").catch(() => {});
const stepLanded = new URL(stepPage.url());
const reviewed = await stepPage.locator("#action-summary").waitFor({ timeout: 10000 }).then(() => true, () => false);
const execAfterStepUp = executions(cMe.appUserId);
await stepPage.click("#confirm").catch(() => {});
const resultEl = stepPage.locator("#confirm-result");
const confirmResult = await resultEl.waitFor({ timeout: 10000 }).then(async () => ({ outcome: await resultEl.getAttribute("data-outcome"),
  httpStatus: await resultEl.getAttribute("data-http-status") }), () => ({ outcome: null, httpStatus: null }));
const execAfterConfirm = executions(cMe.appUserId);
const x2replay = await L.api(stepPage, `/api/sensitive-actions/${x2id}/confirm`, { method: "POST" });
const cAfter = (await L.api(stepPage, "/api/me")).data;
const lr3 = { t: t(), request: `${x2.status}:${x2.data && x2.data.error}`, step_up_url: x2.data && x2.data.stepUpUrl === `/oauth2/authorization/keycloak?step_up=${x2id}`,
  confirm_before_step_up: `${x2confirmStale.status}:${x2confirmStale.data && x2confirmStale.data.error}`, executions_before_step_up: execBeforeStepUp, step_up_trace: stepTrace,
  landed: stepLanded.pathname, landed_action_matches: stepLanded.searchParams.get("action") === x2id, review_rendered: reviewed, executions_after_step_up: execAfterStepUp,
  confirm_result: confirmResult, executions_after_confirm: execAfterConfirm, replay: `${x2replay.status}:${x2replay.data && x2replay.data.error}`,
  absolute_anchor_unchanged: cAfter && cAfter.sessionAuthenticatedAt === cMe.sessionAuthenticatedAt };
await stepPage.close();

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

rec.add({ id: "LR-03", title: "Sensitive action after 5 min (wall clock): the request and the confirmation demand a step-up and nothing runs; after the step-up the review page shows it and only the explicit Confirm executes it, once; the absolute anchor is unchanged", requirement: "D-SEC-13, D-SEC-14, AC-164, NFR-SEC-024", layer: "integration+browser",
  expected: "request 401 step_up_required with the step-up URL; confirm 401 step_up_required; 0 executions; step-up (password+otp) lands on the review page, still 0 executions; Confirm -> 200 executed, 1 execution; replay 409; anchor unchanged",
  actual: lr3,
  status: lr3.request === "401:step_up_required" && lr3.step_up_url && lr3.confirm_before_step_up === "401:step_up_required" && lr3.executions_before_step_up === 0
    && stepTrace.includes("otp") && lr3.landed.startsWith("/review") && lr3.landed_action_matches && reviewed && execAfterStepUp === 0
    && confirmResult.outcome === "executed" && confirmResult.httpStatus === "200" && execAfterConfirm === 1 && lr3.replay === "409:action_not_pending" && lr3.absolute_anchor_unchanged ? "PASS" : "FAIL" });
rec.add({ id: "LR-04", title: "A sensitive action left unconfirmed for 5 min (wall clock) has expired and is refused", requirement: "D-SEC-14, NFR-SEC-024", layer: "integration+browser",
  expected: "requested fresh at t<0 (202); confirm after 5.5 min -> 410 action_expired; never executed",
  actual: { request: x1.status, confirm_after_5_5min: `${x1confirm.status}:${x1confirm.data && x1confirm.data.error}` },
  status: x1.status === 202 && x1confirm.status === 410 && x1confirm.data && x1confirm.data.error === "action_expired" && execBeforeStepUp === 0 ? "PASS" : "FAIL" });

await A.ctx.close(); await B.ctx.close(); await C.ctx.close(); await browser.close();
console.log(`saved ${rec.save("-longrun")}`);
