// ClearSettle end-to-end helpers for the LOCAL dev stack (deploy/). Synthetic identities only.
// Secret values (passwords, TOTP secrets, cookie/session values, codes) are held in memory for
// assertions and the log-leak scan, and are never written to result files or printed.
import { chromium, firefox, webkit, devices } from "playwright";
import { execFileSync, spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const ENV = Object.fromEntries(
  fs.readFileSync(path.join(ROOT, "deploy", ".env"), "utf8").split(/\r?\n/).filter((l) => l.includes("="))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]));

export const APP = "https://localhost:8443";
export const KC = "http://host.docker.internal:8081";
export const ISSUER = `${KC}/realms/clearsettle`;
export const SESSION_COOKIE = "__Host-CSSESSION";
export const LOGIN_COOKIE = "__Host-CSLOGIN";
export const CSRF_COOKIE = "__Host-XSRF-TOKEN";

// ---- secrets observed during a run (for redaction of evidence + the log-leak scan) ----
export const observed = new Map();
export function remember(label, value) {
  if (!value || String(value).length < 8) return;
  if (!observed.has(label)) observed.set(label, new Set());
  observed.get(label).add(String(value));
}
export function redact(text) {
  let out = typeof text === "string" ? text : JSON.stringify(text);
  for (const set of observed.values()) for (const v of set) if (out.includes(v)) out = out.split(v).join("[redacted]");
  for (const v of Object.values(ENV)) if (v && v.length >= 8 && out.includes(v)) out = out.split(v).join("[redacted]");
  return out;
}

// ---- local forward proxy used only by WebKit (see launch) ----
const mapHost = (h) => (h === "host.docker.internal" ? "127.0.0.1" : h);
function startResolvingProxy() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => { // absolute-form plain-HTTP requests
      const u = new URL(req.url);
      const upstream = http.request({ host: mapHost(u.hostname), port: u.port || 80, method: req.method, path: u.pathname + u.search, headers: req.headers },
        (r) => { res.writeHead(r.statusCode, r.headers); r.pipe(res); });
      upstream.on("error", () => { res.writeHead(502); res.end(); });
      req.pipe(upstream);
    });
    server.on("connect", (req, client, head) => { // HTTPS tunnels
      const [h, p] = req.url.split(":");
      const s = net.connect(Number(p), mapHost(h), () => { client.write("HTTP/1.1 200 Connection Established\r\n\r\n"); s.write(head); s.pipe(client); client.pipe(s); });
      s.on("error", () => client.destroy()); client.on("error", () => s.destroy());
    });
    server.listen(0, "127.0.0.1", () => { server.unref(); resolve(server.address().port); });
  });
}

// ---- browsers ----
export async function launch(name) {
  if (name === "chromium") {
    return chromium.launch({ headless: true, args: ["--host-resolver-rules=MAP host.docker.internal 127.0.0.1"] });
  }
  if (name === "firefox") {
    return firefox.launch({ headless: true, firefoxUserPrefs: { "network.dns.forceResolve": "127.0.0.1", "network.trr.mode": 5 } });
  }
  if (name === "webkit") {
    // WebKit has no host-resolver option and this host cannot resolve host.docker.internal. Route
    // interception does not see redirect hops, so a tiny local forward proxy substitutes the DNS answer
    // (host.docker.internal -> 127.0.0.1) at the network layer; every other request is tunnelled unchanged.
    const port = await startResolvingProxy();
    return webkit.launch({ headless: true, proxy: { server: `http://127.0.0.1:${port}` } });
  }
  throw new Error(`unknown browser ${name}`);
}
// Dev self-signed certificate only. E2E_DEVICE applies a Playwright device descriptor (viewport, user agent,
// touch, device scale). This is EMULATION on the desktop engine: it is not evidence about real iOS Safari or
// Android browsers (their cookie/ITP behaviour is not reproduced).
export const DEVICE = process.env.E2E_DEVICE || "";
export const contextOptions = { ...(DEVICE ? devices[DEVICE] : {}), ignoreHTTPSErrors: true };

