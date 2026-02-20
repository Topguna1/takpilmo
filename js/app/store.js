// Centralized app state and state actions.
let state = window.state || {
  sites: [],
  currentAgeFilter: "all",
  currentCategoryFilter: "all",
  currentSubjectFilter: "all",
  currentGovFilter: "all",
  currentSearchQuery: "",
  ITEMS_PER_PAGE: 5,
  currentPageByCategory: {}
};

window.state = state;
let __renderRAF = 0;

function setState(patch, opts = {}) {
  Object.assign(state, patch);

  if (opts.resetPages) {
    state.currentPageByCategory = {};
  }

  window.state = state;

  if (opts.render !== false) {
    if (__renderRAF) cancelAnimationFrame(__renderRAF);
    __renderRAF = requestAnimationFrame(() => {
      __renderRAF = 0;
      window.renderSites?.();
    });
  }
}

function setFilters(patch) {
  setState(patch, { resetPages: true, render: true });
}

function setPage(category, page, scrollY = 800) {
  const p = Math.max(1, page | 0);
  const next = { ...state.currentPageByCategory, [category]: p };

  setState({ currentPageByCategory: next }, { resetPages: false, render: true });

  function smoothScrollToElement(target, duration = 900) {
    if (!target) return;
    if (document.body.classList.contains("anim-off")) {
      target.scrollIntoView({ block: "start", behavior: "auto" });
      return;
    }

    const startY = window.scrollY || 0;
    const targetY = target.getBoundingClientRect().top + startY;
    const distance = targetY - startY;
    const startTime = performance.now();
    let cancelled = false;

    function cancelOnUserScroll() {
      cancelled = true;
      removeCancelListeners();
    }

    function addCancelListeners() {
      const manager = window.memoryManager?.eventManager;
      if (manager) {
        manager.add(window, "wheel", cancelOnUserScroll, { passive: true });
        manager.add(window, "touchstart", cancelOnUserScroll, { passive: true });
        manager.add(window, "keydown", cancelOnUserScroll, { passive: true });
      } else {
        window.addEventListener("wheel", cancelOnUserScroll, { passive: true });
        window.addEventListener("touchstart", cancelOnUserScroll, { passive: true });
        window.addEventListener("keydown", cancelOnUserScroll, { passive: true });
      }
    }

    function removeCancelListeners() {
      const manager = window.memoryManager?.eventManager;
      if (manager?.remove) {
        manager.remove(window, "wheel", cancelOnUserScroll);
        manager.remove(window, "touchstart", cancelOnUserScroll);
        manager.remove(window, "keydown", cancelOnUserScroll);
      } else {
        window.removeEventListener("wheel", cancelOnUserScroll);
        window.removeEventListener("touchstart", cancelOnUserScroll);
        window.removeEventListener("keydown", cancelOnUserScroll);
      }
    }

    addCancelListeners();

    function easeInOutCubic(t) {
      return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    function step() {
      if (cancelled) return;
      const now = performance.now();
      const time = Math.min(1, (now - startTime) / duration);
      const eased = easeInOutCubic(time);
      window.scrollTo(0, startY + distance * eased);
      if (time < 1) {
        requestAnimationFrame(step);
      } else {
        removeCancelListeners();
      }
    }

    requestAnimationFrame(step);
  }

  const doScroll = () => {
    const section = document.getElementById(`${category}-section`);
    const header = section?.querySelector?.(".category-header");
    const target = header || section;
    smoothScrollToElement(target, 1100);
  };

  if (typeof window.afterNextRender === "function") {
    window.afterNextRender(() => {
      doScroll();
      setTimeout(doScroll, 0);
    });
  } else {
    doScroll();
    setTimeout(doScroll, 0);
  }
}

window.setState = setState;
window.setFilters = setFilters;
window.setPage = setPage;
