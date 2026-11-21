// Optional real-browser end-to-end test. Loads the actual extension into Chromium and checks the
// things jsdom cannot: real CSS (:has), real navigation for source-level redirects, and the MV3
// background service worker.
//
// It is NOT part of `npm test` or CI (which stay fast and dependency-light). To run it:
//   npm install --no-save playwright
//   npx playwright install chromium
//   node test/e2e.cjs
//
// Extensions require Chromium's new headless mode (--headless=new), handled below.
"use strict";
const path = require("path");
const os = require("os");
const fs = require("fs");

let chromium;
try { ({ chromium } = require("playwright")); }
catch (e) {
  console.error("This test needs Playwright. Run: npm install --no-save playwright && npx playwright install chromium");
  process.exit(2);
}

const EXT = path.join(__dirname, "..", "extension");
const results = [];
const check = (n, c) => results.push({ n, pass: !!c });

const MOCK = {
  google: `<!DOCTYPE html><html><body>
    <div id="normal">A normal web result about volcanoes</div>
    <div id="aiov" aria-label="AI Overview">AI Overview generated text</div></body></html>`,
  ddg: `<!DOCTYPE html><html><body><div id="r">ddg results</div></body></html>`,
  brave: `<!DOCTYPE html><html><body><div id="r">brave results</div></body></html>`,
  qwant: `<!DOCTYPE html><html><body><div id="r">qwant results</div></body></html>`,
  youtube: `<!DOCTYPE html><html><body>
    <div id="expandable-metadata"><video-summary-content-view-model>AI summary</video-summary-content-view-model></div>
    <div id="desc">real description</div></body></html>`,
};

(async () => {
  const userDir = fs.mkdtempSync(path.join(os.tmpdir(), "blaikhole-e2e-"));
  const ctx = await chromium.launchPersistentContext(userDir, {
    headless: false,
    args: ["--headless=new", `--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`, "--no-sandbox"],
  });

  await ctx.route(/https:\/\/(www\.google\.com|duckduckgo\.com|search\.brave\.com|www\.qwant\.com|www\.youtube\.com)\//, (route) => {
    const u = route.request().url();
    let body = "<html><body>x</body></html>";
    if (u.includes("google.com")) body = MOCK.google;
    else if (u.includes("duckduckgo.com")) body = MOCK.ddg;
    else if (u.includes("brave.com")) body = MOCK.brave;
    else if (u.includes("qwant.com")) body = MOCK.qwant;
    else if (u.includes("youtube.com")) body = MOCK.youtube;
    route.fulfill({ status: 200, contentType: "text/html", body });
  });

  let sw0 = ctx.serviceWorkers();
  if (!sw0.length) { await ctx.waitForEvent("serviceworker", { timeout: 5000 }).catch(() => {}); sw0 = ctx.serviceWorkers(); }
  const extId = sw0.length ? sw0[0].url().split("/")[2] : null;
  const setStorage = async (obj) => {
    const pg = await ctx.newPage();
    await pg.goto(`chrome-extension://${extId}/src/options.html`, { waitUntil: "domcontentloaded" });
    await pg.evaluate((o) => new Promise((r) => chrome.storage.local.set(o, r)), obj);
    await pg.close();
  };

  const nav = async (url, re) => {
    const p = await ctx.newPage();
    await p.goto(url, { waitUntil: "domcontentloaded", timeout: 15000 }).catch(() => {});
    try { await p.waitForURL(re, { timeout: 4000 }); } catch (e) {}
    await p.waitForTimeout(400);
    const final = p.url();
    const hidden = await p.evaluate(() => {
      const a = document.querySelector("[aria-label='AI Overview']");
      const y = document.querySelector("video-summary-content-view-model");
      const n = document.getElementById("normal") || document.getElementById("desc") || document.getElementById("r");
      return {
        aiov: a ? getComputedStyle(a).display === "none" : null,
        yt: y ? getComputedStyle(y).display === "none" : null,
        normalVisible: n ? getComputedStyle(n).display !== "none" : null,
      };
    });
    await p.close();
    return { final, hidden };
  };

  const g = await nav("https://www.google.com/search?q=test", /[?&]udm=14/);
  check("google: redirected to udm=14", /[?&]udm=14/.test(g.final));
  check("google: AI Overview hidden on the result page", g.hidden.aiov === true);
  check("google: normal result stays visible", g.hidden.normalVisible === true);

  const d = await nav("https://duckduckgo.com/?q=test", /assist=false/);
  check("duckduckgo: redirect added assist=false and kbe=0", /assist=false/.test(d.final) && /kbe=0/.test(d.final));

  const b = await nav("https://search.brave.com/search?q=test", /summary=0/);
  check("brave: redirect added summary=0", /summary=0/.test(b.final));

  const q = await nav("https://www.qwant.com/?q=test", /llm=0/);
  check("qwant: redirect added llm=0", /llm=0/.test(q.final));

  const y = await nav("https://www.youtube.com/watch?v=x", /never-match/);
  check("youtube: video-summary element hidden via real :has CSS", y.hidden.yt === true);
  check("youtube: real description stays visible", y.hidden.normalVisible === true);

  // Whitelist: allowing a surface on a site must bring the AI back and must NOT loop.
  await setStorage({ blaikhole: { allow: { "www.google.com": ["google-ai"], "www.youtube.com": ["youtube-ai"] } } });
  const gw = await nav("https://www.google.com/search?q=test", /never-match/);
  check("google whitelisted: not redirected (udm=14 absent)", !/[?&]udm=14/.test(gw.final));
  check("google whitelisted: AI Overview visible again", gw.hidden.aiov === false);
  const yw = await nav("https://www.youtube.com/watch?v=x", /never-match/);
  check("youtube whitelisted: AI summary visible again", yw.hidden.yt === false);

  check("extension background service worker registered", ctx.serviceWorkers().length >= 1);

  await ctx.close();
  fs.rmSync(userDir, { recursive: true, force: true });

  let ok = true;
  for (const r of results) { console.log((r.pass ? "PASS " : "FAIL ") + r.n); if (!r.pass) ok = false; }
  console.log("\n" + (ok ? "ALL PASS" : "SOME FAILED"));
  process.exit(ok ? 0 : 1);
})().catch((e) => { console.error("HARNESS ERROR:", e.message); process.exit(2); });
