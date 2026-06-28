const STORAGE_PREFIX = "ddakpilmo.retention.";

const KEYS = {
  recentSites: "takpilmo_recent_sites",
  dailySeen: `${STORAGE_PREFIX}dailySeen.v1`,
  bookmarks: `${STORAGE_PREFIX}bookmarks.v1`,
  pinnedSites: `${STORAGE_PREFIX}pinnedSites.v1`,
  profile: `${STORAGE_PREFIX}profile.v1`,
  ddays: "takpilmo_exam_ddays",
  checkins: `${STORAGE_PREFIX}checkins.v1`,
  season: `${STORAGE_PREFIX}season.v1`,
  legacyRecentSites: `${STORAGE_PREFIX}recentSites.v1`,
  legacyDdays: `${STORAGE_PREFIX}ddays.v1`,
};

function cloneFallback(fallback) {
  if (Array.isArray(fallback)) return fallback.slice();
  if (fallback && typeof fallback === "object") return { ...fallback };
  return fallback;
}

function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return cloneFallback(fallback);
    const parsed = JSON.parse(raw);
    return parsed == null ? cloneFallback(fallback) : parsed;
  } catch {
    return cloneFallback(fallback);
  }
}

function writeJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

function normalizeSiteKey(siteOrKey) {
  if (siteOrKey && typeof siteOrKey === "object") {
    return String(
      siteOrKey.key ||
      siteOrKey.id ||
      siteOrKey.slug ||
      siteOrKey.url ||
      siteOrKey.name ||
      ""
    ).trim();
  }
  return String(siteOrKey || "").trim();
}

function uniqueSiteKeys(values, limit = 50) {
  const seen = new Set();
  const result = [];
  (Array.isArray(values) ? values : []).forEach((value) => {
    const key = normalizeSiteKey(value);
    if (!key || seen.has(key)) return;
    seen.add(key);
    result.push(key);
  });
  return result.slice(0, Math.max(0, limit));
}

function todayKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getState() {
  return window.App?.store?.getState?.() || window.state || {};
}

function getSites() {
  const state = getState();
  return Array.isArray(state.sites) ? state.sites : [];
}

function updateRetentionState(patch, options = {}) {
  const store = window.App?.store;
  const current = store?.getState?.() || window.state || {};
  const nextRetention = {
    ...(current.retention || {}),
    ...(patch || {}),
  };

  if (store?.setState) {
    store.setState({ retention: nextRetention }, { render: options.render === true });
  } else {
    window.state = {
      ...(window.state || {}),
      retention: nextRetention,
    };
  }

  try {
    window.dispatchEvent(new CustomEvent("ddakpilmo:retention-change", {
      detail: nextRetention,
    }));
  } catch {}

  return nextRetention;
}

function siteIndex() {
  if (typeof window.buildSiteIndex === "function") return window.buildSiteIndex();
  const map = new Map();
  getSites().forEach((site) => {
    const key = normalizeSiteKey(site);
    if (!key) return;
    map.set(key, site);
    map.set(key.toLowerCase(), site);
  });
  return map;
}

function resolveSites(keys, limit = 20) {
  const index = siteIndex();
  return uniqueSiteKeys(keys, limit)
    .map((key) => index.get(key) || index.get(key.toLowerCase()))
    .filter(Boolean);
}

export function installRetentionStorage() {
  window.ddakpilmo = window.ddakpilmo || {};
  window.ddakpilmo.retention = window.ddakpilmo.retention || {};

  const api = {
    keys: KEYS,
    readJSON,
    writeJSON,
    normalizeSiteKey,
    uniqueSiteKeys,
    todayKey,
    getState,
    getSites,
    updateRetentionState,
    resolveSites,
  };

  window.ddakpilmo.retention.storage = api;
  return api;
}
