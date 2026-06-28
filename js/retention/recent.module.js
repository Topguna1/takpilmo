function storage() {
  return window.ddakpilmo?.retention?.storage;
}

function normalizeRecentItem(item) {
  const s = storage();
  if (!s) return null;
  if (item && typeof item === "object") {
    const key = s.normalizeSiteKey(item.key || item.siteKey || item);
    const viewedAt = String(item.viewedAt || item.ts || "").trim();
    if (!key) return null;
    return {
      key,
      viewedAt: viewedAt || new Date().toISOString(),
    };
  }

  const key = s.normalizeSiteKey(item);
  if (!key) return null;
  return {
    key,
    viewedAt: new Date().toISOString(),
  };
}

function getRecentItems() {
  const s = storage();
  if (!s) return [];
  const raw = s.readJSON(s.keys.recentSites, null);
  const fallback = raw == null ? s.readJSON(s.keys.legacyRecentSites, []) : raw;
  const seen = new Set();
  const result = [];

  (Array.isArray(fallback) ? fallback : [])
    .map(normalizeRecentItem)
    .filter(Boolean)
    .sort((a, b) => String(b.viewedAt).localeCompare(String(a.viewedAt)))
    .forEach((item) => {
      if (seen.has(item.key)) return;
      seen.add(item.key);
      result.push(item);
    });

  return result.slice(0, 8);
}

function getRecentKeys() {
  return getRecentItems().map((item) => item.key);
}

function recordRecentSite(siteOrKey) {
  const s = storage();
  if (!s) return [];
  const key = s.normalizeSiteKey(siteOrKey);
  if (!key) return getRecentKeys();

  const next = [
    { key, viewedAt: new Date().toISOString() },
    ...getRecentItems().filter((item) => item.key !== key),
  ].slice(0, 8);
  s.writeJSON(s.keys.recentSites, next);
  s.updateRetentionState({ recentSiteKeys: next.map((item) => item.key), recentSites: next }, { render: false });
  return next.map((item) => item.key);
}

export function installRecentSites() {
  window.ddakpilmo = window.ddakpilmo || {};
  window.ddakpilmo.retention = window.ddakpilmo.retention || {};

  const api = {
    getRecentItems,
    getRecentKeys,
    recordRecentSite,
  };

  window.ddakpilmo.retention.recent = api;
  storage()?.updateRetentionState({ recentSiteKeys: getRecentKeys(), recentSites: getRecentItems() }, { render: false });
  return api;
}
