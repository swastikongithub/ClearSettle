"use client";
// The warning before the idle limit (AC-162, D-UI-13). It opens two minutes before the server would end the
// session for inactivity. "Stay signed in" makes one request, which resets the server's idle timer; it cannot
// extend the 8-hour limit. Escape or closing the dialog also means "stay": nothing signs the user out by surprise.

import * as AlertDialog from "@radix-ui/react-alert-dialog";
import { useEffect, useState } from "react";
import { useSession } from "../lib/session";
import { formatCountdown } from "../lib/format.mjs";
import d from "./dialog.module.css";

export default function IdleWarning() {
  const session = useSession();
  const open = session.status === "signed-in" && session.phase === "idle-warning";
  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!open) return undefined;
    setNow(Date.now());
    setFailed(false);
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [open]);

  const stay = async () => {
    if (busy) return;
    setBusy(true);
    const ok = await session.staySignedIn();
    setBusy(false);
    setFailed(!ok);
  };

  const minutes = session.limits ? Math.round(session.limits.idleMs / 60000) : 15;

  return (
    <AlertDialog.Root open={open} onOpenChange={(next) => { if (!next) stay(); }}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className={d.overlay} />
        <AlertDialog.Content className={d.content} data-testid="idle-warning">
          <AlertDialog.Title className={d.title}>You&rsquo;ll be signed out soon</AlertDialog.Title>
          <AlertDialog.Description className={d.description}>
            For your security, ClearSettle signs you out after {minutes} minutes without activity.
          </AlertDialog.Description>
          <p className={d.countdown}>
            Time left <strong className="num" role="timer" aria-live="off">{formatCountdown((session.endsAt || now) - now)}</strong>
          </p>
          {failed && (
            <p className={`msg msg-error ${d.error}`} role="alert">
              ClearSettle couldn&rsquo;t be reached, so your session wasn&rsquo;t extended. Check your connection and try again.
            </p>
          )}
          <div className={d.actions}>
            <button type="button" className="btn" onClick={() => session.signOut()}>Sign out</button>
            <AlertDialog.Cancel className="btn btn-primary" disabled={busy}>Stay signed in</AlertDialog.Cancel>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
