"use client";
import { useEffect, useState } from "react";
import { api } from "../../lib/api";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Sensitive-action review page (D-SEC-14). A sensitive operation, or the step-up re-authentication it needs,
// lands here with the pending action id. Nothing runs until the user presses Confirm: that sends the explicit,
// single-use confirmation, which the server refuses unless the action is the user's own, still pending, not
// expired, and their authentication is fresh (5 minutes) with MFA. Integration scaffold only: the designed
// review UI is a frontend-design task.
export default function Review() {
  const [actionId, setActionId] = useState(null);
  const [action, setAction] = useState(null);
  const [result, setResult] = useState(null);

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("action");
    setActionId(id);
    if (id && UUID.test(id)) api(`/api/sensitive-actions/${id}`).then(setAction);
  }, []);

  const send = async (verb) => setResult(await api(`/api/sensitive-actions/${actionId}/${verb}`, { method: "POST" }));
  const a = action && action.status === 200 ? action.data : null;

  return (
    <main>
      <h1>Confirm sensitive action</h1>
      <p id="action-id">pending action: {actionId || "none"}</p>
      {action && !a && <p id="action-error">action: {(action.data && action.data.error) || action.status}</p>}
      {a && (
        <>
          <p id="action-summary">{a.summary || `unsupported action type: ${a.actionType}`}</p>
          <p id="action-status">status: {a.status}</p>
          {a.stepUpRequired && (
            <p id="step-up-required">
              Your sign-in is older than five minutes. <a id="step-up" href={a.stepUpUrl}>Verify it is you</a>, then confirm.
            </p>
          )}
          {a.status === "PENDING" && !result && (
            <p>
              <button id="confirm" onClick={() => send("confirm")}>Confirm</button>{" "}
              <button id="cancel" onClick={() => send("cancel")}>Cancel</button>
            </p>
          )}
        </>
      )}
      {result && (
        <p id="confirm-result">
          result: {result.status} {(result.data && (result.data.status || result.data.error)) || ""}
        </p>
      )}
      <p>Nothing is performed until you confirm. A confirmation can be used once.</p>
    </main>
  );
}
