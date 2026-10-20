import { test } from "node:test";
import assert from "node:assert/strict";
import { rememberReturnTo, safeReturnPath, takeReturnTo } from "./returnTo.mjs";

function memoryStorage() {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) };
}

test("accepts paths inside the application", () => {
  assert.equal(safeReturnPath("/settings/security/"), "/settings/security/");
  assert.equal(safeReturnPath("/review/?action=1b4e28ba-2fa1-11d2-883f-0016d3cca427"), "/review/?action=1b4e28ba-2fa1-11d2-883f-0016d3cca427");
  assert.equal(safeReturnPath("/"), "/");
});

test("drops the sign-in error so it is not shown again", () => {
  assert.equal(safeReturnPath("/settings/?auth_error=session_expired"), "/settings/");
});

test("refuses anything that could leave the application", () => {
  for (const bad of ["https://evil.example/", "//evil.example/x", "/\\evil.example", "javascript:alert(1)", "evil", "/oauth2/authorization/keycloak",
    "/login/oauth2/code/keycloak?code=x", "/api/me", "/logout", "/unknown/", "/ settings", "", null, undefined, 42, "/" + "a".repeat(400)]) {
    assert.equal(safeReturnPath(bad), null, String(bad));
  }
});

test("is used once, and not after ten minutes", () => {
  const s = memoryStorage();
  rememberReturnTo("/settings/security/", s, 1_000);
  assert.equal(takeReturnTo(s, 2_000), "/settings/security/");
  assert.equal(takeReturnTo(s, 3_000), null, "taken once");

  rememberReturnTo("/settings/", s, 1_000);
  assert.equal(takeReturnTo(s, 1_000 + 10 * 60 * 1000 + 1), null, "stale");
});

test("the overview itself, or an unsafe path, is not remembered", () => {
  const s = memoryStorage();
  rememberReturnTo("/", s, 1_000);
  assert.equal(takeReturnTo(s, 1_001), null);
  rememberReturnTo("https://evil.example/", s, 1_000);
  assert.equal(takeReturnTo(s, 1_001), null);
});

test("a tampered stored value is ignored", () => {
  const s = memoryStorage();
  s.setItem("cs.returnTo", JSON.stringify({ path: "//evil.example/", at: 1_000 }));
  assert.equal(takeReturnTo(s, 1_001), null);
  s.setItem("cs.returnTo", "not json");
  assert.equal(takeReturnTo(s, 1_001), null);
});

test("blocked storage is not an error", () => {
  const blocked = { getItem() { throw new Error("blocked"); }, setItem() { throw new Error("blocked"); }, removeItem() { throw new Error("blocked"); } };
  rememberReturnTo("/settings/", blocked);
  assert.equal(takeReturnTo(blocked), null);
});
