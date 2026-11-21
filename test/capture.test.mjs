// Tests for the selector-capture helper's pure logic. Requires jsdom (dev only).
// Run from the repo root: node test/capture.test.mjs
import { JSDOM } from "jsdom";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const here = path.dirname(fileURLToPath(import.meta.url));
const src = fs.readFileSync(path.join(here, "..", "scripts", "capture-selector.js"), "utf8");

const html = `<!DOCTYPE html><html><body>
  <div id="rufus-sidebar">rufus</div>
  <div id="_ngcontent-abc1234">generated</div>
  <div aria-label="AI Overview">aiov</div>
  <div data-testid="GrokDrawer">grok</div>
  <ytd-ai-summary-renderer>yt</ytd-ai-summary-renderer>
  <div class="GcKpu churny">only classes, created with ai inside</div>
</body></html>`;

const dom = new JSDOM(html, { url: "https://www.amazon.com/dp/B000", runScripts: "dangerously" });
const { window } = dom;
let api = null;
window.__BLAIKHOLE_CAPTURE_EXPOSE__ = (o) => { api = o; };
window.eval(src);

const d = window.document;
const results = [];
const check = (name, cond) => results.push({ name, pass: !!cond });

check("exposed pure helpers", api && typeof api.durableSelector === "function" && typeof api.captureRule === "function");

const ds = api.durableSelector.bind(api);
check("authored id -> #id", ds(d.getElementById("rufus-sidebar")) === "#rufus-sidebar");
check("generated id is rejected (not used as a selector)", ds(d.getElementById("_ngcontent-abc1234")) !== "#_ngcontent-abc1234");
check("aria-label -> tag[aria-label]", ds(d.querySelector('[aria-label="AI Overview"]')) === 'div[aria-label="AI Overview"]');
check("stable data-* -> tag[data-testid]", ds(d.querySelector('[data-testid="GrokDrawer"]')) === 'div[data-testid="GrokDrawer"]');
check("custom element tag is durable", ds(d.querySelector("ytd-ai-summary-renderer")) === "ytd-ai-summary-renderer");
check("class-only element has no durable selector", ds(d.querySelector(".GcKpu")) === null);

const rule = api.captureRule(d.querySelector('[aria-label="AI Overview"]'), "https://www.amazon.com/dp/B000");
check("rule host strips www", Array.isArray(rule.match) && rule.match[0] === "amazon.com");
check("rule uses css when durable", Array.isArray(rule.css) && rule.css[0] === 'div[aria-label="AI Overview"]');

const fallback = api.captureRule(d.querySelector(".GcKpu"), "https://www.amazon.com/dp/B000");
check("rule falls back to a contains anchor", Array.isArray(fallback.contains) && typeof fallback.contains[0].text === "string" && !fallback.css);

let ok = true;
for (const r of results) { console.log((r.pass ? "PASS " : "FAIL ") + r.name); if (!r.pass) ok = false; }
console.log("\n" + (ok ? "ALL PASS" : "SOME FAILED"));
window.close();
process.exit(ok ? 0 : 1);
