import AppShell from "../../../components/AppShell";
import { PageHeader } from "../../../components/Page";
import SecurityOverview from "../../../components/SecurityOverview";

export const metadata = { title: "Security and sessions" };

export default function SecurityPage() {
  return (
    <AppShell>
      <PageHeader title="Security and sessions" subtitle="How you’re signed in, when your session ends, and how to end it." />
      <SecurityOverview />
    </AppShell>
  );
}
