import { vi } from "vitest";

export function resetBrowserEnv(bodyHtml = "") {
  document.head.innerHTML = "";
  document.body.innerHTML = bodyHtml;
  window.location.hash = "";

  [
    "App",
    "state",
    "fuse",
    "__route",
    "__routeHashHandler",
    "__currentSite",
    "getFilteredSites",
    "getFilteredSitesWithCache",
    "initFuse",
    "setupHashRouting",
    "buildSiteIndex",
    "getAllSites",
    "renderSites",
    "afterNextRender",
    "setState",
    "setFilters",
    "setPage",
    "getCategoryName",
    "getRelatedSites",
    "showToast",
    "ageNames",
    "subjectNames",
    "ddakpilmo",
    "ddakpilmoContentTips",
    "GOV_ICON_DATA_URL",
  ].forEach((key) => {
    delete window[key];
  });

  let scrollY = 0;
  let rafId = 1;
  const rafQueue = new Map();

  window.requestAnimationFrame = vi.fn((callback) => {
    const id = rafId++;
    rafQueue.set(id, callback);
    return id;
  });

  window.cancelAnimationFrame = vi.fn((id) => {
    rafQueue.delete(id);
  });

  window.scrollTo = vi.fn((arg1, arg2) => {
    scrollY = typeof arg1 === "object" ? Number(arg1?.top || 0) : Number(arg2 || 0);
  });

  Object.defineProperty(window, "scrollY", {
    configurable: true,
    get() {
      return scrollY;
    },
  });

  return {
    flushRaf() {
      const callbacks = Array.from(rafQueue.values());
      rafQueue.clear();
      callbacks.forEach((callback) => callback(performance.now()));
    },
    setScroll(value) {
      scrollY = value;
    },
  };
}
