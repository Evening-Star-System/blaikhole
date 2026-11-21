// Blaikhole options. Reads and writes a single settings object:
//   { mode: "hide"|"dim"|"label", enabled: {listId: bool}, custom: [url] }
(() => {
  "use strict";
  const api = (typeof browser !== "undefined" ? browser : chrome);
  const LIST = (window.__BLAIKHOLE_LIST__ && Array.isArray(window.__BLAIKHOLE_LIST__.lists))
    ? window.__BLAIKHOLE_LIST__ : { lists: [] };

  let settings = { mode: "hide", enabled: {}, custom: [] };

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

  function load() {
    const got = api.storage.local.get("blaikhole");
    const apply = (res) => {
      const s = res && res.blaikhole;
      if (s && typeof s === "object") {
        settings.mode = s.mode || "hide";
        settings.enabled = s.enabled || {};
        settings.custom = Array.isArray(s.custom) ? s.custom : [];
      }
      renderLists();
      renderMode();
      renderCustom();
    };
    if (got && typeof got.then === "function") got.then(apply, () => apply(null));
    else api.storage.local.get("blaikhole", apply);
  }

  load();
})();
