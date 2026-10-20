import Link from "next/link";
import AppShell from "../components/AppShell";
import Icon from "../components/Icon";
import { PageHeader, Panel } from "../components/Page";
import s from "../components/page.module.css";

export const metadata = { title: "Overview" };

const STAGES = [
  { name: "Merchant orders", icon: "rows" },
  { name: "Successful payments", icon: "link" },
  { name: "Settlement lines", icon: "rows" },
  { name: "Payouts", icon: "upload" },
  { name: "Bank credits", icon: "book" },
  { name: "Posted journals", icon: "book" },
];

export default function OverviewPage() {
  return (
    <AppShell>
      <PageHeader title="Overview" subtitle="Where the money is for a period, and what stops you from closing it." />
      <div className={s.stack}>
        <Panel title="No period data yet" labelledBy="chain-title">
          <p className={s.panelText}>
            The overview follows each period&rsquo;s money from merchant orders to the bank and the ledger, and shows every
            gap between them. It fills in once files are imported and reconciled. Importing isn&rsquo;t available in this
            build yet, so there are no figures to show.
          </p>
          <ol className={s.chain} aria-label="Settlement chain, no data yet">
            {STAGES.map((stage) => (
              <li key={stage.name} className={s.stage}>
                <span className={s.stageDot}><Icon name={stage.icon} size={14} /></span>
                <span className={s.stageName}>{stage.name}</span>
                <span className={s.stageValue}>No data</span>
              </li>
            ))}
          </ol>
        </Panel>
        <section className={s.panel} aria-labelledby="available-title">
          <div className={s.panelHead}>
            <h2 className={s.panelTitle} id="available-title">Available now</h2>
          </div>
          <ul className={s.rows}>
            <li className={s.row}>
              <Link href="/settings/security/" className={s.rowLink}>
                <span className={s.rowTitle}>Security and sessions</span>
                <span className={s.rowText}>See how you&rsquo;re signed in, and sign out of other browsers and devices.</span>
                <span className={s.rowAside}><Icon name="chevron" /></span>
              </Link>
            </li>
          </ul>
        </section>
      </div>
    </AppShell>
  );
}
