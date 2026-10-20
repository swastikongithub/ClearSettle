import "./globals.css";
import { SessionProvider } from "../lib/session";

// Static export served on the API's origin (D-SEC-11, D-UI-11): no Next.js server, no server-side session, no
// server rendering of financial data. The session provider learns the signed-in user from the API in the browser.
export const metadata = {
  title: { default: "ClearSettle", template: "%s – ClearSettle" },
  description: "ClearSettle payment reconciliation and accounting.",
};

export const viewport = { width: "device-width", initialScale: 1, themeColor: "#f3f5f4" };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
