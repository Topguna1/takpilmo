function storage() {
  return window.ddakpilmo?.retention?.storage;
}

function getPinnedKeys() {
  const s = storage();
  if (!s) return [];
  return s.uniqueSiteKeys(s.readJSON(s.keys.pinnedSites, []), 8);
}

function isPinned(siteOrKey) {
  const s = storage();
  const key = s?.normalizeSiteKey(siteOrKey);
  return !!key && getPinnedKeys().includes(key);
}

function togglePinned(siteOrKey) {
  const s = storage();
  if (!s) return [];
  const key = s.normalizeSiteKey(siteOrKey);
  if (!key) return getPinnedKeys();

  const current = getPinnedKeys();
  const next = current.includes(key)
    ? current.filter((item) => item !== key)
    : s.uniqueSiteKeys([key, ...current], 8);

  s.writeJSON(s.keys.pinnedSites, next);
  s.updateRetentionState({ pinnedSiteKeys: next }, { render: true });
  window.ddakpilmo?.retention?.syncSiteControls?.();
  return next;
}

export function installPinnedSites() {
  window.ddakpilmo = window.ddakpilmo || {};
  window.ddakpilmo.retention = window.ddakpilmo.retention || {};

  const api = {
    getPinnedKeys,
    isPinned,
    togglePinned,
  };

  window.ddakpilmo.retention.pinned = api;
  storage()?.updateRetentionState({ pinnedSiteKeys: getPinnedKeys() }, { render: false });
  return api;
}
