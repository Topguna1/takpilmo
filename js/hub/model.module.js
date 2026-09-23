const AGES = { elem: "\uCD08\uB4F1", mid: "\uC911\uB4F1", high: "\uACE0\uB4F1", adult: "\uC131\uC778" };
const SUBJECTS = { korean: "\uAD6D\uC5B4", english: "\uC601\uC5B4", math: "\uC218\uD559", social: "\uC0AC\uD68C", science: "\uACFC\uD559", history: "\uC5ED\uC0AC", art: "\uBBF8\uC220", music: "\uC74C\uC545", pe: "\uCCB4\uC721", tech: "\uAE30\uC220\xB7\uAC00\uC815", coding: "\uC815\uBCF4(\uCF54\uB529)", language: "\uC678\uAD6D\uC5B4", general: "\uC885\uD569" };
const GROUPS = {
  study: { name: "\uACF5\uBD80\xB7\uB3C5\uC11C", categories: ["learning", "reading"] },
  exam: { name: "\uC2DC\uD5D8 \uB300\uBE44", categories: ["schoolexam", "exam"] },
  research: { name: "\uACFC\uC81C\xB7\uD0D0\uAD6C", categories: ["info", "explore"] },
  career: { name: "\uC9C4\uB85C\xB7\uC9C4\uD559", categories: ["highschool", "career"] },
  tools: { name: "AI\xB7\uB514\uC9C0\uD138 \uB3C4\uAD6C", categories: ["ai", "coding", "productivity"] },
  creative: { name: "\uBC1C\uD45C\xB7\uCC3D\uC791", categories: ["ppt", "art"] }
};
const keyOf = (site) => String(site.key || site.id || site.url || site.name || "");
function consolidateSites(rows) {
  const map = /* @__PURE__ */ new Map();
  for (const row of rows) {
    if (row.enabled === false) continue;
    const key = keyOf(row), previous = map.get(key);
    if (!key) continue;
    const site = previous || { ...row };
    site.categories = [...new Set([...previous?.categories || [], row.category, ...Array.isArray(row.categories) ? row.categories : []].filter(Boolean))];
    site.ages = [.../* @__PURE__ */ new Set([...previous?.ages || [], ...row.ages || []])];
    site.subjects = [.../* @__PURE__ */ new Set([...previous?.subjects || [], ...row.subjects || []])];
    map.set(key, site);
  }
  return [...map.values()];
}
const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
function safeUrl(value) {
  try {
    const u = new URL(value);
    return ["https:", "http:"].includes(u.protocol) ? u.href : "";
  } catch {
    return "";
  }
}
function urlFor(path, values = {}) {
  const q = new URLSearchParams(Object.entries(values).filter(([, v]) => v !== "" && v != null));
  return `#/${path}${q.size ? "?" + q : ""}`;
}
function listState(params, categories = {}) {
  const group = Object.hasOwn(GROUPS, params.get("group")) ? params.get("group") : "all";
  let category = Object.hasOwn(categories, params.get("category")) ? params.get("category") : "all";
  if (group !== "all" && !GROUPS[group].categories.includes(category)) category = "all";
  return {
    q: (params.get("q") || "").slice(0, 200),
    group,
    category,
    age: Object.hasOwn(AGES, params.get("age")) ? params.get("age") : "all",
    subject: Object.hasOwn(SUBJECTS, params.get("subject")) ? params.get("subject") : "all",
    gov: params.get("gov") === "gov" ? "gov" : "all",
    page: Math.min(1e4, Math.max(1, parseInt(params.get("page"), 10) || 1))
  };
}
function mergedDetail(local = {}, remote = {}) {
  const result = { ...local };
  if (remote.enabled === false) return result;
  for (const [key, value] of Object.entries(remote)) {
    if (value != null && value !== "" && !(typeof value === "string" && !value.trim()) && !(Array.isArray(value) && !value.length)) result[key] = value;
  }
  return result;
}
function asList(value) {
  return (Array.isArray(value) ? value : String(value || "").split("\n")).filter((x) => typeof x === "string" && x.trim());
}
function operatorLabel(detail) {
  if (!safeUrl(detail.sourceUrl) || !detail.verifiedAt) return "";
  return { government: "\uC815\uBD80 \uC6B4\uC601", public: "\uACF5\uACF5\uAE30\uAD00 \uC6B4\uC601", private: "\uBBFC\uAC04 \uC6B4\uC601" }[detail.operatorType] || "";
}
function filterSites(sites, state, search, rank = []) {
  const categories = state.group === "all" ? null : GROUPS[state.group].categories;
  const candidates = sites.filter((s) => (!categories || [s.category, ...s.categories || []].some((c) => categories.includes(c))) && (state.category === "all" || [s.category, ...s.categories || []].includes(state.category)));
  const found = search({
    sites: candidates,
    currentSearchQuery: state.q,
    currentAgeFilter: state.age,
    currentSubjectFilter: state.subject,
    currentCategoryFilter: "all",
    currentGovFilter: state.gov
  });
  const seen = /* @__PURE__ */ new Set();
  const unique = found.filter((s) => {
    const k = keyOf(s);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  const ranks = new Map(rank.map((s, i) => [keyOf(s), i]));
  return unique.sort((a, b) => (state.q ? (ranks.get(keyOf(a)) ?? 99999) - (ranks.get(keyOf(b)) ?? 99999) : 0) || Number(a.sortOrder ?? 9999) - Number(b.sortOrder ?? 9999) || a.name.localeCompare(b.name, "ko"));
}
export {
  AGES,
  GROUPS,
  SUBJECTS,
  asList,
  consolidateSites,
  esc,
  filterSites,
  keyOf,
  listState,
  mergedDetail,
  operatorLabel,
  safeUrl,
  urlFor
};
