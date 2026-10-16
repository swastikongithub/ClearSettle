// Engine capability probe, independent of ClearSettle: does each browser engine store a server-set
// SameSite=Strict cookie as Strict, and withhold it on cross-site navigations?
//
// One local HTTP server acts as the browsers' proxy AND serves two synthetic sites, so real cross-site
// link clicks, 302 redirects and form POSTs occur. No external network access; nothing is persisted.
//
//   node engine-samesite-probe.mjs
//
// Used to classify browser-jar SameSite results (run.mjs C-01/C-02) as an engine limitation rather than a
// server defect.
import http from "node:http";
import { chromium, firefox, webkit } from "playwright";

const engines = { chromium, firefox, webkit };
const seen = [];
const server = http.createServer((req, res) => {
  const u = new URL(req.url); // absolute-form proxy request
  if (u.hostname === "app.probe-a.test") {
    seen.push({ path: u.pathname, strict: (req.headers.cookie || "").includes("strictprobe") });
    if (u.pathname === "/set") {
      res.writeHead(200, { "Set-Cookie": "strictprobe=1; Path=/; HttpOnly; SameSite=Strict", "Content-Type": "text/html" });
      return res.end("set");
    }
    res.writeHead(200, { "Content-Type": "text/html" });
    return res.end("landed");
  }
  if (u.pathname === "/redirect") { res.writeHead(302, { Location: "http://app.probe-a.test/after-302" }); return res.end(); }
  if (u.pathname === "/post-then-redirect") { req.resume(); res.writeHead(302, { Location: "http://app.probe-a.test/after-post-302" }); return res.end(); }
  res.writeHead(200, { "Content-Type": "text/html" });
  res.end('<a id="link" href="http://app.probe-a.test/after-link">l</a><a id="r" href="/redirect">r</a>'
    + '<form method="post" action="/post-then-redirect"><button id="s1">s</button></form>'
    + '<form method="post" action="http://app.probe-a.test/after-cross-post"><button id="s2">s</button></form>');
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const proxy = { server: `http://127.0.0.1:${server.address().port}` };

for (const name of ["chromium", "firefox", "webkit"]) {
  seen.length = 0;
  const b = await engines[name].launch({ headless: true, proxy });
  const ctx = await b.newContext();
  const p = await ctx.newPage();
  await p.goto("http://app.probe-a.test/set");
  const stored = (await ctx.cookies()).find((c) => c.name === "strictprobe");
  const nav = async (sel, path) => {
    await p.goto("http://evil.probe-b.test/");
    await Promise.all([p.waitForURL(`**${path}`), p.click(sel)]);
  };
  await nav("#link", "/after-link");
  await nav("#r", "/after-302");
  await nav("#s1", "/after-post-302");
  await nav("#s2", "/after-cross-post");
  await p.goto("http://app.probe-a.test/same-site-control");
  const was = (path) => { const s = seen.find((x) => x.path === path); return s ? s.strict : "no-request"; };
  console.log(name.padEnd(8), JSON.stringify({
    platform: process.platform, stored_sameSite: stored && stored.sameSite, sent_same_site_control: was("/same-site-control"),
    sent_cross_site_link: was("/after-link"), sent_cross_site_302: was("/after-302"),
    sent_cross_site_post_then_302: was("/after-post-302"), sent_cross_site_form_post: was("/after-cross-post"),
  }));
  await b.close();
}
server.close();
