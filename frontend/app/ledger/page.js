import AppShell from "../../components/AppShell";
import { NotBuilt } from "../../components/Page";

export const metadata = { title: "Ledger" };

export default function LedgerPage() {
  return (
    <AppShell>
      <NotBuilt
        title="Ledger"
        purpose="Draft, approve and post journals, keep the chart of accounts, close periods and set opening balances. Posting a journal will ask you to confirm the exact entry you reviewed."
        arrives="This needs the accounting core, which isn’t built yet."
      />
    </AppShell>
  );
}
