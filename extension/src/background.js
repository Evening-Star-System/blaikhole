// Blaikhole background. Its only job: paint the per-tab count onto the toolbar badge.
// Firefox runs this as a non-persistent event page, Chrome as a service worker, so register the
// listener at the top level and keep no state in memory.
(() => {
  "use strict";
  const api = (typeof browser !== "undefined" ? browser : (typeof chrome !== "undefined" ? chrome : null));
  if (!api || !api.runtime || !api.action) return;

  try { api.action.setBadgeBackgroundColor({ color: "#1b1035" }); } catch (e) { /* no-op */ }

  api.runtime.onMessage.addListener((msg, sender) => {
    if (!msg || msg.type !== "blaikhole:count") return;
    const tabId = sender && sender.tab && sender.tab.id;
    if (tabId == null) return;
    const n = msg.total | 0;
    try { api.action.setBadgeText({ tabId: tabId, text: n > 0 ? String(n) : "" }); } catch (e) { /* no-op */ }
  });
})();
