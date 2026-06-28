// Centralized app state and state actions.
(function () {
  const INITIAL_STATE = {
    sites: [],
    currentAgeFilter: "all",
    currentCategoryFilter: "all",
    currentSubjectFilter: "all",
    currentGovFilter: "all",
    currentSearchQuery: "",
    ITEMS_PER_PAGE: 5,
    currentPageByCategory: {},
    settings: {
      theme: "dark",
      font: "normal",
      anim: "on",
      radius: "round",
    },
  };

  const subscribers = new Set();
  let state = {
    ...INITIAL_STATE,
    ...(window.state || {}),
    currentPageByCategory: {
      ...INITIAL_STATE.currentPageByCategory,
      ...(window.state?.currentPageByCategory || {}),
    },
    settings: {
      ...INITIAL_STATE.settings,
      ...(window.state?.settings || {}),
    },
  };
  let renderPending = false;
  let renderFrameId = 0;

  window.App = window.App || {};

  function syncLegacyState() {
    window.state = state;
    return state;
  }

  function getState() {
    return state;
  }

  function notifySubscribers(nextState) {
    subscribers.forEach((fn) => {
      try {
        fn(nextState);
      } catch (error) {
        console.error("Store subscriber error:", error);
      }
    });
  }

  function scheduleRender() {
    if (renderPending) return;
    renderPending = true;
    if (renderFrameId) cancelAnimationFrame(renderFrameId);
    renderFrameId = requestAnimationFrame(() => {
      renderPending = false;
      renderFrameId = 0;
      notifySubscribers(state);
      const legacyRender = window.App?.render?.requestRender || window.renderSites;
      if (!subscribers.size && typeof legacyRender === "function") {
        legacyRender();
      }
    });
  }

  function setState(patch, opts = {}) {
    const nextPatch = typeof patch === "function" ? patch(state) : patch;
    if (!nextPatch || typeof nextPatch !== "object") {
      return state;
    }

    const nextState = {
      ...state,
      ...nextPatch,
      currentPageByCategory: opts.resetPages
        ? {}
        : (
          nextPatch.currentPageByCategory !== undefined
            ? { ...nextPatch.currentPageByCategory }
            : state.currentPageByCategory
        ),
      settings:
        nextPatch.settings !== undefined
          ? { ...state.settings, ...nextPatch.settings }
          : state.settings,
    };

    state = nextState;
    syncLegacyState();

    if (opts.render !== false) {
      scheduleRender();
    }

    return nextState;
  }

  function setFilters(patch) {
    return setState(patch, { resetPages: true, render: true });
  }

  function subscribe(fn) {
    if (typeof fn !== "function") {
      return function noop() {};
    }
    subscribers.add(fn);
    return () => subscribers.delete(fn);
  }

  function setPage(category, page) {
    const targetCategory = String(category || "").trim();
    if (!targetCategory) return state;

    const safePage = Math.max(1, page | 0);
    const nextPages = {
      ...state.currentPageByCategory,
      [targetCategory]: safePage,
    };

    setState(
      { currentPageByCategory: nextPages },
      { render: true }
    );

    const doScroll = () => {
      const section = document.getElementById(`${targetCategory}-section`);
      const header = section?.querySelector?.(".category-header");
      const target = header || section;
      if (!target) return;

      if (document.body.classList.contains("anim-off")) {
        target.scrollIntoView({ block: "start", behavior: "auto" });
        return;
      }

      const startY = window.scrollY || 0;
      const targetY = target.getBoundingClientRect().top + startY;
      const distance = targetY - startY;
      const duration = 700;
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

      function easeInOutCubic(time) {
        return time < 0.5 ? 4 * time * time * time : 1 - Math.pow(-2 * time + 2, 3) / 2;
      }

      addCancelListeners();

      function step() {
        if (cancelled) return;
        const now = performance.now();
        const time = Math.min(1, (now - startTime) / duration);
        window.scrollTo(0, startY + distance * easeInOutCubic(time));

        if (time < 1) {
          requestAnimationFrame(step);
        } else {
          removeCancelListeners();
        }
      }

      requestAnimationFrame(step);
    };

    const afterRender = window.App?.render?.afterNextRender || window.afterNextRender;
    if (typeof afterRender === "function") {
      Promise.resolve(afterRender()).then(doScroll);
    } else {
      doScroll();
    }

    return state;
  }

  window.App.store = {
    getState,
    setState,
    setFilters,
    setPage,
    subscribe,
    scheduleRender,
  };

  syncLegacyState();
  window.setState = setState;
  window.setFilters = setFilters;
  window.setPage = setPage;
})();
