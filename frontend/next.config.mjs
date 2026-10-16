// ClearSettle frontend. Static export only: no Next.js server, no server-side session, no server
// rendering of authenticated financial data (D-SEC-11, AC-166, NFR-SEC-020). The client bundle holds
// no secrets; the HttpOnly session cookie is never read by scripts.
const nextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
};
export default nextConfig;