// ---- docker-side helpers (admin credentials passed via env, never echoed) ----
export function kcadm(args) {
  // A per-process kcadm config file: concurrent runs must not race on the shared default config. The admin
  // password reaches the container through the environment (`-e PW` copies it from this process's), never through
  // the docker command line, so it is not in the process list or in the message of a failed call.
  return execFileSync("docker", ["exec", "-e", "PW", "-e", `CFG=/tmp/kcadm-e2e-${process.pid}.config`, "clearsettle-keycloak", "sh", "-c",
    `/opt/keycloak/bin/kcadm.sh config credentials --config "$CFG" --server http://localhost:8080 --realm master --user admin --password "$PW" >/dev/null 2>&1 && /opt/keycloak/bin/kcadm.sh ${args} --config "$CFG"; rc=$?; rm -f "$CFG"; exit $rc`],
  { encoding: "utf8", env: { ...process.env, PW: ENV.KEYCLOAK_ADMIN_PASSWORD } });
}
export function sql(statement) {
  return execFileSync("docker", ["exec", "clearsettle-db", "psql", "-U", "postgres", "-d", "clearsettle", "-At", "-c", statement],
    { encoding: "utf8" }).trim();
}
export function dockerLogs(container, since) {
  const args = ["logs", ...(since ? ["--since", since] : []), container];
  // docker logs writes the container's stdout and stderr to the corresponding streams: capture both.
  const r = spawnSync("docker", args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  return String(r.stdout || "") + String(r.stderr || "");
}
// nginx's access.log/error.log are symlinks to stdout/stderr in the official image: read docker logs.
export function proxyLogs() {
  return dockerLogs("clearsettle-proxy");
}

// ---- TOTP (RFC 6238, SHA1, 30s, 6 digits) ----
function base32Decode(s) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const clean = s.replace(/[\s=]/g, "").toUpperCase();
  let bits = 0, value = 0; const out = [];
  for (const ch of clean) {
    const idx = alphabet.indexOf(ch);
    if (idx < 0) throw new Error("bad base32");
    value = (value << 5) | idx; bits += 5;
    if (bits >= 8) { out.push((value >>> (bits - 8)) & 0xff); bits -= 8; }
  }
  return Buffer.from(out);
}
const lastCounter = new Map(); // secret -> last used counter (Keycloak rejects code reuse)
export async function totpFor(base32Secret) {
  let counter = Math.floor(Date.now() / 30000);
  if (lastCounter.get(base32Secret) === counter) {
    await sleep(30000 - (Date.now() % 30000) + 500);
    counter = Math.floor(Date.now() / 30000);
  }
  lastCounter.set(base32Secret, counter);
  const buf = Buffer.alloc(8); buf.writeBigUInt64BE(BigInt(counter));
  const h = crypto.createHmac("sha1", base32Decode(base32Secret)).update(buf).digest();
  const o = h[h.length - 1] & 0xf;
  return String((h.readUInt32BE(o) & 0x7fffffff) % 1000000).padStart(6, "0");
}
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** The page that stands in for a held redirect to the callback in WebKit (holdCallback in run.mjs): one link to it. */
export function heldRedirectPage(location) {
  const href = location.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
  return `<!doctype html><title>Redirect</title><a id="held-redirect" href="${href}">Continue</a>`;
}

/**
 * Completes whatever Keycloak presents: username/password, OTP enrolment (CONFIGURE_TOTP), or OTP; follows the
 * stand-in for a held redirect (heldRedirectPage), which is not a page of its own in the trace.
 * Returns a trace of the pages seen (names only). user = { username, password, totpSecret? }.
 */
export async function keycloakLogin(page, user) {
  const trace = [];
  for (let step = 0; step < 8; step++) {
    await page.waitForLoadState("domcontentloaded").catch(() => {});
    if (!page.url().startsWith(KC)) return trace;
    if (await page.locator("#username").count()) {
      trace.push("password");
      await page.fill("#username", user.username);
      await page.fill("#password", user.password);
      await Promise.all([page.waitForNavigation({ waitUntil: "domcontentloaded" }).catch(() => {}), page.click("#kc-login")]);
      continue;
    }
    if ((await page.locator("#password").count()) && !(await page.locator("#otp").count())) {
      trace.push("reauth-password");
      await page.fill("#password", user.password);
      await Promise.all([page.waitForNavigation({ waitUntil: "domcontentloaded" }).catch(() => {}), page.click("#kc-login")]);
      continue;
    }
    if (await page.locator("#totp").count()) { // CONFIGURE_TOTP enrolment page
      trace.push("otp-enrol");
      if (await page.locator("#mode-manual").count()) await page.click("#mode-manual");
      const secret = (await page.locator("#kc-totp-secret-key").innerText()).replace(/\s/g, "");
      user.totpSecret = secret; remember("totp_secret", secret);
      await page.fill("#totp", await totpFor(secret));
      if (await page.locator("#userLabel").count()) await page.fill("#userLabel", "e2e-device");
      const submit = page.locator("#saveTOTPBtn, input[type=submit], button[type=submit]").first();
      await Promise.all([page.waitForNavigation({ waitUntil: "domcontentloaded" }).catch(() => {}), submit.click()]);
      continue;
    }
    if (await page.locator("#otp").count()) {
      trace.push("otp");
      if (!user.totpSecret) throw new Error("OTP requested but no enrolled secret for user");
      await page.fill("#otp", await totpFor(user.totpSecret));
      await Promise.all([page.waitForNavigation({ waitUntil: "domcontentloaded" }).catch(() => {}), page.click("#kc-login")]);
      continue;
    }
    if (await page.locator("#held-redirect").count()) {
      await Promise.all([page.waitForURL((u) => !u.href.startsWith(KC), { waitUntil: "domcontentloaded" }), page.click("#held-redirect")]);
      continue;
    }
    const err = await page.locator("#input-error, .alert-error, .pf-m-danger, #kc-error-message").first().innerText().catch(() => "");
    trace.push(`unexpected-page${err ? ":" + err.slice(0, 80) : ""}`);
    return trace;
  }
  return trace;
}

