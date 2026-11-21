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

const dom = new JSDOM(html, {
  url: "https://www.google.com/search?q=test",
  runScripts: "dangerously",
  pretendToBeVisual: true,
});
const { window } = dom;
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

let ok = true;
for (const r of results) { console.log((r.pass ? "PASS " : "FAIL ") + r.name); if (!r.pass) ok = false; }
console.log("\n" + (ok ? "ALL PASS" : "SOME FAILED"));
window.close();
process.exit(ok ? 0 : 1);
