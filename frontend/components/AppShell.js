"use client";
// The application shell (D-UI-08, D-UI-13). Every page renders inside it. It shows the sign-in screen when
// there is no session, keeping the page's address so the user returns to it after signing in; otherwise the
// navigation rail, the top bar with the account menu, the session notices and the page.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { useSession } from "../lib/session";
import { formatTime } from "../lib/format.mjs";
import { Brand, BrandMark } from "./Brand";
import Icon from "./Icon";
import IdleWarning from "./IdleWarning";
import SignInScreen from "./SignInScreen";
import UserMenu from "./UserMenu";
import s from "./shell.module.css";

// The eight approved sections (D-UI-08). Administrative tools live under Settings.
const NAV = [
  { href: "/", label: "Overview", icon: "home" },
  { href: "/imports/", label: "Imports", icon: "upload" },
  { href: "/reconciliation/", label: "Reconciliation", icon: "link" },
  { href: "/exceptions/", label: "Exceptions", icon: "flag" },
  { href: "/records/", label: "Records", icon: "rows" },
  { href: "/ledger/", label: "Ledger", icon: "book" },
  { href: "/reports/", label: "Reports", icon: "chart" },
];
const SETTINGS = { href: "/settings/", label: "Settings", icon: "gear" };

function normalise(path) {
  return path && path.length > 1 ? path.replace(/\/+$/, "") : path || "/";
}

function isCurrent(pathname, href) {
  const p = normalise(pathname);
  const h = normalise(href);
  return h === "/" ? p === "/" : p === h || p.startsWith(`${h}/`);
}

function NavItem({ item, pathname }) {
  const current = isCurrent(pathname, item.href);
  return (
    <li>
      <Link href={item.href} className={s.navLink} aria-current={current ? "page" : undefined}>
        <Icon name={item.icon} />
        {item.label}
      </Link>
    </li>
  );
}

function Splash() {
  return (
    <div className={s.splash} data-session="loading" aria-busy="true">
      <span className={s.splashMark}><BrandMark size={32} /></span>
      <span className="sr-only" role="status">Loading ClearSettle</span>
    </div>
  );
}

function ExpiryNotice({ session }) {
  if (session.phase !== "absolute-warning" || !session.endsAt) return null;
  return (
    <div className={s.notice} role="status">
      <Icon name="clock" />
      <p>
        Your session reaches its time limit at <span className="num">{formatTime(new Date(session.endsAt))}</span>.
        Save your work: you&rsquo;ll need to sign in again after that.
      </p>
    </div>
  );
}

export default function AppShell({ children }) {
  const session = useSession();
  const pathname = usePathname();
  const railRef = useRef(null);
  const signedIn = session.status === "signed-in" && !session.redirectTo;

  // On narrow screens the navigation is a strip that scrolls sideways: bring the current section into view.
  useEffect(() => {
    const rail = railRef.current;
    const current = rail && rail.querySelector('[aria-current="page"]');
    if (!current || rail.scrollWidth <= rail.clientWidth) return;
    const offset = current.getBoundingClientRect().left - rail.getBoundingClientRect().left;
    rail.scrollLeft += offset - (rail.clientWidth - current.offsetWidth) / 2;
  }, [pathname, signedIn]);

  if (session.status === "loading" || (session.status === "signed-in" && session.redirectTo)) return <Splash />;
  if (session.status !== "signed-in") return <SignInScreen />;

  return (
    <div className={s.shell} data-session="signed-in">
      <a className={s.skip} href="#main">Skip to content</a>
      <div className={s.rail} ref={railRef}>
        <Link href="/" className={s.brandLink} aria-label="ClearSettle, overview">
          <Brand />
        </Link>
        <nav className={s.nav} aria-label="Main">
          <ul className={s.navList}>
            {NAV.map((item) => <NavItem key={item.href} item={item} pathname={pathname} />)}
          </ul>
          <ul className={`${s.navList} ${s.navSecondary}`}>
            <NavItem item={SETTINGS} pathname={pathname} />
          </ul>
        </nav>
        <p className={s.railFoot}>Times in IST (Asia/Kolkata)</p>
      </div>
      <header className={s.topbar}>
        <Link href="/" className={s.topBrand} aria-label="ClearSettle, overview"><Brand /></Link>
        <span className={s.spacer} />
        <UserMenu />
      </header>
      <div className={s.main}>
        <ExpiryNotice session={session} />
        <main id="main" tabIndex={-1} className={s.content}>
          {children}
        </main>
      </div>
      <IdleWarning />
    </div>
  );
}
