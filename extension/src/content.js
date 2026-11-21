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
  // `allow` is a per-site whitelist: { "<host>": ["<listId>", ...] } = let that surface through here.
  let settings = { mode: "hide", enabled: {}, custom: [], allow: {} };

  // What is blocked on this page right now, deterministically: the distinct elements the active rules
  // match, attributed to the list that caught them, so the UI can name the surfaces ("Google AI
  // Overview", etc), not just show a bare number. `sources` lists ids blocked at the source (e.g. a
  // udm=14 redirect), which have no in-page element to count. Nothing is guessed.
  let lastBlocked = { total: 0, byList: {}, names: {}, sources: [] };
  let countedForPage = 0; // how much of this page we have already added to the lifetime total

  function listOn(l) {
    if (Object.prototype.hasOwnProperty.call(settings.enabled, l.id)) return !!settings.enabled[l.id];
    return l.recommended !== false;
  }

  // Whitelisted for THIS site: the user chose to let this surface through here.
  function allowedHere(l) {
    const a = settings.allow && settings.allow[host];
    return Array.isArray(a) && a.indexOf(l.id) !== -1;
  }

  function matchesHost(l) {
    return (l.match || []).some(m => host.includes(m));
  }

  function activeLists() {
    return LIST.lists.filter(l => listOn(l) && !allowedHere(l) && matchesHost(l));
  }

  // Source-level block: some sites expose a URL switch that turns AI OFF server-side
  // (e.g. Google's `udm=14` = plain web results, no AI Overview). That is strictly better
  // than hiding: the AI never renders, so there is no flash and nothing to catch after paint.
  // Pure: returns the URL to navigate to, or null to leave the page as-is. `lists` is already
  // filtered to the active, enabled lists for this host.
  // A redirect rule sets one or more query params. `set` is the general form ({key: value, ...});
  // `param`/`value` is the single-param shorthand.
  function ruleSet(r) {
    if (r.set && typeof r.set === "object") return r.set;
    if (r.param) return { [r.param]: r.value };
    return null;
  }

  function redirectTarget(href, lists) {
    let u;
    try { u = new URL(href); } catch (e) { return null; }
    for (const l of lists) {
      for (const r of (l.redirect || [])) {
        if (!r) continue;
        const set = ruleSet(r);
        if (!set) continue;
        if (r.path && !u.pathname.startsWith(r.path)) continue;        // scope to e.g. /search
        if (r.require_q !== false && !u.searchParams.has("q")) continue; // real query only
        let changed = false;
        for (const k of Object.keys(set)) {
          // only ADD a param that is absent, never clobber an existing one (e.g. udm=2 images)
          if (!u.searchParams.has(k)) { u.searchParams.set(k, String(set[k])); changed = true; }
        }
        if (changed) return u.toString();
      }
    }
    return null;
  }

  function maybeRedirect() {
    let target;
    try { target = redirectTarget(location.href, activeLists()); } catch (e) { return false; }
    if (!target || target === location.href) return false;
    try { location.replace(target); return true; } catch (e) { return false; }
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

  // Tally distinct blocked elements, attributed to the list that caught each one: css-selector
  // matches (live) plus contains-matched nodes (they carry the MARK attribute = list id after act).
  // Deduped per element (first list to claim it wins), and never body/html.
  function countBlocked(lists) {
    const owner = new Map(); // element -> list id
    for (const l of lists) {
      for (const c of (l.css || [])) {
        let nodes;
        try { nodes = document.querySelectorAll(c); } catch (e) { continue; }
        for (const n of nodes) {
          if (n === document.body || n === document.documentElement) continue;
          if (!owner.has(n)) owner.set(n, l.id);
        }
      }
    }
    let marked;
    try { marked = document.querySelectorAll("[" + MARK + "]"); } catch (e) { marked = []; }
    for (const n of marked) {
      if (n === document.body || n === document.documentElement) continue;
      if (!owner.has(n)) owner.set(n, n.getAttribute(MARK) || "ai");
    }
    const byList = {};
    for (const id of owner.values()) byList[id] = (byList[id] || 0) + 1;
    const names = {};
    for (const l of lists) names[l.id] = l.name || l.id;
    return { total: owner.size, byList, names };
  }

  // Which active lists blocked this page at the SOURCE (their redirect rule is already satisfied in
  // the URL, e.g. udm=14 is present). These have no in-page element, so they are reported separately.
  function sourceBlocks(lists) {
    const out = [];
    let u;
    try { u = new URL(location.href); } catch (e) { return out; }
    for (const l of lists) {
      for (const r of (l.redirect || [])) {
        if (!r) continue;
        const set = ruleSet(r);
        if (!set) continue;
        if (r.path && !u.pathname.startsWith(r.path)) continue;
        if (r.require_q !== false && !u.searchParams.has("q")) continue;
        let allSet = true;
        for (const k of Object.keys(set)) {
          if (u.searchParams.get(k) !== String(set[k])) { allSet = false; break; }
        }
        if (allSet) { out.push(l.id); break; }
      }
    }
    return out;
  }

  // Lifetime total, the shareable milestone. Add only the growth of THIS page's count (a new content
  // script runs per navigation, so countedForPage resets), never double-counting observer re-runs.
  function bumpLifetime(shown) {
    if (!api || !api.storage || !api.storage.local) return;
    const delta = shown - countedForPage;
    if (delta <= 0) return;
    countedForPage = shown;
    try {
      const apply = (res) => {
        const cur = (res && res.blaikhole_stats && typeof res.blaikhole_stats.lifetime === "number")
          ? res.blaikhole_stats.lifetime : 0;
        api.storage.local.set({ blaikhole_stats: { lifetime: cur + delta } });
      };
      const got = api.storage.local.get("blaikhole_stats");
      if (got && typeof got.then === "function") got.then(apply, () => {});
      else api.storage.local.get("blaikhole_stats", apply);
    } catch (e) { /* no-op */ }
  }

  // Tell the background page the per-tab count so it can set the toolbar badge.
  function reportCount(shown) {
    if (!api || !api.runtime || !api.runtime.sendMessage) return;
    try {
      const r = api.runtime.sendMessage({ type: "blaikhole:count", total: shown });
      if (r && typeof r.catch === "function") r.catch(() => {});
    } catch (e) { /* no background yet, fine */ }
  }

  function run() {
    const lists = activeLists();
    injectStyle(buildCss(lists, settings.mode));
    if (!lists.length) { lastBlocked = { total: 0, byList: {}, names: {}, sources: [] }; return; }
    if (settings.mode === "label") labelCssMatches(lists);
    applyContains(lists, settings.mode);
    const detail = countBlocked(lists);
    detail.sources = sourceBlocks(lists);
    lastBlocked = detail;
    const shown = detail.total + detail.sources.length;
    bumpLifetime(shown);
    reportCount(shown);
  }

  // 1. Synchronous first pass with defaults at document_start. This CSS-hides known AI surfaces
  //    before paint (flash-free), which also covers the brief window before the source-level
  //    redirect fires in step 2.
  run();

  // Answer the toolbar popup when it asks what is blocked on this page.
  if (api && api.runtime && api.runtime.onMessage) {
    try {
      api.runtime.onMessage.addListener((msg, sender, sendResponse) => {
        if (msg && msg.type === "blaikhole:getDetail") {
          sendResponse(Object.assign({ host: host }, lastBlocked));
          return true;
        }
      });
    } catch (e) { /* no-op */ }
  }

  // 2. Reconcile with stored settings, then start observing.
  function applyStored(res) {
    const s = res && res.blaikhole;
    if (s && typeof s === "object") {
      settings.mode = s.mode || settings.mode;
      settings.enabled = s.enabled || settings.enabled;
      settings.custom = Array.isArray(s.custom) ? s.custom : settings.custom;
      settings.allow = (s.allow && typeof s.allow === "object") ? s.allow : settings.allow;
    }
    // 2. Source-level block now that settings are known: only redirects lists that are active here
    //    (honors disable + per-site whitelist), so it never fights a whitelist or loops. The
    //    document_start CSS hide above already prevented any flash.
    if (maybeRedirect()) return;
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

  // Test-only seam: the regression test sets window.__BLAIKHOLE_EXPOSE__ before loading this
  // script to assert the pure redirect logic. No page ever sets it, so nothing leaks in production.
  try {
    if (typeof window !== "undefined" && typeof window.__BLAIKHOLE_EXPOSE__ === "function") {
      window.__BLAIKHOLE_EXPOSE__({
        redirectTarget, activeLists,
        getBlockedCount: () => lastBlocked.total,
        getBlockedDetail: () => lastBlocked,
      });
    }
  } catch (e) { /* no-op */ }
})();
