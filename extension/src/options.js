// Blaikhole options. Reads and writes a single settings object:
//   { mode: "hide"|"dim"|"label", enabled: {listId: bool}, custom: [url] }
(() => {
  "use strict";
  const api = (typeof browser !== "undefined" ? browser : chrome);
  const LIST = (window.__BLAIKHOLE_LIST__ && Array.isArray(window.__BLAIKHOLE_LIST__.lists))
    ? window.__BLAIKHOLE_LIST__ : { lists: [] };

  let settings = { mode: "hide", enabled: {}, custom: [], pill: false };

  const $ = (id) => document.getElementById(id);

  function listOn(l) {
    if (Object.prototype.hasOwnProperty.call(settings.enabled, l.id)) return !!settings.enabled[l.id];
    return l.recommended !== false;
  }

  function save() {
    return api.storage.local.set({ blaikhole: settings });
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
      cb.addEventListener("change", () => {
        settings.enabled[l.id] = cb.checked;
        save();
      });
      const span = document.createElement("span");
      span.textContent = l.name || l.id;
      row.appendChild(cb);
      row.appendChild(span);
      host.appendChild(row);
    }
  }

  function renderMode() {
    for (const r of document.querySelectorAll("input[name=mode]")) {
      r.checked = (r.value === (settings.mode || "hide"));
      r.addEventListener("change", () => {
        if (r.checked) { settings.mode = r.value; save(); }
      });
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

  function renderPill() {
    const cb = $("pill-toggle");
    if (!cb) return;
    cb.checked = !!settings.pill;
    cb.addEventListener("change", () => { settings.pill = cb.checked; save(); });
  }

  // The lifetime milestone, read from storage. Hidden until there is something to show.
  function renderLifetime() {
    const el = $("lifetime");
    if (!el || !api.storage || !api.storage.local) return;
    const apply = (res) => {
      const n = (res && res.blaikhole_stats && typeof res.blaikhole_stats.lifetime === "number")
        ? res.blaikhole_stats.lifetime : 0;
      if (n <= 0) { el.hidden = true; return; }
      el.textContent = "";
      const b = document.createElement("b");
      b.textContent = n.toLocaleString();
      el.appendChild(b);
      el.appendChild(document.createTextNode(" AI surfaces blocked since you installed Blaikhole"));
      el.hidden = false;
    };
    try {
      const got = api.storage.local.get("blaikhole_stats");
      if (got && typeof got.then === "function") got.then(apply, () => {});
      else api.storage.local.get("blaikhole_stats", apply);
    } catch (e) { /* ignore */ }
  }

  // Ask the active tab's content script what it blocked, and show it. When opened as the full options
  // tab (not the toolbar popup) the active tab is this extension page, which has no content script, so
  // the request quietly fails and the card stays hidden. That is the intended behavior.
  function renderPageStats() {
    if (!api.tabs || !api.tabs.query) return;
    const card = $("page-stats");

    const show = (detail) => {
      if (!detail || typeof detail.total !== "number") return;
      const sources = Array.isArray(detail.sources) ? detail.sources : [];
      const shown = detail.total + sources.length;
      $("stat-count").textContent = String(shown);
      $("stat-head").textContent = shown === 0
        ? "No AI slop found on this page"
        : (shown === 1 ? "AI surface blocked on this page" : "AI surfaces blocked on this page");

      const ul = $("stat-list");
      ul.textContent = "";
      const names = detail.names || {};
      const byList = detail.byList || {};
      const sourceSet = {};
      for (const id of sources) sourceSet[id] = true;
      // in-page hidden surfaces, most first
      const ids = Object.keys(byList).sort((a, b) => byList[b] - byList[a]);
      for (const id of ids) {
        const li = document.createElement("li");
        const name = document.createElement("span");
        name.textContent = names[id] || id;
        const n = document.createElement("span");
        n.className = "n";
        n.textContent = String(byList[id]);
        li.appendChild(name);
        li.appendChild(n);
        ul.appendChild(li);
      }
      // source-level blocks (no in-page element), labeled honestly
      for (const id of sources) {
        if (byList[id]) continue; // already shown as an in-page line
        const li = document.createElement("li");
        const name = document.createElement("span");
        name.textContent = names[id] || id;
        const tag = document.createElement("span");
        tag.className = "src";
        tag.textContent = "blocked at the source";
        li.appendChild(name);
        li.appendChild(tag);
        ul.appendChild(li);
      }
      card.classList.toggle("empty", shown === 0);
      card.hidden = false;
      renderLifetime();
    };

    const ask = (tabId) => {
      const msg = { type: "blaikhole:getDetail" };
      let r;
      try { r = api.tabs.sendMessage(tabId, msg); } catch (e) { r = undefined; }
      if (r && typeof r.then === "function") r.then(show, () => {});
      else { try { api.tabs.sendMessage(tabId, msg, show); } catch (e) { /* no content script here */ } }
    };

    const pick = (tabs) => {
      const tab = tabs && tabs[0];
      if (tab && tab.id != null) ask(tab.id);
    };

    try {
      const q = api.tabs.query({ active: true, currentWindow: true });
      if (q && typeof q.then === "function") q.then(pick, () => {});
      else api.tabs.query({ active: true, currentWindow: true }, pick);
    } catch (e) { /* ignore */ }
  }

  function load() {
    const got = api.storage.local.get("blaikhole");
    const apply = (res) => {
      const s = res && res.blaikhole;
      if (s && typeof s === "object") {
        settings.mode = s.mode || "hide";
        settings.enabled = s.enabled || {};
        settings.custom = Array.isArray(s.custom) ? s.custom : [];
        settings.pill = !!s.pill;
      }
      renderLists();
      renderMode();
      renderCustom();
      renderPill();
      renderPageStats();
    };
    if (got && typeof got.then === "function") got.then(apply, () => apply(null));
    else api.storage.local.get("blaikhole", apply);
  }

  load();
})();
