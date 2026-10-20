"use client";
// Confirmation for "Sign out everywhere" (AC-163): it ends every ClearSettle session of this user, on every
// server instance, including this one. Nothing happens until the user presses the named button.

import * as AlertDialog from "@radix-ui/react-alert-dialog";
import { useState } from "react";
import { useSession } from "../lib/session";
import d from "./dialog.module.css";

export default function SignOutEverywhereDialog({ open, onOpenChange }) {
  const session = useSession();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const confirm = async () => {
    setBusy(true);
    setFailed(false);
    const r = await session.signOutEverywhere();
    setBusy(false);
    if (!r.ok) setFailed(true);
  };

  return (
    <AlertDialog.Root open={open} onOpenChange={(next) => { if (!busy) { setFailed(false); onOpenChange(next); } }}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className={d.overlay} />
        <AlertDialog.Content className={d.content}>
          <AlertDialog.Title className={d.title}>Sign out everywhere?</AlertDialog.Title>
          <AlertDialog.Description className={d.description}>
            This ends your ClearSettle sessions in every browser and on every device, including this one. You&rsquo;ll
            need to sign in again.
          </AlertDialog.Description>
          {failed && (
            <p className={`msg msg-error ${d.error}`} role="alert">
              Your sessions could not be ended. Nothing has changed. Try again.
            </p>
          )}
          <div className={d.actions}>
            <AlertDialog.Cancel className="btn" disabled={busy}>Cancel</AlertDialog.Cancel>
            <button type="button" id="confirm-sign-out-everywhere" className="btn btn-primary" onClick={confirm} disabled={busy}>
              {busy ? "Signing out everywhere…" : "Sign out everywhere"}
            </button>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
