import AppShell from "../../components/AppShell";
import { NotBuilt } from "../../components/Page";

export const metadata = { title: "Records" };

export default function RecordsPage() {
  return (
    <AppShell>
      <NotBuilt
        title="Records"
        purpose="Look up any order, payment attempt, settlement line, payout or bank transaction, and trace it back to the file and the row it came from."
        arrives="Records come from imported files, which aren’t built yet."
      />
    </AppShell>
  );
}