/** Where a sign-in ended, for an error message: the IdP pages seen and the app's auth_error code, if any. */
export function signInOutcome(page, trace) {
  return `trace ${trace.join(",") || "none"}, landed ${(page.url().match(/auth_error=[a-z_]+/) || [page.url().startsWith(KC) ? "at the IdP" : "no auth_error"])[0]}`;
}

/**
 * Signs in in a new page of {@code context} until the app holds a session, retrying only where the flow requires
 * it: the sign-in that enrols the authenticator gets no session by design (its amr shows no verified factor), so
 * exactly one more sign-in follows it. Any other refused sign-in throws, so that a retry never hides an
 * authentication failure. Returns the page.
 */
export async function signInReady(context, user) {
  for (let attempt = 1; ; attempt++) {
    const page = await context.newPage();
    await page.goto(`${APP}/oauth2/authorization/keycloak`, { waitUntil: "domcontentloaded" });
    const trace = await keycloakLogin(page, user);
    await page.waitForLoadState("networkidle").catch(() => {});
    if ((await api(page, "/api/me")).status === 200) return page;
    if (attempt > 1 || !trace.includes("otp-enrol")) throw new Error(`sign-in refused: ${signInOutcome(page, trace)}`);
  }
}

/** Same-origin API call from the page, adding the CSRF header and custom header for unsafe methods. */
export async function api(page, p, { method = "GET", body, headers = {}, raw = false } = {}) {
  return page.evaluate(async ({ p, method, body, headers, raw }) => {
    const h = { Accept: "application/json", ...headers };
    if (!raw && method !== "GET") {
      const tok = document.cookie.split("; ").find((c) => c.startsWith("__Host-XSRF-TOKEN="));
      if (tok) h["X-XSRF-TOKEN"] = decodeURIComponent(tok.split("=").slice(1).join("="));
      h["X-CS-Request"] = "1";
      if (body !== undefined) h["Content-Type"] = "application/json";
    }
    const r = await fetch(p, { method, headers: h, credentials: "same-origin", body: body === undefined ? undefined : JSON.stringify(body) });
    let data = null; try { data = await r.json(); } catch { /* not json */ }
    return { status: r.status, data };
  }, { p, method, body, headers, raw });
}

export async function cookieInfo(context, name) {
  const c = (await context.cookies()).find((x) => x.name === name);
  if (!c) return null;
  remember(name, c.value);
  return { name: c.name, domain: c.domain, path: c.path, secure: c.secure, httpOnly: c.httpOnly, sameSite: c.sameSite, session: c.expires === -1 };
}

export class Recorder {
  constructor(browser) { this.browser = browser; this.rows = []; }
  add(r) {
    const row = { browser: this.browser, at: new Date().toISOString(), ...r, actual: JSON.parse(redact(JSON.stringify(r.actual ?? null))) };
    this.rows.push(row);
    console.log(`[${r.status}] ${r.id} ${r.title} :: ${redact(r.actual)}`.slice(0, 600));
  }
  save(suffix = "") {
    const dir = path.join(ROOT, "e2e", "results"); fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, `results-${this.browser}${suffix}.json`);
    fs.writeFileSync(file, JSON.stringify(this.rows, null, 2));
    return file;
  }
}
