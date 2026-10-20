"use client";
// Same-origin API client. The session cookie is HttpOnly and is never read here. State-changing calls
// carry the CSRF token (read from the non-HttpOnly __Host-XSRF-TOKEN cookie) and the required custom
// header (NFR-SEC-022). No tokens are ever stored in web storage (AC-159).

const CSRF_COOKIE = "__Host-XSRF-TOKEN";
const CSRF_HEADER = "X-XSRF-TOKEN";
const CUSTOM_HEADER = "X-CS-Request";

const listeners = new Set();

/**
 * Subscribes to every API response: { path, status, error, receivedAt }. The session clock uses it, because
 * each request the server answers resets the server's idle timer. Returns the unsubscribe function.
 */
export function onApiResponse(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function csrfToken() {
  for (const part of document.cookie.split("; ")) {
    const i = part.indexOf("=");
    if (part.slice(0, i) === CSRF_COOKIE) return decodeURIComponent(part.slice(i + 1));
  }
  return null;
}

/**
 * Calls the API. Resolves to { status, data, serverDate, receivedAt }; status 0 means the request did not
 * reach the server (offline, blocked). Never throws for HTTP or network errors: callers show designed states.
 */
export async function api(path, { method = "GET", body } = {}) {
  const headers = { Accept: "application/json" };
  try {
    if (method !== "GET") {
      // Ensure the CSRF cookie exists, then echo it in the header with the required custom header.
      if (!csrfToken()) await fetch("/api/csrf", { credentials: "same-origin" });
      headers[CSRF_HEADER] = csrfToken() || "";
      headers[CUSTOM_HEADER] = "1";
      headers["Content-Type"] = "application/json";
    }
    const res = await fetch(path, {
      method,
      headers,
      credentials: "same-origin",
      cache: "no-store",
      body: body ? JSON.stringify(body) : undefined,
    });
    const receivedAt = Date.now();
    let data = null;
    try {
      data = await res.json();
    } catch {
      data = null;
    }
    const dateHeader = Date.parse(res.headers.get("Date") || "");
    const result = { status: res.status, data, serverDate: Number.isNaN(dateHeader) ? NaN : dateHeader, receivedAt };
    for (const listener of listeners) listener({ path, status: res.status, error: data && data.error, receivedAt });
    return result;
  } catch {
    return { status: 0, data: null, serverDate: NaN, receivedAt: Date.now() };
  }
}
