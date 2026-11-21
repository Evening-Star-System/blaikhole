// Blaikhole popup / options. Reads and writes one settings object:
//   { mode: "hide"|"dim"|"label", enabled: {listId: bool}, custom: [url], allow: {host:[listId]} }
// and reads the lifetime stat from { blaikhole_stats: { lifetime } }.
(() => {
  "use strict";
  const api = (typeof browser !== "undefined" ? browser : chrome);
  const LIST = (window.__BLAIKHOLE_LIST__ && Array.isArray(window.__BLAIKHOLE_LIST__.lists))
    ? window.__BLAIKHOLE_LIST__ : { lists: [] };
  const nameOf = (id) => { const l = LIST.lists.find((x) => x.id === id); return l ? (l.name || id) : id; };

  // Blaikhole's page on the Evening Star Productions studio hub. This is the locked canonical URL.
  const SHARE_URL = "https://productions.eveningstar.app/blaikhole";

  let settings = { mode: "hide", enabled: {}, custom: [], allow: {}, paused: {} };
  let lifetime = 0;
  let currentTabId = null;
  let currentHost = "";

  const $ = (id) => document.getElementById(id);

  function listOn(l) {
    if (Object.prototype.hasOwnProperty.call(settings.enabled, l.id)) return !!settings.enabled[l.id];
    return l.recommended !== false;
  }

  function save() { return api.storage.local.set({ blaikhole: settings }); }

  // "Amazon AI (Rufus and AI slop)" -> { main: "Amazon AI", detail: "Rufus and AI slop" }
  function splitName(name) {
    const m = /^(.*?)\s*\((.*)\)\s*$/.exec(name || "");
    return m ? { main: m[1], detail: m[2] } : { main: name || "", detail: "" };
  }

  function renderLists() {
    const host = $("lists");
    host.textContent = "";
    for (const l of LIST.lists) {
      const row = document.createElement("label");
      row.className = "toggle";
      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.checked = listOn(l);
      cb.setAttribute("aria-label", l.name || l.id);
      cb.addEventListener("change", () => { settings.enabled[l.id] = cb.checked; save(); });
      const { main, detail } = splitName(l.name || l.id);
      const txt = document.createElement("span");
      txt.className = "txt";
      const mEl = document.createElement("span");
      mEl.className = "main";
      mEl.textContent = main;
      txt.appendChild(mEl);
      if (detail) {
        const dEl = document.createElement("span");
        dEl.className = "detail";
        dEl.textContent = detail;
        txt.appendChild(dEl);
      }
      row.appendChild(cb);
      row.appendChild(txt);
      host.appendChild(row);
    }
  }

  function renderMode() {
    for (const r of document.querySelectorAll("input[name=mode]")) {
      r.checked = (r.value === (settings.mode || "hide"));
      r.addEventListener("change", () => { if (r.checked) { settings.mode = r.value; save(); } });
    }
  }

  function renderCustom() {
    $("custom").value = (settings.custom || []).join("\n");
    $("save-custom").addEventListener("click", () => {
      const urls = $("custom").value.split("\n").map(s => s.trim()).filter(Boolean);
      settings.custom = urls;
      save().then(() => { $("custom-status").textContent = "Saved. Reload pages to apply."; });
    });
  }

  function reloadTab() {
    try { if (currentTabId != null && api.tabs && api.tabs.reload) api.tabs.reload(currentTabId); } catch (e) { /* ignore */ }
    window.close();
  }

  // Let a surface through on THIS site only, then reload so it takes effect at once.
  function allowHere(listId) {
    if (!currentHost) return;
    const a = (settings.allow[currentHost] || []).slice();
    if (a.indexOf(listId) === -1) a.push(listId);
    settings.allow[currentHost] = a;
    save().then(reloadTab);
  }
  function blockAgain(listId) {
    if (!currentHost) return;
    const a = (settings.allow[currentHost] || []).filter((x) => x !== listId);
    if (a.length) settings.allow[currentHost] = a; else delete settings.allow[currentHost];
    save().then(reloadTab);
  }

  // Master off for this site: the quick "turn it off here" switch.
  function pauseHere() {
    if (!currentHost) return;
    settings.paused = settings.paused || {};
    settings.paused[currentHost] = true;
    save().then(reloadTab);
  }
  function resumeHere() {
    if (!currentHost || !settings.paused) return;
    delete settings.paused[currentHost];
    save().then(reloadTab);
  }
  function renderPause() {
    const bar = $("pausebar");
    if (!bar) return;
    if (!currentHost) { bar.hidden = true; return; }
    const paused = !!(settings.paused && settings.paused[currentHost]);
    bar.classList.toggle("paused", paused);
    $("pause-label").textContent = paused ? "Blaikhole is paused on this site." : "Blaikhole is on for this site.";
    const btn = $("pause-btn");
    btn.textContent = paused ? "Resume here" : "Pause here";
    btn.onclick = paused ? resumeHere : pauseHere;
    bar.hidden = false;
  }

  function allowBtn(label, onClick) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "allowbtn";
    b.textContent = label;
    b.addEventListener("click", onClick);
    return b;
  }
  function blockedRow(id, rightEl) {
    const li = document.createElement("li");
    const nm = document.createElement("span");
    nm.className = "nm";
    const { main, detail } = splitName(nameOf(id));
    const m = document.createElement("span"); m.className = "main"; m.textContent = main; nm.appendChild(m);
    if (detail) { const d = document.createElement("span"); d.className = "sub"; d.textContent = detail; nm.appendChild(d); }
    li.appendChild(nm);
    li.appendChild(rightEl);
    return li;
  }

  // The big number is the lifetime total. At zero we show a calm "protected" state, never a bare 0.
  function renderHero() {
    const apply = (res) => {
      lifetime = (res && res.blaikhole_stats && typeof res.blaikhole_stats.lifetime === "number")
        ? res.blaikhole_stats.lifetime : 0;
      const num = $("hero-num"), label = $("hero-label");
      if (lifetime > 0) {
        num.textContent = lifetime.toLocaleString();
        label.textContent = lifetime === 1 ? "AI thing blocked" : "AI things blocked";
      } else {
        num.textContent = "0";
        label.textContent = "Nothing to block yet. That is good.";
      }
    };
    try {
      if (!api.storage || !api.storage.local) return;
      const got = api.storage.local.get("blaikhole_stats");
      if (got && typeof got.then === "function") got.then(apply, () => {});
      else api.storage.local.get("blaikhole_stats", apply);
    } catch (e) { /* ignore */ }
  }

  // Ask the active tab what it blocked. On the full options tab (no content script) this quietly does
  // nothing, which is fine.
  function renderPageStats() {
    if (!api.tabs || !api.tabs.query) return;
    const show = (detail) => {
      if (!detail || typeof detail.total !== "number") return;
      currentHost = detail.host || "";
      const sources = Array.isArray(detail.sources) ? detail.sources : [];
      const byList = detail.byList || {};
      const blockedIds = Object.keys(byList).sort((a, b) => byList[b] - byList[a]);
      for (const id of sources) if (!byList[id]) blockedIds.push(id);

      const blockUl = $("stat-list"), allowUl = $("allow-list");
      blockUl.textContent = ""; allowUl.textContent = "";
      for (const id of blockedIds) {
        blockUl.appendChild(blockedRow(id, allowBtn("Allow here", () => allowHere(id))));
      }
      const allowed = (currentHost && settings.allow[currentHost]) ? settings.allow[currentHost] : [];
      for (const id of allowed) {
        allowUl.appendChild(blockedRow(id, allowBtn("Block again", () => blockAgain(id))));
      }

      const n = blockedIds.length;
      $("blocked-sum").textContent = n > 0 ? ("Blocked on this page (" + n + ")") : "Blocked on this page";
      $("blocked-empty").hidden = (n > 0 || allowed.length > 0);
      $("hero-sub").textContent = n > 0
        ? (n === 1 ? "1 AI thing blocked here" : n + " AI things blocked here")
        : "Nothing to block on this page";
      renderPause();
    };
    const ask = (tabId) => {
      const msg = { type: "blaikhole:getDetail" };
      let r;
      try { r = api.tabs.sendMessage(tabId, msg); } catch (e) { r = undefined; }
      if (r && typeof r.then === "function") r.then(show, () => {});
      else { try { api.tabs.sendMessage(tabId, msg, show); } catch (e) { /* no content script here */ } }
    };
    const pick = (tabs) => { const t = tabs && tabs[0]; if (t && t.id != null) { currentTabId = t.id; ask(t.id); } };
    try {
      const q = api.tabs.query({ active: true, currentWindow: true });
      if (q && typeof q.then === "function") q.then(pick, () => {});
      else api.tabs.query({ active: true, currentWindow: true }, pick);
    } catch (e) { /* ignore */ }
  }

  // Share text leads with the user's number so the number does the convincing.
  function shareText() {
    const lead = lifetime > 0
      ? ("I blocked " + lifetime.toLocaleString() + " bits of unwanted AI with Blaikhole. ")
      : "I use Blaikhole to turn off unwanted AI. ";
    return lead + "It is free, with no account and no tracking. Get it: " + SHARE_URL;
  }

  function flashShareMsg(text) {
    const el = $("share-msg");
    if (!el) return;
    el.textContent = text;
    el.hidden = false;
    setTimeout(() => { el.hidden = true; }, 3500);
  }

  // Firefox desktop has no navigator.share, so copy-link is the real path there.
  function copyFallback() {
    const text = shareText();
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(
        () => flashShareMsg("Link copied. Paste it anywhere."),
        () => flashShareMsg("Copy this link: " + SHARE_URL)
      );
    } else {
      flashShareMsg("Share this link: " + SHARE_URL);
    }
  }

  function wireShare() {
    const btn = $("share");
    if (!btn) return;
    btn.addEventListener("click", () => {
      const data = { title: "Blaikhole", text: shareText(), url: SHARE_URL };
      if (navigator.share) {
        navigator.share(data).catch((e) => { if (e && e.name !== "AbortError") copyFallback(); });
      } else {
        copyFallback();
      }
    });
  }

  function load() {
    const apply = (res) => {
      const s = res && res.blaikhole;
      if (s && typeof s === "object") {
        settings.mode = s.mode || "hide";
        settings.enabled = s.enabled || {};
        settings.custom = Array.isArray(s.custom) ? s.custom : [];
        settings.allow = (s.allow && typeof s.allow === "object") ? s.allow : {};
        settings.paused = (s.paused && typeof s.paused === "object") ? s.paused : {};
      }
      renderLists();
      renderMode();
      renderCustom();
      renderHero();
      renderPageStats();
      wireShare();
    };
    try {
      const got = api.storage.local.get("blaikhole");
      if (got && typeof got.then === "function") got.then(apply, () => apply(null));
      else api.storage.local.get("blaikhole", apply);
    } catch (e) { apply(null); }
  }

  load();
})();
