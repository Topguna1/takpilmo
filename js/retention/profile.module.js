const DEFAULT_PROFILE = {
  age: "",
  subjects: [],
};

const ALLOWED_AGES = new Set(["", "elem", "mid", "high", "adult"]);

function storage() {
  return window.ddakpilmo?.retention?.storage;
}

function normalizeProfile(raw) {
  const profile = raw && typeof raw === "object" ? raw : {};
  const age = ALLOWED_AGES.has(profile.age) ? profile.age : "";
  const subjects = Array.isArray(profile.subjects)
    ? profile.subjects.map((subject) => String(subject || "").trim()).filter(Boolean).slice(0, 8)
    : [];
  return { age, subjects: Array.from(new Set(subjects)) };
}

function getProfile() {
  const s = storage();
  if (!s) return { ...DEFAULT_PROFILE };
  return normalizeProfile(s.readJSON(s.keys.profile, DEFAULT_PROFILE));
}

function saveProfile(nextProfile) {
  const s = storage();
  if (!s) return getProfile();
  const profile = normalizeProfile(nextProfile);
  s.writeJSON(s.keys.profile, profile);
  s.updateRetentionState({ profile }, { render: true });
  return profile;
}

function setProfileAge(age) {
  return saveProfile({ ...getProfile(), age });
}

function setProfileSubjects(subjects) {
  return saveProfile({ ...getProfile(), subjects });
}

export function installProfile() {
  window.ddakpilmo = window.ddakpilmo || {};
  window.ddakpilmo.retention = window.ddakpilmo.retention || {};

  const api = {
    getProfile,
    saveProfile,
    setProfileAge,
    setProfileSubjects,
  };

  window.ddakpilmo.retention.profile = api;
  storage()?.updateRetentionState({ profile: getProfile() }, { render: false });
  return api;
}
