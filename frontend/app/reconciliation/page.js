import AppShell from "../../components/AppShell";
import { NotBuilt } from "../../components/Page";

export const metadata = { title: "Reconciliation" };

export default function ReconciliationPage() {
  return (
    <AppShell>
      <NotBuilt
        title="Reconciliation"
        purpose="Match successful payments to settlement lines, payouts and bank credits, and see, run by run, what matched, what matched only in part and what is missing."
        arrives="This needs imported files and the matching engine. Neither is built yet."
      />
    </AppShell>
  );
}
