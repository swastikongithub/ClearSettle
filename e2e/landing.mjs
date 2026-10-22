// Landing page (/welcome/, D-UI-15, the Intaglio prototype) browser checks against the local dev stack (deploy/).
// No sign-in, no credentials, no realm changes: safe to run alongside nothing else, in any engine.
// Usage: node landing.mjs <chromium|firefox|webkit>
// Results: PASS, FAIL, ERROR, or ENGINE-LIMITATION / NOT-OBSERVABLE where the engine cannot show the behaviour
// (never PASS). Exits non-zero on any FAIL or ERROR. Results are also saved to results/landing-<engine>.json.

import { chromium, firefox, webkit } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ENGINE = process.argv[2] || "chromium";
const APP = "https://localhost:8443"; // as in lib.mjs, which is not imported: it reads deploy/.env, not needed here
const URL = `${APP}/welcome/`;
const launcher = { chromium, firefox, webkit }[ENGINE];
// Headless Chromium on Windows draws WebGL in software unless told to use Direct3D. The page then (correctly) keeps
// its 2D still, and the WebGL checks could not run. Firefox and WebKit use the GPU by default.
const GPU_ARGS = ENGINE === "chromium" && process.platform === "win32" ? ["--use-angle=d3d11"] : [];
const results = [];

function record(id, name, status, detail) {
  results.push({ id, name, status, detail });
  console.log(`[${status}] ${id} ${name}${detail === undefined ? "" : ` :: ${JSON.stringify(detail)}`}`);
}
async function test(id, name, fn) {
  try {
    const { ok, status, detail } = await fn();
    record(id, name, status ?? (ok ? "PASS" : "FAIL"), detail);
  } catch (e) {
    record(id, name, "ERROR", String(e?.message ?? e).split("\n")[0]);
  }
}

// Counts WebGL draw calls, so a check can tell whether the scene is rendering.
function countDraws() {
  window.__draws = 0;
  const proto = window.WebGL2RenderingContext?.prototype;
  if (!proto) return;
  for (const fn of ["drawElements", "drawArrays"]) {
    const orig = proto[fn];
    proto[fn] = function (...a) {
      window.__draws++;
      return orig.apply(this, a);
    };
  }
}

