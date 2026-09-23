function storage() {
  return window.ddakpilmo?.retention?.storage;
}

function scoreForDate(key, dateKey) {
  const input = `${dateKey}:${key}`;
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) - hash) + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function getProfileFilteredSites(sites) {
  const profile = window.ddakpilmo?.retention?.profile?.getProfile?.() || {};
  return sites.filter((site) => {
    if (profile.age && !site?.ages?.includes?.(profile.age)) return false;
    if (Array.isArray(profile.subjects) && profile.subjects.length) {
      const subjects = Array.isArray(site?.subjects) ? site.subjects : [];
      if (!subjects.some((subject) => profile.subjects.includes(subject))) return false;
    }
    return true;
  });
}

function getDailyRecommendations(limit = 3) {
  const s = storage();
  if (!s) return [];
  const dateKey = s.todayKey();
  const sites = s.getSites();
  const preferred = getProfileFilteredSites(sites);
  const source = preferred.length >= limit ? preferred : sites;

  const selected = source
    .filter((site) => s.normalizeSiteKey(site))
    .slice()
    .sort((a, b) => (
      scoreForDate(s.normalizeSiteKey(a), dateKey) -
      scoreForDate(s.normalizeSiteKey(b), dateKey)
    ))
    .slice(0, limit);

  const keys = selected.map((site) => s.normalizeSiteKey(site));
  s.writeJSON(s.keys.dailySeen, { date: dateKey, siteKeys: keys });
  const currentKeys = s.getState()?.retention?.dailyRecommendedKeys || [];
  const changed = keys.length !== currentKeys.length || keys.some((key, index) => key !== currentKeys[index]);
  if (changed) {
    s.updateRetentionState({ dailyRecommendedKeys: keys }, { render: false });
  }
  return selected;
}

export function installDailyRecommend() {
  window.ddakpilmo = window.ddakpilmo || {};
  window.ddakpilmo.retention = window.ddakpilmo.retention || {};

  const api = {
    getDailyRecommendations,
  };

  window.ddakpilmo.retention.daily = api;
  return api;
}
