"use client";
// Same-origin API client. The session cookie is HttpOnly and is never read here. State-changing calls
// carry the CSRF token (read from the non-HttpOnly __Host-XSRF-TOKEN cookie) and the required custom
// header (NFR-SEC-022). No tokens are ever stored in web storage (AC-159).

const CSRF_COOKIE = "__Host-XSRF-TOKEN";
const CSRF_HEADER = "X-XSRF-TOKEN";
const CUSTOM_HEADER = "X-CS-Request";

function csrfToken() {
  for (const part of document.cookie.split("; ")) {
    const i = part.indexOf("=");
    if (part.slice(0, i) === CSRF_COOKIE) return decodeURIComponent(part.slice(i + 1));
  }
  return null;
}

export async function api(path, { method = "GET", body } = {}) {
  const headers = { Accept: "application/json" };
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
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  return { status: res.status, data };
}
