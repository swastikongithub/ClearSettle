"use client";
// The account menu in the top bar: who is signed in, security settings, sign out, sign out everywhere.

import * as Menu from "@radix-ui/react-dropdown-menu";
import Link from "next/link";
import { useState } from "react";
import { useSession } from "../lib/session";
import Icon from "./Icon";
import SignOutEverywhereDialog from "./SignOutEverywhereDialog";
import s from "./shell.module.css";

function initials(email) {
  const name = (email || "").split("@")[0].replace(/[^A-Za-z]+/g, " ").trim();
  const parts = name.split(" ").filter(Boolean);
  if (parts.length === 0) return ((email || "").match(/[A-Za-z0-9]/) || ["A"])[0].toUpperCase();
  return (parts[0][0] + (parts[1] ? parts[1][0] : "")).toUpperCase();
}

export default function UserMenu() {
  const session = useSession();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const email = (session.me && session.me.email) || "Your account";

  return (
    <>
      <Menu.Root modal={false}>
        <Menu.Trigger className={s.userButton} aria-label={`Account: ${email}`} id="account-menu">
          <span className={s.avatar} aria-hidden="true">{initials(session.me && session.me.email)}</span>
          <span className={s.userEmail}>{email}</span>
          <Icon name="chevron" className={s.userChevron} />
        </Menu.Trigger>
        <Menu.Portal>
          <Menu.Content className={s.menu} align="end" sideOffset={6} collisionPadding={8}>
            <div className={s.menuHeader}>
              <span className={s.menuLabel}>Signed in as</span>
              <span>{email}</span>
            </div>
            <Menu.Separator className={s.menuSep} />
            <Menu.Item asChild className={s.menuItem}>
              <Link href="/settings/security/"><Icon name="shield" />Security and sessions</Link>
            </Menu.Item>
            <Menu.Separator className={s.menuSep} />
            <Menu.Item className={s.menuItem} onSelect={() => session.signOut()}>
              <Icon name="signout" />Sign out
            </Menu.Item>
            <Menu.Item className={s.menuItem} onSelect={() => setConfirmOpen(true)}>
              <Icon name="devices" />Sign out everywhere&hellip;
            </Menu.Item>
          </Menu.Content>
        </Menu.Portal>
      </Menu.Root>
      <SignOutEverywhereDialog open={confirmOpen} onOpenChange={setConfirmOpen} />
    </>
  );
}
