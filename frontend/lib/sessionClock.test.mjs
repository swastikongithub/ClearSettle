import { test } from "node:test";
import assert from "node:assert/strict";
import { sessionLimits, sessionPhase } from "./sessionClock.mjs";

const MIN = 60 * 1000;
const T0 = Date.UTC(2026, 9, 19, 6, 0, 0); // browser clock at sign-in

function limits(absoluteInMs) {
  // Server clock 3 s ahead of the browser: the absolute limit is converted to the browser's clock.
  return sessionLimits({ idleTimeoutSeconds: 900, absoluteExpiresAt: (T0 + 3000 + absoluteInMs) / 1000 }, T0 + 3000, T0);
}

test("server times are converted to the browser's clock", () => {
  const l = limits(8 * 60 * MIN);
  assert.equal(l.idleMs, 15 * MIN);
  assert.equal(l.absoluteAt, T0 + 8 * 60 * MIN);
});

test("idle: active, then a warning two minutes before, then expired after the server's limit", () => {
  const l = limits(8 * 60 * MIN);
  assert.equal(sessionPhase(l, T0, T0 + 12 * MIN).phase, "active");
  const warn = sessionPhase(l, T0, T0 + 13.5 * MIN);
  assert.equal(warn.phase, "idle-warning");
  assert.ok(warn.endsAt > T0 + 15 * MIN, "the browser's limit ends after the server's");
  assert.equal(sessionPhase(l, T0, T0 + 15 * MIN).phase, "idle-warning", "not yet: margin");
  assert.equal(sessionPhase(l, T0, T0 + 15 * MIN + 5000).phase, "idle-expired");
});

test("activity resets the idle count", () => {
  const l = limits(8 * 60 * MIN);
  assert.equal(sessionPhase(l, T0 + 10 * MIN, T0 + 23 * MIN).phase, "active");
});

test("absolute: a warning ten minutes before, which activity cannot remove, then expired", () => {
  const l = limits(8 * 60 * MIN);
  const end = T0 + 8 * 60 * MIN;
  const lastRequest = end - 9 * MIN;
  assert.equal(sessionPhase(l, lastRequest, end - 11 * MIN).phase, "active");
  assert.equal(sessionPhase(l, lastRequest, end - 9 * MIN).phase, "absolute-warning");
  assert.equal(sessionPhase(l, end - 1000, end - 500).phase, "absolute-warning", "a fresh request does not extend it");
  assert.equal(sessionPhase(l, end - 1000, end).phase, "absolute-expired");
});

test("when both limits are near, the earlier one is shown", () => {
  const l = limits(5 * MIN); // the 8-hour limit ends in 5 minutes, before the idle limit can
  assert.equal(sessionPhase(l, T0, T0 + 1 * MIN).phase, "absolute-warning");
  assert.equal(sessionPhase(l, T0, T0 + 5 * MIN).phase, "absolute-expired");
});

test("an unknown absolute limit falls back to the idle limit", () => {
  const l = sessionLimits({ idleTimeoutSeconds: 900, absoluteExpiresAt: -1 }, NaN, T0);
  assert.equal(l.absoluteAt, null);
  assert.equal(sessionPhase(l, T0, T0 + 14 * MIN).phase, "idle-warning");
});