// A page that collects errors. Signed out, the root layout's session check gets 401 from /api/me and /api/session
// on every page; those (and the browser's console line for them) are expected, anything else is an error.
async function open(browser, options = {}) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, ignoreHTTPSErrors: true, ...options });
  await context.addInitScript(countDraws);
  const page = await context.newPage();
  page.problems = [];
  page.on("pageerror", (e) => page.problems.push(`pageerror: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() !== "error") return;
    if (/status of 401/.test(m.text())) return;
    page.problems.push(`console: ${m.text()}`);
  });
  page.on("response", (r) => {
    if (r.status() < 400) return;
    const p = new globalThis.URL(r.url()).pathname;
    if (r.status() === 401 && (p === "/api/me" || p === "/api/session")) return;
    page.problems.push(`${r.status()} ${p}`);
  });
  page.on("requestfailed", (r) => {
    // A request the browser cancels because the test navigates (the scene loads after idle) is not a page error.
    if (/aborted|cancel/i.test(r.failure()?.errorText ?? "")) return;
    page.problems.push(`requestfailed: ${r.url()} ${r.failure()?.errorText}`);
  });
  return page;
}
const isLive = (page) => page.evaluate(() => document.querySelector("[data-live]")?.dataset.live === "true");
const waitLive = async (page, ms = 20000) => {
  try {
    await page.waitForSelector('[data-live="true"]', { timeout: ms });
    return true;
  } catch {
    return false;
  }
};
// The page is interactive once React has hydrated it; the 2D still, drawn on mount, shows that it has (the canvas
// leaves its default 300-pixel width). A slow engine takes seconds.
const hydrated = (page) => page.waitForFunction(() => document.querySelector("canvas")?.width !== 300, null, { timeout: 15000 });
const toSection = async (page, id) => {
  await hydrated(page);
  await page.evaluate((s) => window.scrollTo(0, document.getElementById(s).getBoundingClientRect().top + window.scrollY), id);
  await page.waitForTimeout(2500);
};
const drawsOver = async (page, ms) => {
  const before = await page.evaluate(() => window.__draws);
  await page.waitForTimeout(ms);
  return (await page.evaluate(() => window.__draws)) - before;
};
// The end of a ring's leader line is a point on that ring, as the scene projects it; `onCanvas` says whether a
// click there reaches the artwork rather than the text in front of it.
const ringPoint = (page, index) => page.evaluate((i) => {
  const l = document.querySelectorAll("svg line")[i];
  const x = Number(l.getAttribute("x2")) + 3;
  const y = Number(l.getAttribute("y2")) + 2;
  return { x, y, onCanvas: document.elementFromPoint(x, y)?.tagName === "CANVAS" };
}, index);
const pressedRing = (page) => page.evaluate(() => document.querySelector('#seal button[aria-pressed="true"]')?.textContent ?? null);

const browser = await launcher.launch({ args: GPU_ARGS });
try {
  await test("I-01", "Direct load, reload and the address without its slash all render the page; / is still the application", async () => {
    const page = await open(browser);
    const first = await page.goto(URL, { waitUntil: "networkidle" });
    const reload = await page.reload({ waitUntil: "networkidle" });
    const bare = await page.goto(`${APP}/welcome`, { waitUntil: "networkidle" });
    const h1 = await page.locator("h1").count();
    const title = await page.title();
    const root = await page.goto(`${APP}/`, { waitUntil: "networkidle" });
    await page.waitForTimeout(800);
    const appSignIn = /sign in/i.test(await page.locator("body").innerText());
    const detail = { first: first.status(), reload: reload.status(), bare: [bare.status(), new globalThis.URL(page.url()).pathname], h1, title, root: root.status(), appSignIn, problems: page.problems };
    await page.context().close();
    const loaded = (r) => r.status() < 400; // a reload may be answered 304 from the cache
    return { ok: loaded(first) && loaded(reload) && loaded(bare) && h1 === 1 && title === "ClearSettle: six records, one seal" && loaded(root) && appSignIn && page.problems.length === 0, detail };
  });

  await test("I-02", "Keyboard order: skip link, brand, the page's links, Sign in, then the hero's actions; focus is visible; the skip link reaches main", async () => {
    const page = await open(browser);
    await page.goto(URL, { waitUntil: "networkidle" });
    const order = [];
    for (let i = 0; i < 8; i++) {
      await page.keyboard.press("Tab");
      order.push(await page.evaluate(() => `${document.activeElement.tagName.toLowerCase()}:${(document.activeElement.textContent || "").trim().slice(0, 24)}`));
    }
    const outline = await page.evaluate(() => { const s = getComputedStyle(document.activeElement); return s.outlineStyle !== "none" && parseFloat(s.outlineWidth) > 0; });
    await page.goto(URL, { waitUntil: "networkidle" });
    await page.keyboard.press("Tab");
    await page.keyboard.press("Enter");
    await page.waitForTimeout(300);
    const skipped = await page.evaluate(() => location.hash === "#main");
    await page.context().close();
    const expected = ["a:Skip to the content", "a:ClearSettle", "a:The seal", "a:A difference", "a:Today", "a:Sign in", "a:Inspect the seal", "a:Sign in"];
    const ok = expected.every((e, i) => order[i] === e) && outline && skipped;
    // WebKit, like Safari by default, does not move to links with Tab; that is the engine's setting, not the page.
    if (!ok && ENGINE === "webkit" && !order.some((o) => o.startsWith("a:"))) return { status: "ENGINE-LIMITATION", detail: { order } };
    return { ok, detail: { order, outline, skipped } };
  });

  await test("I-03", "The first frame is complete before WebGL (headline and the drawn still); then the 3D seal takes over", async () => {
    const page = await open(browser);
    await page.goto(URL, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("h1");
    // The still is drawn as soon as the page's script runs (later in a slow engine); it must be on screen before the
    // scene takes over.
    const t0 = Date.now();
    let first;
    for (;;) {
      first = await page.evaluate(() => {
        const still = document.querySelector("canvas");
        const g = still.getContext("2d");
        const d = g.getImageData(Math.floor(still.width * 0.7), Math.floor(still.height * 0.5), 60, 60).data;
        let lit = 0;
        for (let i = 0; i < d.length; i += 4) if (d[i] + d[i + 1] + d[i + 2] > 120) lit++;
        return { h1: document.querySelector("h1")?.textContent, live: document.querySelector("[data-live]")?.dataset.live, litPixels: lit };
      });
      if (first.litPixels > 100 || first.live === "true" || Date.now() - t0 > 10000) break;
      await page.waitForTimeout(100);
    }
    first.stillAfterMs = Date.now() - t0;
    const gl = await waitLive(page);
    const problems = page.problems;
    await page.context().close();
    const okFirst = first.h1 === "Six records.One seal." && first.litPixels > 100 && first.live === "false";
    if (!gl) return { status: "NOT-OBSERVABLE", detail: { ...first, note: "no GPU WebGL in this engine here; the still remained, as designed", problems } };
    return { ok: okFirst && problems.length === 0, detail: { ...first, gl, problems } };
  });

  await test("I-04", "Explore the seal by keyboard: a ring opens its record in its source's format, with its exact arithmetic", async () => {
    const page = await open(browser);
    await page.goto(URL, { waitUntil: "networkidle" });
    await toSection(page, "seal");
    await page.getByRole("button", { name: /^Settlement line/ }).focus();
    await page.keyboard.press("Enter");
    await page.waitForSelector('#seal button[aria-pressed="true"]', { timeout: 10000 }).catch(() => {});
    const opened = await page.evaluate(() => ({
      pressed: document.querySelector('#seal button[aria-pressed="true"]')?.textContent,
      csv: document.querySelector("#seal pre")?.textContent,
      note: [...document.querySelectorAll("#seal p")].map((p) => p.textContent).find((t) => t.includes("make 1,180.00")),
    }));
    await page.getByRole("button", { name: "Back to the whole seal" }).click();
    const closed = await page.evaluate(() => document.querySelectorAll('#seal button[aria-pressed="true"]').length);
    const problems = page.problems;
    await page.context().close();
    const ok = /^Settlement line/.test(opened.pressed ?? "") && /setl_5JQ1,pay_8KX2M4QW7T,1180\.00,23\.60,4\.25,1152\.15/.test(opened.csv ?? "")
      && /1,152\.15 net, 23\.60 fee and 4\.25 GST make 1,180\.00/.test(opened.note ?? "") && closed === 0 && problems.length === 0;
    return { ok, detail: { opened, closed, problems } };
  });

  await test("I-05", "Investigate: an open difference cannot be closed; an explained one closes with its evidence; the evidence view opens", async () => {
    const page = await open(browser);
    await page.goto(URL, { waitUntil: "networkidle" });
    const gl = await waitLive(page);
    await toSection(page, "difference");
    const diff = () => page.evaluate(() => [...document.querySelectorAll("#difference dl > div")].find((d) => d.querySelector("dt")?.textContent === "Difference")?.querySelector("dd")?.textContent);
    const shortDiff = await diff();
    await page.getByRole("button", { name: "Try to close it" }).click();
    await page.waitForTimeout(400);
    const refused = await page.locator("#difference [role=status]").textContent();
    await page.getByRole("button", { name: /^Fee and GST deducted/ }).click();
    await page.waitForTimeout(400);
    const feesDiff = await diff();
    await page.getByRole("button", { name: "Apply the evidence" }).click();
    await page.waitForTimeout(400);
    const closed = await page.locator("#difference [role=status]").textContent();
    const applyGone = await page.getByRole("button", { name: "Apply the evidence" }).count();
    await page.getByRole("button", { name: "Read the evidence" }).click();
    const t0 = Date.now();
    if (gl) await page.waitForSelector('[class*="evidenceTag"][data-on="true"]', { timeout: 12000 }).catch(() => {});
    const unrolledMs = Date.now() - t0;
    const live = await isLive(page);
    const evidence = await page.evaluate(() => ({
      toggle: [...document.querySelectorAll("#difference button")].find((b) => b.getAttribute("aria-pressed") === "true" && /seal/.test(b.textContent))?.textContent,
      tagOn: document.querySelector('[class*="evidenceTag"]')?.dataset.on,
      tagAmount: document.querySelector('[class*="evidenceAmount"]')?.textContent,
    }));
    const problems = page.problems;
    await page.context().close();
    const ok = shortDiff === "−10.00" && /stays open/.test(refused) && feesDiff === "−27.85"
      && /−23\.60 and .*−4\.25/.test(closed) && applyGone === 0 && evidence.toggle === "Back to the seal"
      && (!gl || !live || (evidence.tagOn === "true" && evidence.tagAmount === "−27.85")) && problems.length === 0;
    // `fellBack`: the scene handed over to the still because frames were too slow (designed; the strips are then 2D).
    return { ok, detail: { gl, fellBack: gl && !live, unrolledMs, shortDiff, refused, feesDiff, closed, applyGone, evidence, problems } };
  });

  await test("I-06", "Pointer and touch: clicking or tapping a ring in the artwork chooses it, and choosing it again lets go", async () => {
    const page = await open(browser);
    await page.goto(URL, { waitUntil: "networkidle" });
    if (!(await waitLive(page))) {
      await page.context().close();
      return { status: "NOT-OBSERVABLE", detail: "no GPU WebGL in this engine here, so the artwork is the still and the ring list is the control" };
    }
    await toSection(page, "seal");
    const p1 = await ringPoint(page, 5);
    await page.mouse.click(p1.x, p1.y);
    await page.waitForTimeout(700);
    const chosen = await pressedRing(page);
    const p2 = await ringPoint(page, 5);
    await page.mouse.click(p2.x, p2.y);
    await page.waitForTimeout(700);
    const released = await pressedRing(page);
    const problems = page.problems;
    await page.context().close();
    let touch = "not run: Firefox has no touch emulation in Playwright";
    if (ENGINE !== "firefox") {
      const phone = await open(browser, { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
      await phone.goto(URL, { waitUntil: "networkidle" });
      await waitLive(phone);
      await phone.evaluate(() => window.scrollTo(0, document.getElementById("seal").getBoundingClientRect().top + window.scrollY - window.innerHeight * 0.5));
      await phone.waitForTimeout(3000);
      const t = await ringPoint(phone, 5);
      await phone.touchscreen.tap(t.x, t.y);
      await phone.waitForTimeout(600);
      touch = await pressedRing(phone);
      problems.push(...phone.problems);
      await phone.context().close();
    }
    const onCanvas = p1.onCanvas && p2.onCanvas;
    const ok = onCanvas && Boolean(chosen) && released === null && Boolean(touch) && !/^not run/.test(touch) === (ENGINE !== "firefox") && problems.length === 0;
    return { ok, detail: { onCanvas, chosen, released, touch, problems } };
  });

  await test("I-07", "Reduced motion: no opening sequence and no drifting light; once drawn, the scene stops rendering", async () => {
    const page = await open(browser, { reducedMotion: "reduce" });
    await page.goto(URL, { waitUntil: "networkidle" });
    if (!(await waitLive(page))) {
      await page.context().close();
      return { status: "NOT-OBSERVABLE", detail: "no GPU WebGL in this engine here" };
    }
    await page.waitForTimeout(1500);
    const idleDraws = await drawsOver(page, 2000);
    const scrollBehavior = await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior);
    const problems = page.problems;
    await page.context().close();
    return { ok: idleDraws === 0 && problems.length === 0, detail: { idleDraws, scrollBehavior, problems } };
  });

  await test("I-08", "When nothing changes, nothing renders; moving the pointer wakes the light", async () => {
    const page = await open(browser);
    await page.goto(URL, { waitUntil: "networkidle" });
    if (!(await waitLive(page))) {
      await page.context().close();
      return { status: "NOT-OBSERVABLE", detail: "no GPU WebGL in this engine here" };
    }
    await toSection(page, "difference");
    let settledAfterMs = 2500;
    while (settledAfterMs < 20000 && (await drawsOver(page, 500)) > 0) settledAfterMs += 500;
    const idleDraws = await drawsOver(page, 2000);
    if (!(await isLive(page))) {
      await page.context().close();
      return { status: "NOT-OBSERVABLE", detail: "the scene handed over to the still here (frames too slow), so there is no render loop to watch" };
    }
    await page.mouse.move(700, 400);
    await page.mouse.move(1000, 600, { steps: 8 });
    const movedDraws = await drawsOver(page, 600);
    const problems = page.problems;
    await page.context().close();
    return { ok: settledAfterMs < 20000 && idleDraws === 0 && movedDraws > 0 && problems.length === 0, detail: { settledAfterMs, idleDraws, drawsAfterPointer: movedDraws, problems } };
  });

  if (ENGINE === "webkit") {
    record("I-09", "Without WebGL the still carries the whole experience and nothing fails", "NOT-OBSERVABLE", "WebKit cannot be launched with WebGL turned off here");
  } else {
    await test("I-09", "Without WebGL the still carries the whole experience and nothing fails", async () => {
      const noGl = await launcher.launch(ENGINE === "chromium" ? { args: ["--disable-webgl", "--disable-3d-apis"] } : { firefoxUserPrefs: { "webgl.disabled": true } });
      try {
        const page = await open(noGl);
        await page.goto(URL, { waitUntil: "networkidle" });
        await page.waitForTimeout(2500);
        const before = { live: await isLive(page), h1: await page.locator("h1").count() };
        await toSection(page, "difference");
        await page.getByRole("button", { name: /^Fee and GST deducted/ }).click();
        await page.getByRole("button", { name: "Apply the evidence" }).click();
        await page.getByRole("button", { name: "Read the evidence" }).click();
        await page.waitForTimeout(600);
        const after = await page.evaluate(() => {
          const still = document.querySelector("canvas");
          const d = still.getContext("2d").getImageData(0, 0, still.width, still.height).data;
          let bright = 0;
          for (let i = 0; i < d.length; i += 64) if (d[i] > 150 && d[i + 1] > 150) bright++;
          return { stillOpacity: getComputedStyle(still).opacity, brightSamples: bright };
        });
        const r = { ...before, ...after, problems: page.problems };
        return { ok: !r.live && r.h1 === 1 && r.stillOpacity === "1" && r.brightSamples > 200 && r.problems.length === 0, detail: r };
      } finally {
        await noGl.close();
      }
    });
  }

  await test("I-10", "Every line of text over the steel keeps its contrast (4.5:1, large text 3:1): the hero as the light moves, the seal, a chosen ring, a difference; at 1440 x 900 and 1280 x 640", async () => {
    const results = {};
    const problems = [];
    let gl = true;
    // 1280 x 640 is the tightest case: the text column reaches furthest across the steel.
    for (const viewport of [{ width: 1440, height: 900 }, { width: 1280, height: 640 }]) {
      const page = await open(browser, { viewport });
      await page.goto(URL, { waitUntil: "networkidle" });
      gl = (await waitLive(page)) && gl;
      await page.waitForTimeout(3000);
      // Each line of text is measured against the steel behind that line: the page is photographed with its glyphs
      // made transparent (their shadows and any scrim stay), and the line's own colour is compared with the background
      // pixel nearest to it in luminance, ignoring the most extreme 0.5% (an isolated hot pixel does not decide
      // legibility; a lit area does).
      const measure = async (region) => {
        const lines = await page.evaluate((sel) => {
          const lin = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
          const out = [];
          const walker = document.createTreeWalker(document.querySelector(sel), NodeFilter.SHOW_TEXT);
          let n;
          while ((n = walker.nextNode())) {
            const el = n.parentElement;
            const cs = getComputedStyle(el);
            if (!n.textContent.trim() || cs.visibility !== "visible" || Number(cs.opacity) === 0) continue;
            const [r, g, b, a = 1] = cs.color.match(/[\d.]+/g).map(Number);
            const size = parseFloat(cs.fontSize);
            const large = size >= 24 || (size >= 18.66 && Number(cs.fontWeight) >= 700);
            const range = document.createRange();
            range.selectNodeContents(n);
            for (const q of range.getClientRects()) {
              if (q.width < 2 || q.bottom < 0 || q.top > window.innerHeight) continue;
              out.push({ text: n.textContent.trim().slice(0, 32), x: q.left, y: q.top, w: q.width, h: q.height, lum: 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b), alpha: a, required: large ? 3 : 4.5 });
            }
          }
          return out;
        }, region);
        const style = await page.addStyleTag({ content: "header *, main * { color: transparent !important; -webkit-text-fill-color: transparent !important; }" });
        const png = (await page.screenshot()).toString("base64");
        await style.evaluate((el) => el.remove());
        return page.evaluate(async ({ b64, lines }) => {
          const im = await new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.src = `data:image/png;base64,${b64}`; });
          const c = document.createElement("canvas");
          c.width = im.width;
          c.height = im.height;
          const g = c.getContext("2d");
          g.drawImage(im, 0, 0);
          const d = g.getImageData(0, 0, im.width, im.height).data;
          const lin = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
          return lines.map((l) => {
            const x0 = Math.max(0, Math.floor(l.x - 2)), x1 = Math.min(im.width, Math.ceil(l.x + l.w + 2));
            const y0 = Math.max(0, Math.floor(l.y)), y1 = Math.min(im.height, Math.ceil(l.y + l.h));
            const v = [];
            for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { const k = (y * im.width + x) * 4; v.push(0.2126 * lin(d[k]) + 0.7152 * lin(d[k + 1]) + 0.0722 * lin(d[k + 2])); }
            v.sort((a, b) => a - b);
            const lo = v[Math.floor(v.length * 0.005)], hi = v[Math.min(v.length - 1, Math.floor(v.length * 0.995))];
            const contrast = l.lum > hi ? (l.lum + 0.05) / (hi + 0.05) : l.lum < lo ? (lo + 0.05) / (l.lum + 0.05) : 1;
            return { text: l.text, contrast: Number(contrast.toFixed(2)), required: l.required, ok: l.alpha === 1 && contrast >= l.required };
          });
        }, { b64: png, lines });
      };
      const note = (name, list) => { const key = `${name} @ ${viewport.width}x${viewport.height}`; results[key] = (results[key] ?? []).concat(list); };
      for (let i = 0; i < 3; i++) {
        note("hero", await measure("main > section:first-of-type"));
        await page.waitForTimeout(1500);
      }
      await toSection(page, "seal");
      await page.waitForTimeout(400);
      note("seal", await measure("#seal"));
      await page.getByRole("button", { name: /^Journal entry/ }).click();
      await page.waitForTimeout(1500);
      note("a chosen ring", await measure("#seal"));
      await toSection(page, "difference");
      await page.waitForTimeout(400);
      note("a difference", await measure("#difference"));
      problems.push(...page.problems);
      await page.context().close();
    }
    const failing = Object.entries(results).flatMap(([area, list]) => list.filter((l) => !l.ok).map((l) => ({ area, ...l })));
    const lowest = Object.fromEntries(Object.entries(results).map(([area, list]) => {
      const worst = list.reduce((a, b) => (b.contrast / b.required < a.contrast / a.required ? b : a));
      return [area, { lines: list.length, lowest: `${worst.contrast} (needs ${worst.required}): ${worst.text}` }];
    }));
    return { ok: failing.length === 0 && problems.length === 0, detail: { gl, lowest, failing: failing.slice(0, 8), problems } };
  });

  await test("I-11", "On a phone the steel is pinned across the top, the text starts below it, and nothing scrolls sideways", async () => {
    const page = await open(browser, { viewport: { width: 390, height: 844 } });
    await page.goto(URL, { waitUntil: "networkidle" });
    await page.waitForTimeout(1500);
    const stageTop = () => page.evaluate(() => document.querySelector("canvas").parentElement.getBoundingClientRect().top);
    const r = await page.evaluate(() => {
      const stage = document.querySelector("canvas").parentElement.getBoundingClientRect();
      return {
        stage: [Math.round(stage.top), Math.round(stage.height)],
        h1Top: Math.round(document.querySelector("h1").getBoundingClientRect().top),
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        navHidden: getComputedStyle(document.querySelector("header nav")).display === "none",
      };
    });
    await page.evaluate(() => window.scrollTo(0, 1200));
    await page.waitForTimeout(400);
    const pinned = await stageTop();
    const problems = page.problems;
    await page.context().close();
    const ok = r.stage[0] === 0 && r.stage[1] > 380 && r.stage[1] < 460 && r.h1Top > r.stage[1] && r.overflow === 0 && r.navHidden && pinned === 0 && problems.length === 0;
    return { ok, detail: { ...r, pinnedAfterScroll: pinned, problems } };
  });

  await test("I-12", "What exists today is stated plainly; the review step is described as guarding only a development fixture", async () => {
    const page = await open(browser);
    await page.goto(URL, { waitUntil: "networkidle" });
    const t = await page.locator("#today").innerText();
    await page.context().close();
    const ok = /Works today/.test(t) && /\bNext\b/.test(t) && /Planned/.test(t) && /development fixture/.test(t)
      && /not real financial operations/.test(t) && !/customers|testimonial|certified|guarantee/i.test(t);
    return { ok, detail: { characters: t.length } };
  });
} finally {
  await browser.close();
}

const totals = results.reduce((t, r) => ({ ...t, [r.status]: (t[r.status] ?? 0) + 1 }), {});
const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), "results");
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, `landing-${ENGINE}.json`), JSON.stringify({ engine: ENGINE, url: URL, results, totals }, null, 2));
console.log(`totals ${JSON.stringify(totals)}`);
process.exit(results.some((r) => r.status === "FAIL" || r.status === "ERROR") ? 1 : 0);
