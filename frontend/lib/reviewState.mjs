// What the review page shows for a sensitive action (D-SEC-14, D-SEC-17). Pure functions: the server decides
// every outcome, and these only translate its answer. Anything unrecognised is "unknown", never success.

/**
 * The outcome of a confirmation or cancellation, from the HTTP response { status, data }. status 0 means the
 * request got no answer, so whether the action ran is not known.
 */
export function outcomeOf(verb, { status, data }) {
  const error = data && data.error;
  if (status === 200 && verb === "confirm" && data && data.status === "executed") return "executed";
  if (status === 200 && verb === "cancel" && data && data.status === "cancelled") return "cancelled";
  if (status === 401 && error === "step_up_required") return "step-up-required";
  if (status === 404 && error === "action_not_found") return "not-found";
  if (status === 409 && error === "action_changed") return "changed";
  if (status === 409 && error === "action_not_pending") return "not-pending";
  if (status === 410 && error === "action_expired") return "expired";
  if (status === 422 && error === "action_type_unsupported") return "unsupported";
  if (status === 500 && error === "operation_failed") return "failed";
  if (status === 403) return "refused";
  return "unknown";
}

/**
 * The state of a loaded action (the review response), judged by the server's clock: serverNow is the client's
 * time corrected by the offset measured from the response's Date header.
 */
export function stateOf(action, serverNow) {
  if (action.status === "EXECUTED") return "executed";
  if (action.status === "CANCELLED") return "cancelled";
  if (action.status !== "PENDING") return "not-pending";
  if (serverNow >= action.expiresAt * 1000) return "expired";
  if (!action.supported) return "unsupported";
  if (action.changed) return "changed";
  if (action.stepUpRequired) return "step-up";
  return "ready";
}

/** Only the backend's own step-up start for this action is followed (same origin, fixed shape). */
const STEP_UP_PATH = /^\/oauth2\/authorization\/[A-Za-z0-9_-]+\?step_up=[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function safeStepUpUrl(url, actionId) {
  return typeof url === "string" && STEP_UP_PATH.test(url) && url.endsWith(`?step_up=${actionId}`) ? url : null;
}
