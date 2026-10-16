export const metadata = {
  title: "ClearSettle",
  description: "ClearSettle payment reconciliation and accounting.",
};

// Minimal integration scaffold. The designed authentication UI is a separate task to be done with the
// frontend-design skill (per AGENTS.md); this layout intentionally carries no visual design yet.
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", margin: 24 }}>{children}</body>
    </html>
  );
}
