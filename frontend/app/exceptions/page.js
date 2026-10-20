import AppShell from "../../components/AppShell";
import { NotBuilt } from "../../components/Page";

export const metadata = { title: "Exceptions" };

export default function ExceptionsPage() {
  return (
    <AppShell>
      <NotBuilt
        title="Exceptions"
        purpose="Work through every mismatch, short payment and unexplained fee: assign it, attach the evidence, record the decision, and send it for approval when the rules require one."
        arrives="Exceptions come from reconciliation runs, which aren’t built yet."
      />
    </AppShell>
  );
}
