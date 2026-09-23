const QUICK_STARTS = [
  { id: "report", label: "보고서 자료", icon: "문서", category: "info", subject: "general" },
  { id: "ppt", label: "PPT 준비", icon: "발표", category: "ppt", subject: "all" },
  { id: "exam", label: "시험 대비", icon: "D-1", category: "exam", subject: "exam" },
  { id: "career", label: "진로 탐색", icon: "진로", category: "career", subject: "career" },
  { id: "coding", label: "코딩 학습", icon: "</>", category: "coding", subject: "coding" },
];

function setNativeControlValue(selector, value) {
  const el = document.querySelector(selector);
  if (el) el.value = value;
}

function setButtonActive(selector, attr, value) {
  document.querySelectorAll(selector).forEach((button) => {
    button.classList.toggle("active", button.getAttribute(attr) === value);
  });
}

function scrollToCategory(category) {
  const doScroll = () => {
    const target = document.getElementById(`${category}-section`);
    const header = target?.querySelector?.(".category-header");
    (header || target)?.scrollIntoView?.({ block: "start", behavior: "smooth" });
  };

  const afterRender = window.App?.render?.afterNextRender || window.afterNextRender;
  if (typeof afterRender === "function") {
    Promise.resolve(afterRender()).then(doScroll);
    return;
  }
  requestAnimationFrame(doScroll);
}

function applyQuickStart(id) {
  const item = QUICK_STARTS.find((entry) => entry.id === id);
  if (!item) return;

  if (location.hash !== "#/") {
    location.hash = "#/";
  }

  const setFilters = window.App?.store?.setFilters || window.setFilters;
  setFilters?.({
    currentAgeFilter: "all",
    currentCategoryFilter: item.category,
    currentSubjectFilter: item.subject || "all",
    currentGovFilter: "all",
    currentSearchQuery: "",
  });

  const searchInput = document.getElementById("searchInput");
  if (searchInput) searchInput.value = "";
  setButtonActive("#ageFilter .filter-btn", "data-age", "all");
  setButtonActive("#govFilter .filter-btn", "data-gov", "all");
  setButtonActive("#filterTabs .tab-btn", "data-cat", item.category);
  setNativeControlValue("#subjectFilter", item.subject || "all");
  window.updateSelectedFiltersSummary?.();
  scrollToCategory(item.category);
}

export function installQuickStart() {
  window.ddakpilmo = window.ddakpilmo || {};
  window.ddakpilmo.retention = window.ddakpilmo.retention || {};

  const api = {
    items: QUICK_STARTS,
    applyQuickStart,
  };

  window.ddakpilmo.retention.quickStart = api;
  return api;
}
