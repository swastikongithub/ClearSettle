import AppShell from "../../components/AppShell";
import { NotBuilt } from "../../components/Page";

export const metadata = { title: "Reports" };

export default function ReportsPage() {
  return (
    <AppShell>
      <NotBuilt
        title="Reports"
        purpose="The trial balance, profit and loss, balance sheet, general ledger and journal listings, each stating the periods and imports it covers, with exports."
        arrives="Reports are built from posted journals, which aren’t available yet."
      />
    </AppShell>
  );
}
