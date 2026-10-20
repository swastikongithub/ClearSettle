// Where to send the user after sign-in (D-UI-13). The intended page is kept in sessionStorage (this tab only)
// while the browser goes to the identity provider and back. Only a path inside this application is accepted,
// so the value can never send anyone to another site. It is not sensitive: a path, never data or tokens.

const KEY = "cs.returnTo";
const MAX_AGE_MS = 10 * 60 * 1000;
const SECTIONS = new Set(["", "imports", "reconciliation", "exceptions", "records", "ledger", "reports", "settings", "review"]);

/** The path if it is a safe in-app destination, otherwise null. Drops the sign-in error parameter. */
export function safeReturnPath(path) {
  if (typeof path !== "string" || path.length === 0 || path.length > 300) return null;
  if (!path.startsWith("/") || path.startsWith("//") || /[\\\s]/.test(path)) return null;
  let url;
  try {
    url = new URL(path, "https://app.invalid");
  } catch {
    return null;
  }
  if (url.origin !== "https://app.invalid") return null;
  const first = url.pathname.split("/")[1] || "";
  if (!SECTIONS.has(first)) return null;
  url.searchParams.delete("auth_error");
  const search = url.searchParams.toString();
  return url.pathname + (search ? `?${search}` : "");
}

export function rememberReturnTo(path, storage, now = Date.now()) {
  const safe = safeReturnPath(path);
  try {
    if (safe && safe !== "/") storage.setItem(KEY, JSON.stringify({ path: safe, at: now }));
    else storage.removeItem(KEY);
  } catch {
    // Storage unavailable (private mode, blocked): the user simply lands on the overview.
  }
}

/** Returns the remembered path once (it is removed), or null when there is none, it is stale or unsafe. */
export function takeReturnTo(storage, now = Date.now()) {
  let raw = null;
  try {
    raw = storage.getItem(KEY);
    storage.removeItem(KEY);
  } catch {
    return null;
  }
  if (!raw) return null;
  try {
    const { path, at } = JSON.parse(raw);
    if (typeof at !== "number" || now - at > MAX_AGE_MS || now < at) return null;
    return safeReturnPath(path);
  } catch {
    return null;
  }
}
