import { preload } from "react-dom";
import Intaglio from "../../components/intaglio/Intaglio";
import "./intaglio-fonts.css";

// The public landing page (D-UI-04, D-UI-15). It lives at /welcome/ because / is the application: sign-in, its
// errors and the post-logout redirect all return there. This route changes neither.
export const metadata = {
  title: { absolute: "ClearSettle: six records, one seal" },
  description:
    "ClearSettle is a reconciliation product for Indian businesses, in development. It is being built to bring a "
    + "payment's order, gateway, settlement, bank and accounting records into register and keep any difference in "
    + "sight until evidence explains it.",
};

export const viewport = { themeColor: "#0b0e11" };

export default function WelcomePage() {
  // The display face is needed for the first paint of the headline.
  preload("/fonts/bodoni-moda-latin-opsz-normal.woff2", { as: "font", type: "font/woff2", crossOrigin: "" });
  return <Intaglio />;
}
