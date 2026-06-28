const DEFAULT_CHECKIN = {
  lastDate: "",
  streak: 0,
  dates: [],
};

function storage() {
  return window.ddakpilmo?.retention?.storage;
}

function normalize(raw) {
  const value = raw && typeof raw === "object" ? raw : {};
  const dates = Array.isArray(value.dates)
    ? value.dates.filter((date) => /^\d{4}-\d{2}-\d{2}$/.test(String(date || ""))).slice(-60)
    : [];
  return {
    lastDate: /^\d{4}-\d{2}-\d{2}$/.test(String(value.lastDate || "")) ? value.lastDate : "",
    streak: Math.max(0, Number(value.streak || 0) | 0),
    dates,
  };
}

function getCheckin() {
  const s = storage();
  if (!s) return { ...DEFAULT_CHECKIN };
  return normalize(s.readJSON(s.keys.checkins, DEFAULT_CHECKIN));
}

function isYesterday(prevDate, todayDate) {
  const prev = new Date(`${prevDate}T00:00:00`);
  const today = new Date(`${todayDate}T00:00:00`);
  return Math.round((today.getTime() - prev.getTime()) / 86400000) === 1;
}

function checkInToday() {
  const s = storage();
  if (!s) return getCheckin();
  const today = s.todayKey();
  const current = getCheckin();
  if (current.lastDate === today) return current;

  const streak = current.lastDate && isYesterday(current.lastDate, today)
    ? current.streak + 1
    : 1;
  const next = {
    lastDate: today,
    streak,
    dates: Array.from(new Set([...(current.dates || []), today])).slice(-60),
  };
  s.writeJSON(s.keys.checkins, next);
  s.updateRetentionState({ checkin: next }, { render: false });
  return next;
}

function hasCheckedToday() {
  const s = storage();
  return !!s && getCheckin().lastDate === s.todayKey();
}

export function installCheckin() {
  window.ddakpilmo = window.ddakpilmo || {};
  window.ddakpilmo.retention = window.ddakpilmo.retention || {};

  const api = {
    getCheckin,
    checkInToday,
    hasCheckedToday,
  };

  window.ddakpilmo.retention.checkin = api;
  storage()?.updateRetentionState({ checkin: getCheckin() }, { render: false });
  return api;
}
