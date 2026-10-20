import AppShell from "../../components/AppShell";
import { NotBuilt } from "../../components/Page";

export const metadata = { title: "Imports" };

export default function ImportsPage() {
  return (
    <AppShell>
      <NotBuilt
        title="Imports"
        purpose="Upload the settlement reports from your payment gateway and the statements from your bank. Each file is checked and its columns mapped, and any row that can’t be read is kept aside with the reason, so no row disappears without a trace."
        arrives="This needs the file import service, which isn’t built yet."
      />
    </AppShell>
  );
}
