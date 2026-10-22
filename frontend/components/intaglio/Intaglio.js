// The public landing page at /welcome/: the Intaglio direction (D-UI-15), at prototype scope. The steel seal and
// its two chapters are interactive (SealExperience); the printed impression and what exists today follow in print.
// `/` stays the application: sign-in, its errors and the post-logout redirect all return there.

import Link from "next/link";
import PrintImpression from "./PrintImpression";
import SealExperience from "./SealExperience";
import s from "./intaglio.module.css";

function Mark() {
  return (
    <svg className={s.mark} viewBox="0 0 32 32" aria-hidden="true">
      {[14.5, 11.5, 8.5, 5.5].map((r) => (
        <circle key={r} cx="16" cy="16" r={r} fill="none" stroke="currentColor" strokeWidth="1" />
      ))}
      <path d="M16 16 L6.4 4.9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

const TODAY = [
  {
    label: "Works today",
    items: [
      "Sign-in with a password and a second factor.",
      "Session limits, with a warning before an idle session ends.",
      "Signing out of every session at once.",
      "A review step for sensitive actions. So far it guards only a development fixture, not real financial operations.",
    ],
  },
  {
    label: "Next",
    items: ["Workspaces, roles and permissions.", "The audit trail."],
  },
  {
    label: "Planned",
    items: [
      "Importing order, gateway, settlement and bank reports.",
      "Matching, and investigating differences with their evidence.",
      "Journal entries and the ledger.",
      "Reports.",
    ],
  },
];

export default function Intaglio() {
  return (
    <div className={s.page}>
      <a className={s.skip} href="#main">Skip to the content</a>
      <header className={s.header}>
        <Link className={s.brand} href="/welcome/" prefetch={false}>
          <Mark />
          <span>ClearSettle</span>
        </Link>
        <nav aria-label="On this page" className={s.nav}>
          <a href="#seal">The seal</a>
          <a href="#difference">A difference</a>
          <a href="#today">Today</a>
        </nav>
        <Link className={s.signIn} href="/" prefetch={false}>Sign in</Link>
      </header>

      <main id="main">
        <SealExperience />

        <section id="today" className={s.print} aria-labelledby="today-title">
          <div className={s.plateMark}>
            <PrintImpression className={s.impression} />
            <h2 id="today-title" className={s.printHeading}>The seal describes the product being built. This is what exists today.</h2>
            <p className={s.printLead}>
              ClearSettle is early. The engraving above shows how reconciliation is meant to work; the lists below say
              plainly which parts are built.
            </p>
            {TODAY.map((group) => (
              <div key={group.label} className={s.todayGroup}>
                <h3>{group.label}</h3>
                <ul>
                  {group.items.map((item) => <li key={item}>{item}</li>)}
                </ul>
              </div>
            ))}
            <div className={s.printActions}>
              <Link className={s.printSignIn} href="/" prefetch={false}>Sign in</Link>
            </div>
          </div>
        </section>
      </main>

      <footer className={s.footer}>
        <span className={s.footerBrand}><Mark />ClearSettle</span>
        <p>Every figure on this page is illustrative. Nothing here is live data or anyone’s records.</p>
      </footer>
    </div>
  );
}
