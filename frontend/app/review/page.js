"use client";
import { useEffect, useState } from "react";

// Step-up landing page (D-SEC-14). After a successful step-up re-authentication the backend redirects
// here with the pending action id. Nothing is executed automatically; a sensitive action is confirmed
// explicitly, and the confirmation endpoint is provided by the milestone that owns that action. This
// page is the integration placeholder for that flow; the designed review UI is a frontend-design task.
export default function Review() {
  const [actionId, setActionId] = useState(null);
  useEffect(() => {
    setActionId(new URLSearchParams(window.location.search).get("action"));
  }, []);
  return (
    <main>
      <h1>Confirm sensitive action</h1>
      <p id="action-id">pending action: {actionId || "none"}</p>
      <p>
        Review the details, then confirm. No action is performed until you confirm explicitly
        (single-use). The confirmation control is provided by the feature that requested step-up.
      </p>
    </main>
  );
}
