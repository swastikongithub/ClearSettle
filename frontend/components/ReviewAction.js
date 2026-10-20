"use client";
// Review and confirmation of a sensitive action (D-SEC-14, D-SEC-17). A sensitive operation, or the step-up
// re-authentication it needs, lands here with ?action=<id>. Nothing runs until the user presses Confirm. The
// server decides every outcome; this page shows the one it returned and never assumes success: a response that
// didn’t arrive is reported as unknown, and the page offers to look again rather than to repeat the action.

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../lib/api";
import { formatCountdown, formatTime } from "../lib/format.mjs";
import { outcomeOf, safeStepUpUrl, stateOf } from "../lib/reviewState.mjs";
import Icon from "./Icon";
import { Panel } from "./Page";
import s from "./review.module.css";
import p from "./page.module.css";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// What each response means for the user. `retry` keeps Confirm and Cancel available (the action is still pending).
const OUTCOMES = {
  executed: { kind: "ok", icon: "check", title: "Confirmed", text: "The action ran once." },
  cancelled: { kind: "ok", icon: "check", title: "Cancelled", text: "Nothing ran." },
  "step-up-required": { kind: "info", icon: "shield", title: "Verify it’s you first",
    text: "Your sign-in is now more than 5 minutes old, so the action didn’t run. Verify with your password and a code, and you’ll come back here to confirm." },
  "not-pending": { kind: "info", icon: "info", title: "Already settled",
    text: "This action was already confirmed or cancelled, perhaps in another tab, so it didn’t run again." },
  changed: { kind: "warn", icon: "warn", title: "Changed since you reviewed it",
    text: "Something this action depends on changed after you reviewed it, so it didn’t run and has been withdrawn. Start it again to review the current version." },
  expired: { kind: "info", icon: "clock", title: "Expired",
    text: "This request expired before it was confirmed, so nothing ran. Start the action again." },
  unsupported: { kind: "error", icon: "warn", title: "Can’t be run",
    text: "ClearSettle can’t run this kind of action, so nothing ran." },
  "not-found": { kind: "error", icon: "warn", title: "Action not found",
    text: "This action can’t be found, so nothing ran. It may have been started from a different account." },
  failed: { kind: "error", icon: "warn", title: "The action failed", retry: true,
    text: "It was rolled back, so nothing changed. The action is still waiting: you can confirm it again or cancel it." },
  refused: { kind: "error", icon: "lock", title: "Refused by a security check",
    text: "Your request was refused, so nothing ran. Reload the page and try again." },
  unknown: { kind: "error", icon: "warn", title: "Result not known", recheck: true,
    text: "No clear answer came back, so it isn’t known whether the action ran. Check its current state before doing anything else." },
};

const STATE_LINE = {
  ready: { icon: "shield", text: "Waiting for your confirmation" },
  "step-up": { icon: "lock", text: "Verify it’s you before confirming" },
  executed: { icon: "check", text: "Confirmed: the action ran" },
  cancelled: { icon: "cross", text: "Cancelled: nothing ran" },
  "not-pending": { icon: "info", text: "No longer waiting for confirmation" },
  expired: { icon: "clock", text: "Expired: nothing ran" },
  unsupported: { icon: "warn", text: "This kind of action can’t be run" },
  changed: { icon: "warn", text: "Changed since it was requested" },
};

function Message({ outcome, status, focusRef, stepUpUrl, onRecheck }) {
  const o = OUTCOMES[outcome];
  return (
    <div
      id="confirm-result"
      ref={focusRef}
      tabIndex={-1}
      className={`msg msg-${o.kind} ${s.result}`}
      role={o.kind === "error" ? "alert" : "status"}
      data-outcome={outcome}
      data-http-status={status}
    >
      <Icon name={o.icon} />
      <div className={p.msgBody}>
        <p className={p.msgTitle}>{o.title}</p>
        <p>{o.text}</p>
        {outcome === "step-up-required" && stepUpUrl && (
          <div className={p.actions}><a id="step-up" className="btn btn-primary" href={stepUpUrl}>Verify it&rsquo;s you</a></div>
        )}
        {o.recheck && (
          <div className={p.actions}><button type="button" className="btn" onClick={onRecheck}>Check the current state</button></div>
        )}
      </div>
    </div>
  );
}

