import AppShell from "../../components/AppShell";
import { PageHeader } from "../../components/Page";
import ReviewAction from "../../components/ReviewAction";

export const metadata = { title: "Review and confirm" };

export default function ReviewPage() {
  return (
    <AppShell>
      <PageHeader title="Review and confirm" subtitle="Nothing runs until you confirm, and a confirmation works once." />
      <ReviewAction />
    </AppShell>
  );
}
