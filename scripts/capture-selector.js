// Blaikhole selector-capture helper.
// Paste this whole file into your browser's DevTools console on a page that shows AI you want blocked.
// Then click the offending element. A ready-to-paste Blaikhole rule is copied to your clipboard and
// printed in the console. Press Escape to cancel. It only reads the page and the clipboard.
(() => {
  "use strict";

  // Attributes that tend to be STABLE across a site's redesigns, best first. Class names are omitted
  // on purpose: they churn, and a class-name rule is the thing that rots and breaks the list.
  const STABLE_DATA = [
    "data-testid", "data-test-id", "data-test", "data-ai", "data-ai-generated",
    "data-component", "data-subtree", "data-csa-c-content-id"
  ];

  function escAttr(v) { return String(v).replace(/\\/g, "\\\\").replace(/"/g, '\\"'); }
  function escIdent(v) {
    if (typeof CSS !== "undefined" && CSS.escape) return CSS.escape(v);
    return String(v).replace(/[^a-zA-Z0-9_-]/g, (c) => "\\" + c);
  }

  // An id is only useful if a human authored it. Reject things that look generated.
  function isGeneratedId(id) {
    if (!id) return true;
    if (id.length > 30) return true;
    if (/[0-9]{4,}/.test(id)) return true;       // long run of digits
    if (/^[a-f0-9]{8,}$/i.test(id)) return true; // hex blob
    if (/[:._][a-z0-9]{5,}$/i.test(id)) return true; // framework-ish suffix (react :r1:, emotion)
    return false;
  }

  // Return the most durable single selector for this element, or null if nothing durable exists.
  function durableSelector(el) {
    if (!el || el.nodeType !== 1) return null;
    const tag = el.tagName.toLowerCase();
    const get = (a) => (el.getAttribute ? el.getAttribute(a) : null);

    if (el.id && !isGeneratedId(el.id)) return "#" + escIdent(el.id);

    const aria = get("aria-label");
    if (aria && aria.trim() && aria.length <= 40) return tag + '[aria-label="' + escAttr(aria.trim()) + '"]';

    for (const d of STABLE_DATA) {
      const v = get(d);
      if (v === "") return tag + "[" + d + "]";
      if (v != null && v.length <= 60) return tag + "[" + d + '="' + escAttr(v) + '"]';
    }

    // A custom element (tag has a dash) is itself a durable hook (web component).
    if (tag.includes("-")) return tag;

    const role = get("role");
    if (role) return tag + '[role="' + escAttr(role) + '"]';

    return null;
  }

  // Build a Blaikhole rule fragment for an element. Falls back to a text/aria anchor when there is no
  // durable selector, so the capture never comes back empty.
  function captureRule(el, href) {
    let host = "";
    try { host = new URL(href).hostname.replace(/^www\./, ""); } catch (e) { host = ""; }
    const rule = { match: [host] };
    const sel = durableSelector(el);
    if (sel) {
      rule.css = [sel];
    } else {
      const txt = ((el.getAttribute && el.getAttribute("aria-label")) || el.textContent || "").trim();
      const short = txt.slice(0, 40);
      rule.contains = [{
        text: short.toLowerCase(),
        scope: el.tagName.toLowerCase(),
        up: 0,
        maxlen: Math.max(24, short.length + 4)
      }];
      rule._note = "No durable selector found. This uses a text anchor: check it is specific enough.";
    }
    return rule;
  }

  // Test seam: the regression test sets this before loading the file to check the pure logic, and its
  // presence also suppresses the interactive capture mode. No page sets it.
  if (typeof window !== "undefined" && typeof window.__BLAIKHOLE_CAPTURE_EXPOSE__ === "function") {
    window.__BLAIKHOLE_CAPTURE_EXPOSE__({ durableSelector, captureRule });
    return;
  }

  // ---- interactive capture ----
  const HL = "blaikhole-capture-hl";
  let hovered = null;
  function paint(el) {
    if (hovered) hovered.style.outline = "";
    hovered = el;
    if (el) el.style.outline = "2px solid #b69cff";
  }
  function onMove(e) { paint(e.target); }
  function finish() {
    document.removeEventListener("mousemove", onMove, true);
    document.removeEventListener("click", onClick, true);
    document.removeEventListener("keydown", onKey, true);
    if (hovered) hovered.style.outline = "";
  }
  function onKey(e) { if (e.key === "Escape") { finish(); console.log("[Blaikhole] capture cancelled."); } }
  function onClick(e) {
    e.preventDefault();
    e.stopPropagation();
    const rule = captureRule(e.target, location.href);
    const text = JSON.stringify(rule, null, 2);
    finish();
    const done = () => console.log("%c[Blaikhole] rule copied to clipboard:\n" + text,
      "color:#b69cff");
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, done);
    else done();
    console.log("[Blaikhole] paste it into the right list in lists/blaikhole-core.json, then run scripts/sync-list.sh.");
  }
  document.addEventListener("mousemove", onMove, true);
  document.addEventListener("click", onClick, true);
  document.addEventListener("keydown", onKey, true);
  console.log("%c[Blaikhole] capture on. Hover highlights, click captures, Escape cancels.", "color:#b69cff;font-weight:bold");
})();
