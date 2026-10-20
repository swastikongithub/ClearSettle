import Link from "next/link";
import AppShell from "../../components/AppShell";
import Icon from "../../components/Icon";
import { PageHeader } from "../../components/Page";
import s from "../../components/page.module.css";

export const metadata = { title: "Settings" };

// Only Security and sessions has a backend today; the others say what they will hold and why they wait.
const LATER = [
  { title: "Workspace profile", text: "The business name, base currency and time zone of the workspace.",
    waits: "Needs workspaces" },
  { title: "Members and roles", text: "Invite people, give them roles, and remove access, ending their sessions when you do.",
    waits: "Needs workspaces" },
  { title: "Source accounts", text: "The gateway merchant accounts and bank accounts whose files you import.",
    waits: "Needs workspaces" },
  { title: "Financial year and cutover", text: "When your financial year starts, and the date from which ClearSettle keeps your books.",
    waits: "Needs the accounting core" },
];

export default function SettingsPage() {
  return (
    <AppShell>
      <PageHeader title="Settings" />
      <div className={s.stack}>
        <section className={s.panel} aria-labelledby="settings-yours">
          <div className={s.panelHead}>
            <h2 className={s.panelTitle} id="settings-yours">Your account</h2>
          </div>
          <ul className={s.rows}>
            <li className={s.row}>
              <Link href="/settings/security/" className={s.rowLink}>
                <span className={s.rowTitle}>Security and sessions</span>
                <span className={s.rowText}>How you&rsquo;re signed in, when your session ends, and signing out of other browsers and devices.</span>
                <span className={s.rowAside}><Icon name="chevron" /></span>
              </Link>
            </li>
          </ul>
        </section>
        <section className={s.panel} aria-labelledby="settings-workspace">
          <div className={s.panelHead}>
            <h2 className={s.panelTitle} id="settings-workspace">Workspace</h2>
            <p className={s.panelNote}>Not available yet</p>
          </div>
          <ul className={s.rows}>
            {LATER.map((item) => (
              <li key={item.title} className={s.row} data-not-built="true">
                <div className={s.rowStatic}>
                  <span className={s.rowTitle}>{item.title}</span>
                  <span className={s.rowText}>{item.text}</span>
                  <span className={s.rowAside}><Icon name="clock" size={13} />{item.waits}</span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </AppShell>
  );
}
