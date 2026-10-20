// Amount and time formatting (D-UI-09). Amounts arrive from the API as exact decimal strings and are formatted
// as strings: they are never converted to JavaScript numbers, so no floating-point error can reach the screen.

const MINUS = "−"; // a true minus sign, not a hyphen

// Minor units per currency (ISO 4217). Unknown codes are refused rather than guessed.
const MINOR_UNITS = { INR: 2, USD: 2, EUR: 2, GBP: 2, SGD: 2, AED: 2, JPY: 0, KWD: 3, BHD: 3, OMR: 3 };

const DECIMAL = /^(-)?(\d+)(?:\.(\d+))?$/;

/** Groups an integer string: Indian (12,34,567) for INR, international (1,234,567) otherwise. */
function group(integer, currency) {
  if (currency !== "INR" || integer.length <= 3) {
    return integer.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }
  const last3 = integer.slice(-3);
  const rest = integer.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ",");
  return `${rest},${last3}`;
}

/**
 * Formats an exact decimal string for display, without the currency code (callers show the code separately,
 * so a table column can align figures).
 *
 * style "working" (default): negative amounts with a minus sign. style "statement" (profit and loss and the
 * balance sheet only): negative amounts in parentheses.
 *
 * Throws on anything that is not a plain decimal or has more decimal places than the currency allows: a value
 * the display cannot show exactly is an error to fix at the source, never something to round here.
 */
export function formatAmount(value, currency, { style = "working" } = {}) {
  const minor = MINOR_UNITS[currency];
  if (minor === undefined) throw new Error(`unsupported currency: ${currency}`);
  const m = DECIMAL.exec(String(value).trim());
  if (!m) throw new Error("not a decimal amount");
  const [, sign, rawInteger, fraction = ""] = m;
  if (fraction.length > minor) throw new Error(`more than ${minor} decimal places for ${currency}`);
  const integer = rawInteger.replace(/^0+(?=\d)/, "");
  const digits = group(integer, currency) + (minor > 0 ? "." + fraction.padEnd(minor, "0") : "");
  const negative = sign === "-" && /[1-9]/.test(integer + fraction);
  if (!negative) return digits;
  return style === "statement" ? `(${digits})` : `${MINUS}${digits}`;
}

/** Product default until a workspace sets its own time zone (D-PRD-03: India first). */
export const DEFAULT_TIME_ZONE = "Asia/Kolkata";
const ZONE_LABEL = { "Asia/Kolkata": "IST" };

/** "14:37 IST" */
export function formatTime(date, timeZone = DEFAULT_TIME_ZONE) {
  const t = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone }).format(date);
  return `${t} ${ZONE_LABEL[timeZone] || timeZone}`;
}

/** "19 Oct 2026, 14:37 IST" */
export function formatDateTime(date, timeZone = DEFAULT_TIME_ZONE) {
  const d = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone }).format(date);
  return `${d}, ${formatTime(date, timeZone)}`;
}

/** "4:05" for a countdown; never negative. */
export function formatCountdown(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}