export default function ReviewAction() {
  const [actionId, setActionId] = useState(undefined); // undefined until the address has been read
  const [view, setView] = useState({ status: "loading" });
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(null);
  const [now, setNow] = useState(() => Date.now());
  const inFlight = useRef(false);
  const resultRef = useRef(null);

  // quiet: keep showing the action while its state is read again (after a confirmation or cancellation).
  const load = useCallback(async (id, { quiet = false } = {}) => {
    if (!quiet) setView({ status: "loading" });
    const r = await api(`/api/sensitive-actions/${id}`);
    const offset = Number.isNaN(r.serverDate) ? 0 : r.serverDate - r.receivedAt;
    if (r.status === 200) setView({ status: "loaded", action: r.data, offset });
    else if (quiet) return;
    else if (r.status === 404) setView({ status: "not-found" });
    else if (r.status !== 401) setView({ status: "error", httpStatus: r.status });
  }, []);

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("action") || "";
    setActionId(id);
    if (UUID.test(id)) load(id);
  }, [load]);

  const pending = view.status === "loaded" && view.action.status === "PENDING";
  useEffect(() => {
    if (!pending) return undefined;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [pending]);

  useEffect(() => {
    if (result && resultRef.current) resultRef.current.focus();
  }, [result]);

  const send = async (verb) => {
    if (inFlight.current) return; // one confirmation or cancellation at a time
    inFlight.current = true;
    setBusy(verb);
    const r = await api(`/api/sensitive-actions/${actionId}/${verb}`, { method: "POST" });
    inFlight.current = false;
    setBusy(null);
    if (r.status === 401 && r.data && r.data.error !== "step_up_required") return; // the session ended
    const outcome = outcomeOf(verb, r);
    setResult({ outcome, status: r.status, stepUpUrl: r.data && r.data.stepUpUrl });
    // Show the state the server now holds (ran, cancelled, withdrawn), never one assumed from the outcome.
    if (outcome !== "unknown" && outcome !== "not-found") load(actionId, { quiet: true });
  };

  const recheck = () => {
    setResult(null);
    load(actionId);
  };

  const root = { "data-review-action": actionId || "" };

  if (actionId === undefined) return <div className={s.wrap} {...root} data-review-state="loading" aria-busy="true" />;

  if (!UUID.test(actionId) || view.status === "not-found") {
    return (
      <div className={s.wrap} {...root} data-review-state={UUID.test(actionId) ? "not-found" : "no-action"}>
        <section className={`${p.panel} ${p.empty}`} aria-labelledby="review-empty">
          <h2 className={p.emptyTitle} id="review-empty">
            {UUID.test(actionId) ? "This action can’t be found" : "There’s nothing to review"}
          </h2>
          <p className={p.emptyText}>
            {UUID.test(actionId)
              ? "It may have been started from a different account, or the link is incomplete. Nothing has run."
              : "This page opens when you start an action that needs your confirmation. The link you followed doesn’t point to one."}
          </p>
          <Link href="/" className="btn">Go to the overview</Link>
        </section>
      </div>
    );
  }

  if (view.status === "loading") {
    return (
      <div className={s.wrap} {...root} data-review-state="loading" aria-busy="true">
        <section className={`${p.panel} ${p.loading}`}><p className={p.panelText} role="status">Loading the action&hellip;</p></section>
      </div>
    );
  }

  if (view.status === "error") {
    return (
      <div className={s.wrap} {...root} data-review-state="error">
        <div className="msg msg-error" role="alert">
          <Icon name="warn" />
          <div className={p.msgBody}>
            <p>The action couldn&rsquo;t be loaded, so nothing has run. Check your connection and try again.</p>
            <div className={p.actions}><button type="button" className="btn" onClick={() => load(actionId)}>Try again</button></div>
          </div>
        </div>
      </div>
    );
  }

  const a = view.action;
  const serverNow = now + view.offset;
  const state = stateOf(a, serverNow);
  // After a failure the action is still pending (rolled back), and the reload shows it ready again.
  const settled = result && !OUTCOMES[result.outcome].retry;
  const canAct = !settled && state === "ready";
  const canCancel = !settled && ["ready", "step-up", "changed", "unsupported"].includes(state);
  const stepUpUrl = safeStepUpUrl(a.stepUpUrl, a.actionId);
  const line = STATE_LINE[state];
  const msLeft = a.expiresAt * 1000 - serverNow;

  return (
    <div className={s.wrap} {...root} data-review-state={state}>
      <Panel labelledBy="action-summary">
        <div className={s.head}>
          <p className={`${s.state} ${s[`state-${state}`] || ""}`}><Icon name={line.icon} size={14} />{line.text}</p>
          <p id="action-summary" className={s.summary}>{a.summary || "An action of a kind ClearSettle doesn’t recognise"}</p>
        </div>
        <dl className={p.facts}>
          <dt>Reference</dt>
          <dd><span id="action-id" className="ref">{a.actionId}</span></dd>
          <dt>Kind</dt>
          <dd><span className="ref">{a.actionType}</span></dd>
          {!["executed", "cancelled", "not-pending"].includes(state) && (
            <>
              <dt>{msLeft > 0 ? "Expires" : "Expired"}</dt>
              <dd className="num">
                {formatTime(new Date(a.expiresAt * 1000))}
                {state === "ready" || state === "step-up"
                  ? <span className={s.left}> ({formatCountdown(msLeft)} left)</span> : null}
              </dd>
            </>
          )}
        </dl>

        {state === "changed" && !result && (
          <div className="msg msg-warn" role="status">
            <Icon name="warn" />
            <p>
              What this action depends on has changed since it was requested, so it can&rsquo;t be confirmed as it
              was reviewed. Cancel it and start again to review the current version.
            </p>
          </div>
        )}
        {state === "step-up" && !result && (
          <div className="msg msg-info" role="status">
            <Icon name="shield" />
            <div className={p.msgBody}>
              <p>
                Your sign-in is more than 5 minutes old. Verify with your password and a code from your authenticator
                app, and you&rsquo;ll come back here to confirm.
              </p>
              {stepUpUrl && <div className={p.actions}><a id="step-up" className="btn btn-primary" href={stepUpUrl}>Verify it&rsquo;s you</a></div>}
            </div>
          </div>
        )}

        {result && (
          <Message outcome={result.outcome} status={result.status} focusRef={resultRef}
            stepUpUrl={safeStepUpUrl(result.stepUpUrl, a.actionId)} onRecheck={recheck} />
        )}

        {(canAct || canCancel) && (
          <div className={`${p.actions} ${s.buttons}`}>
            {canAct && (
              <button type="button" id="confirm" className="btn btn-primary btn-large" onClick={() => send("confirm")} disabled={busy !== null}>
                {busy === "confirm" ? "Confirming…" : "Confirm"}
              </button>
            )}
            {canCancel && (
              <button type="button" id="cancel" className="btn btn-large" onClick={() => send("cancel")} disabled={busy !== null}>
                {busy === "cancel" ? "Cancelling…" : "Cancel action"}
              </button>
            )}
          </div>
        )}
      </Panel>
      <p className={s.footnote}>
        Confirming runs exactly the action shown above, once. If anything it depends on changes before then, it&rsquo;s refused.
      </p>
    </div>
  );
}
