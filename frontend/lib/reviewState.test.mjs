import assert from "node:assert/strict";
import test from "node:test";
import { outcomeOf, safeStepUpUrl, stateOf } from "./reviewState.mjs";

const ID = "820b6771-22e9-47c6-803e-de9facaabe27";

test("each response the confirm and cancel endpoints return maps to its own outcome", () => {
  assert.equal(outcomeOf("confirm", { status: 200, data: { status: "executed" } }), "executed");
  assert.equal(outcomeOf("cancel", { status: 200, data: { status: "cancelled" } }), "cancelled");
  assert.equal(outcomeOf("confirm", { status: 401, data: { error: "step_up_required" } }), "step-up-required");
  assert.equal(outcomeOf("confirm", { status: 404, data: { error: "action_not_found" } }), "not-found");
  assert.equal(outcomeOf("confirm", { status: 409, data: { error: "action_changed" } }), "changed");
  assert.equal(outcomeOf("confirm", { status: 409, data: { error: "action_not_pending" } }), "not-pending");
  assert.equal(outcomeOf("cancel", { status: 409, data: { error: "action_not_pending" } }), "not-pending");
  assert.equal(outcomeOf("confirm", { status: 410, data: { error: "action_expired" } }), "expired");
  assert.equal(outcomeOf("confirm", { status: 422, data: { error: "action_type_unsupported" } }), "unsupported");
  assert.equal(outcomeOf("confirm", { status: 500, data: { error: "operation_failed" } }), "failed");
  assert.equal(outcomeOf("confirm", { status: 403, data: { error: "csrf_invalid" } }), "refused");
});

test("no answer, or an answer that doesn't say what happened, is unknown, never success", () => {
  assert.equal(outcomeOf("confirm", { status: 0, data: null }), "unknown");
  assert.equal(outcomeOf("confirm", { status: 502, data: null }), "unknown");
  assert.equal(outcomeOf("confirm", { status: 500, data: null }), "unknown");
  assert.equal(outcomeOf("confirm", { status: 200, data: null }), "unknown");
  assert.equal(outcomeOf("confirm", { status: 200, data: { status: "cancelled" } }), "unknown");
  assert.equal(outcomeOf("cancel", { status: 200, data: { status: "executed" } }), "unknown");
  assert.equal(outcomeOf("confirm", { status: 409, data: { error: "something_else" } }), "unknown");
  assert.equal(outcomeOf("confirm", { status: 404, data: null }), "unknown");
});

const pending = { status: "PENDING", expiresAt: 1_000, supported: true, changed: false, stepUpRequired: false };

test("a pending action is ready only while unexpired, supported, unchanged and freshly authenticated", () => {
  assert.equal(stateOf(pending, 999_999), "ready");
  assert.equal(stateOf(pending, 1_000_000), "expired");
  assert.equal(stateOf({ ...pending, stepUpRequired: true }, 0), "step-up");
  assert.equal(stateOf({ ...pending, changed: true, stepUpRequired: true }, 0), "changed");
  assert.equal(stateOf({ ...pending, supported: false, changed: true }, 0), "unsupported");
  assert.equal(stateOf({ ...pending, supported: false }, 2_000_000), "expired");
});

test("a settled action reports what the server holds", () => {
  assert.equal(stateOf({ ...pending, status: "EXECUTED" }, 0), "executed");
  assert.equal(stateOf({ ...pending, status: "CANCELLED" }, 2_000_000), "cancelled");
  assert.equal(stateOf({ ...pending, status: "SOMETHING_NEW" }, 0), "not-pending");
});

test("only the backend's own step-up start for this action is followed", () => {
  assert.equal(safeStepUpUrl(`/oauth2/authorization/keycloak?step_up=${ID}`, ID), `/oauth2/authorization/keycloak?step_up=${ID}`);
  assert.equal(safeStepUpUrl(`/oauth2/authorization/keycloak?step_up=${ID}`, "another-id"), null);
  assert.equal(safeStepUpUrl(`https://evil.example/oauth2/authorization/keycloak?step_up=${ID}`, ID), null);
  assert.equal(safeStepUpUrl(`//evil.example/oauth2/authorization/keycloak?step_up=${ID}`, ID), null);
  assert.equal(safeStepUpUrl(`/oauth2/authorization/keycloak?step_up=${ID}&next=/x`, ID), null);
  assert.equal(safeStepUpUrl(undefined, ID), null);
});
