function storage() {
  return window.ddakpilmo?.retention?.storage;
}

function getBookmarkKeys() {
  const s = storage();
  if (!s) return [];
  return s.uniqueSiteKeys(s.readJSON(s.keys.bookmarks, []), 200);
}

function isBookmarked(siteOrKey) {
  const s = storage();
  const key = s?.normalizeSiteKey(siteOrKey);
  return !!key && getBookmarkKeys().includes(key);
}

function toggleBookmark(siteOrKey) {
  const s = storage();
  if (!s) return [];
  const key = s.normalizeSiteKey(siteOrKey);
  if (!key) return getBookmarkKeys();

  const current = getBookmarkKeys();
  const next = current.includes(key)
    ? current.filter((item) => item !== key)
    : s.uniqueSiteKeys([key, ...current], 200);

  s.writeJSON(s.keys.bookmarks, next);
  s.updateRetentionState({ bookmarkKeys: next }, { render: true });
  window.ddakpilmo?.retention?.syncSiteControls?.();
  return next;
}

export function installBookmarks() {
  window.ddakpilmo = window.ddakpilmo || {};
  window.ddakpilmo.retention = window.ddakpilmo.retention || {};

  const api = {
    getBookmarkKeys,
    isBookmarked,
    toggleBookmark,
  };

  window.ddakpilmo.retention.bookmarks = api;
  storage()?.updateRetentionState({ bookmarkKeys: getBookmarkKeys() }, { render: false });
  return api;
}
