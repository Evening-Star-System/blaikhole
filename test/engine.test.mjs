// Engine regression test. Requires jsdom: `npm install jsdom` (dev only).
// Run from the repo root: `node test/engine.test.mjs`
import { JSDOM } from "jsdom";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const here = path.dirname(fileURLToPath(import.meta.url));
const src = path.join(here, "..", "extension", "src");
const listData = fs.readFileSync(path.join(src, "list-data.js"), "utf8");
const content = fs.readFileSync(path.join(src, "content.js"), "utf8");

// Simulated Google results page:
//  - #aiov: matches css rule div[aria-label='AI Overview']
//  - #aiwrap: deep-nested "AI Overview" heading, matches the contains rule (up:4)
//  - #normal: a real result that merely mentions AI, must stay visible
const html = `<!DOCTYPE html><html><head></head><body>
  <div id="normal">Normal web result about AI history and the news today</div>
  <div id="aiov" aria-label="AI Overview">AI Overview block content</div>
  <div id="aiwrap"><section><div><div><h2>AI Overview</h2><p>generated summary</p></div></div></section></div>
</body></html>`;

// url carries udm=14 so the redirect pass is a no-op here and the hide assertions below
// exercise the hide/contains engine, not navigation.
const dom = new JSDOM(html, {
  url: "https://www.google.com/search?q=test&udm=14",
  runScripts: "dangerously",
  pretendToBeVisual: true,
});
const { window } = dom;
let exposed = null;
window.__BLAIKHOLE_EXPOSE__ = (o) => { exposed = o; };
window.eval(listData);
window.eval(content);
await new Promise((r) => setTimeout(r, 60));

const d = window.document;
const style = d.getElementById("blaikhole-style");
const styleText = style ? style.textContent : "";
const inlineHidden = (el) => el && el.style && el.style.display === "none";

const results = [];
const check = (name, cond) => results.push({ name, pass: !!cond });

check("style element injected", !!style);
check("style sets display:none (hide mode)", styleText.includes("display:none"));
check("style contains the AI Overview css selector", styleText.includes("aria-label='AI Overview'"));
check("contains-rule hid the deep AI Overview container", inlineHidden(d.getElementById("aiwrap")));
check("normal result NOT hidden", !inlineHidden(d.getElementById("normal")));
check("normal result unmarked", !d.getElementById("normal").hasAttribute("data-blaikhole"));
check("no overreach onto <html>/<body>", !inlineHidden(d.documentElement) && !inlineHidden(d.body));

// Source-level block (Google udm=14): verify the pure redirect decision.
const rt = exposed && exposed.redirectTarget;
const lists = exposed && exposed.activeLists ? exposed.activeLists() : [];
check("redirect helper exposed to test seam", typeof rt === "function");
check("bare google search gets udm=14 appended",
  rt && rt("https://www.google.com/search?q=cats", lists) === "https://www.google.com/search?q=cats&udm=14");
check("a search already carrying udm is left alone",
  rt && rt("https://www.google.com/search?q=cats&udm=14", lists) === null);
check("google images (udm=2) is not forced to web",
  rt && rt("https://www.google.com/search?q=cats&udm=2", lists) === null);
check("non-search google paths are untouched",
  rt && rt("https://www.google.com/maps?q=cats", lists) === null);

// Multi-param source block (DuckDuckGo: assist=false + kbe=0), via a synthetic list.
const ddg = [{ id: "ddg", redirect: [{ path: "/", set: { assist: "false", kbe: "0" } }] }];
check("multi-param redirect adds all missing params",
  rt && rt("https://duckduckgo.com/?q=cats", ddg) === "https://duckduckgo.com/?q=cats&assist=false&kbe=0");
check("multi-param redirect leaves a fully-set url alone",
  rt && rt("https://duckduckgo.com/?q=cats&assist=false&kbe=0", ddg) === null);
check("multi-param redirect fills only the missing param",
  rt && rt("https://duckduckgo.com/?q=cats&assist=false", ddg) === "https://duckduckgo.com/?q=cats&assist=false&kbe=0");

// Host matching must respect label boundaries (no look-alike / phishing false positives).
const hm = exposed && exposed.hostMatches;
check("host: www.google.com matches 'google.'", hm && hm("www.google.com", "google.") === true);
check("host: google.co.uk matches 'google.'", hm && hm("google.co.uk", "google.") === true);
check("host: notgoogle.com does NOT match 'google.'", hm && hm("notgoogle.com", "google.") === false);
check("host: www.youtube.com matches 'youtube.com'", hm && hm("www.youtube.com", "youtube.com") === true);
check("host: youtube.com.evil.com does NOT match 'youtube.com'", hm && hm("youtube.com.evil.com", "youtube.com") === false);

// Blocked counter: #aiov (css match) + #aiwrap (contains match) = 2 distinct surfaces, deduped,
// and the overreach guard means <body>/<html> are never counted.
const count = exposed && exposed.getBlockedCount ? exposed.getBlockedCount() : -1;
check("blocked counter reports the 2 distinct AI surfaces", count === 2);
const detail = exposed && exposed.getBlockedDetail ? exposed.getBlockedDetail() : {};
check("named breakdown attributes both surfaces to google-ai", detail.byList && detail.byList["google-ai"] === 2);
check("named breakdown carries the human-readable list name",
  detail.names && typeof detail.names["google-ai"] === "string" && detail.names["google-ai"].length > 0);
// the fixture URL carries udm=14, so google-ai is recorded as blocked at the source too
check("source-level block is recorded separately",
  Array.isArray(detail.sources) && detail.sources.includes("google-ai"));

let ok = true;
for (const r of results) { console.log((r.pass ? "PASS " : "FAIL ") + r.name); if (!r.pass) ok = false; }
console.log("\n" + (ok ? "ALL PASS" : "SOME FAILED"));
window.close();
process.exit(ok ? 0 : 1);
