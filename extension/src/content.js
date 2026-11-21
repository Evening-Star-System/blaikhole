// Blaikhole content engine.
// Deterministic hiding of KNOWN AI surfaces. It never guesses whether text "is AI".
// Flow: synchronous default hide at document_start, then reconcile with stored settings,
// then keep up with SPA navigation via a debounced MutationObserver.
(() => {
  "use strict";

  const STYLE_ID = "blaikhole-style";
  const BADGE_CLASS = "blaikhole-badge";
  const MARK = "data-blaikhole";
  const api = (typeof browser !== "undefined" ? browser : (typeof chrome !== "undefined" ? chrome : null));
  const host = location.hostname;
  const LIST = (window.__BLAIKHOLE_LIST__ && Array.isArray(window.__BLAIKHOLE_LIST__.lists))
    ? window.__BLAIKHOLE_LIST__
    : { lists: [] };

  // Defaults until storage resolves: every recommended list on, mode = hide.
  let settings = { mode: "hide", enabled: {}, custom: [] };

  function listOn(l) {
    if (Object.prototype.hasOwnProperty.call(settings.enabled, l.id)) return !!settings.enabled[l.id];
    return l.recommended !== false;
  }

  function activeLists() {
    return LIST.lists.filter(l => listOn(l) && (l.match || []).some(m => host.includes(m)));
  }

  function badgeCss() {
    return "." + BADGE_CLASS + "{all:unset;position:absolute;top:2px;left:2px;z-index:2147483647;" +
      "background:#1b1035;color:#d7c9ff;font:600 10px/1.4 system-ui,sans-serif;padding:1px 5px;" +
      "border-radius:4px;letter-spacing:.04em;pointer-events:none;}";
  }

  function buildCss(lists, mode) {
    const sels = [];
    for (const l of lists) for (const c of (l.css || [])) if (c) sels.push(c);
    let css = badgeCss();
    if (!sels.length) return css;
    const sel = sels.join(",\n");
    if (mode === "dim") {
      css += sel + "{opacity:.12 !important;filter:grayscale(1) !important;transition:opacity .15s ease;}\n" +
             sel + ":hover{opacity:1 !important;filter:none !important;}";
    } else if (mode === "label") {
      // leave visible; JS adds badges to css-matched nodes too
    } else {
      css += sel + "{display:none !important;}";
    }
    return css;
  }

  function injectStyle(css) {
    let el = document.getElementById(STYLE_ID);
    if (!el) {
      el = document.createElement("style");
      el.id = STYLE_ID;
      (document.head || document.documentElement).appendChild(el);
    }
    if (el.textContent !== css) el.textContent = css;
  }

  function addBadge(el, list) {
    if (!el || el.querySelector("." + BADGE_CLASS)) return;
    const cs = getComputedStyle(el);
    if (cs.position === "static") el.style.setProperty("position", "relative");
    const b = document.createElement("span");
    b.className = BADGE_CLASS;
    b.textContent = "AI";
    b.title = "Flagged by Blaikhole: " + (list ? list.name : "AI content");
    el.appendChild(b);
  }

  function act(el, mode, list) {
    if (!el || el.nodeType !== 1 || el.getAttribute(MARK)) return;
    el.setAttribute(MARK, list ? list.id : "ai");
    if (mode === "hide") el.style.setProperty("display", "none", "important");
    else if (mode === "dim") { el.style.setProperty("opacity", ".12", "important"); el.style.setProperty("filter", "grayscale(1)", "important"); }
    else if (mode === "label") addBadge(el, list);
  }

  // Durable text/aria anchor matcher (handles css that classes churn through).
  function applyContains(lists, mode) {
    for (const l of lists) {
      for (const rule of (l.contains || [])) {
        const phrase = (rule.text || "").toLowerCase();
        if (!phrase) continue;
        const up = rule.up || 0;
        const maxlen = rule.maxlen || 40;
        let nodes;
        try { nodes = document.querySelectorAll(rule.scope || "h1,h2,h3,[role='heading'],span,div[aria-label]"); }
        catch (e) { continue; }
        for (const n of nodes) {
          const hay = (((n.getAttribute && n.getAttribute("aria-label")) || n.textContent || "")).trim().toLowerCase();
          if (!hay || hay.length > maxlen || !hay.includes(phrase)) continue;
          // Climb up to the container, but NEVER cross into <body>/<html>: acting on those
          // would hide the whole page. Stop one short of the body boundary.
          let target = n;
          for (let i = 0; i < up; i++) {
            const p = target.parentElement;
            if (!p || p === document.body || p === document.documentElement) break;
            target = p;
          }
          if (target === document.body || target === document.documentElement) continue;
          act(target, mode, l);
        }
      }
    }
  }

  // In label mode, also badge the css-matched nodes.
  function labelCssMatches(lists) {
    for (const l of lists) {
      for (const c of (l.css || [])) {
        let nodes;
        try { nodes = document.querySelectorAll(c); } catch (e) { continue; }
        for (const n of nodes) act(n, "label", l);
      }
    }
  }

  function run() {
    const lists = activeLists();
    injectStyle(buildCss(lists, settings.mode));
    if (!lists.length) return;
    if (settings.mode === "label") labelCssMatches(lists);
    applyContains(lists, settings.mode);
  }

  // 1. Synchronous first pass with defaults (flash-free for the common case).
  run();

  // 2. Reconcile with stored settings, then start observing.
  function applyStored(res) {
    const s = res && res.blaikhole;
    if (s && typeof s === "object") {
      settings.mode = s.mode || settings.mode;
      settings.enabled = s.enabled || settings.enabled;
      settings.custom = Array.isArray(s.custom) ? s.custom : settings.custom;
    }
    run();
    mergeCustom().finally(() => { run(); observe(); });
  }

  // 3. Best-effort merge of user custom remote lists (same JSON schema).
  async function mergeCustom() {
    if (!settings.custom || !settings.custom.length) return;
    for (const url of settings.custom) {
      try {
        const r = await fetch(url, { credentials: "omit", cache: "no-cache" });
        const data = await r.json();
        if (data && Array.isArray(data.lists)) {
          for (const l of data.lists) if (l && l.id && !LIST.lists.some(x => x.id === l.id)) LIST.lists.push(l);
        }
      } catch (e) { /* ignore a bad custom list, never break the page */ }
    }
  }

  let timer = null;
  function schedule() { if (timer) return; timer = setTimeout(() => { timer = null; run(); }, 150); }
  function observe() {
    try {
      const mo = new MutationObserver(schedule);
      mo.observe(document.documentElement, { childList: true, subtree: true });
    } catch (e) { /* no-op */ }
    let last = location.href;
    setInterval(() => { if (location.href !== last) { last = location.href; schedule(); } }, 600);
  }

  if (api && api.storage && api.storage.local) {
    try {
      const got = api.storage.local.get("blaikhole");
      if (got && typeof got.then === "function") got.then(applyStored, () => { run(); observe(); });
      else api.storage.local.get("blaikhole", applyStored);
    } catch (e) { run(); observe(); }
  } else {
    observe();
  }
})();
