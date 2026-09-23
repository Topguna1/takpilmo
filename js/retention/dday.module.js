function storage() {
  return window.ddakpilmo?.retention?.storage;
}

function normalizeDday(raw) {
  if (!raw || typeof raw !== "object") return null;
  const id = String(raw.id || "").trim();
  const title = String(raw.title || "").trim().slice(0, 40);
  const date = String(raw.date || "").trim();
  if (!id || !title || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  return { id, title, date };
}

function getDdays() {
  const s = storage();
  if (!s) return [];
  const raw = s.readJSON(s.keys.ddays, null);
  const fallback = raw == null ? s.readJSON(s.keys.legacyDdays, []) : raw;
  return (Array.isArray(fallback) ? fallback : [])
    .map(normalizeDday)
    .filter(Boolean)
    .sort((a, b) => {
      const leftA = daysUntil(a.date);
      const leftB = daysUntil(b.date);
      const rankA = leftA == null ? Number.MAX_SAFE_INTEGER : leftA < 0 ? 100000 + Math.abs(leftA) : leftA;
      const rankB = leftB == null ? Number.MAX_SAFE_INTEGER : leftB < 0 ? 100000 + Math.abs(leftB) : leftB;
      return rankA - rankB;
    })
    .slice(0, 5);
}

function saveDdays(items) {
  const s = storage();
  if (!s) return [];
  const next = (Array.isArray(items) ? items : [])
    .map(normalizeDday)
    .filter(Boolean)
    .slice(0, 5);
  s.writeJSON(s.keys.ddays, next);
  s.updateRetentionState({ ddays: next }, { render: false });
  return next;
}

function addDday(title, date) {
  const item = normalizeDday({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title,
    date,
  });
  if (!item) return getDdays();
  return saveDdays([item, ...getDdays()]);
}

function removeDday(id) {
  return saveDdays(getDdays().filter((item) => item.id !== id));
}

function daysUntil(date) {
  const s = storage();
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(String(date || ""))) return null;
  const today = new Date(`${s.todayKey()}T00:00:00`);
  const target = new Date(`${date}T00:00:00`);
  if (Number.isNaN(target.getTime())) return null;
  return Math.ceil((target.getTime() - today.getTime()) / 86400000);
}

export function installDday() {
  window.ddakpilmo = window.ddakpilmo || {};
  window.ddakpilmo.retention = window.ddakpilmo.retention || {};

  const api = {
    getDdays,
    addDday,
    removeDday,
    daysUntil,
  };

  window.ddakpilmo.retention.dday = api;
  storage()?.updateRetentionState({ ddays: getDdays() }, { render: false });
  return api;
}
