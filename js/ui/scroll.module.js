let scrollAnimationId = null;

function mmRAF(cb) {
  const tm = window.memoryManager?.timerManager;
  return tm ? tm.requestAnimationFrame(cb) : requestAnimationFrame(cb);
}

function mmCancelRAF(id) {
  const tm = window.memoryManager?.timerManager;
  return tm ? tm.cancelAnimationFrame(id) : cancelAnimationFrame(id);
}

function smoothScrollToTop(duration = 800) {
  if (scrollAnimationId) {
    mmCancelRAF(scrollAnimationId);
    scrollAnimationId = null;
  }

  const start = window.scrollY;
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

  function scroll() {
    if (cancelled) return;

    const now = performance.now();
    const time = Math.min(1, (now - startTime) / duration);
    const ease = time < 0.5 ? 4 * time * time * time : 1 - Math.pow(-2 * time + 2, 3) / 2;

    window.scrollTo(0, start * (1 - ease));

    if (time < 1) {
      scrollAnimationId = mmRAF(scroll);
    } else {
      scrollAnimationId = null;
      removeCancelListeners();
    }
  }

  scrollAnimationId = mmRAF(scroll);
}

function smoothScrollToCategory(category, duration = 800) {
  const targetEl = document.getElementById(`${category}-section`);
  if (!targetEl) return;

  const targetY = targetEl.getBoundingClientRect().top + window.scrollY;
  const startY = window.scrollY;
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

  function scroll() {
    if (cancelled) return;

    const now = performance.now();
    const time = Math.min(1, (now - startTime) / duration);
    const ease = time < 0.5 ? 4 * time * time * time : 1 - Math.pow(-2 * time + 2, 3) / 2;

    window.scrollTo(0, startY + distance * ease);

    if (time < 1) {
      mmRAF(scroll);
    } else {
      removeCancelListeners();
    }
  }

  mmRAF(scroll);
}

function setupVisibilityHandling() {
  const manager = window.memoryManager?.eventManager;
  if (!manager) return;

  manager.add(document, "visibilitychange", () => {
    if (document.hidden) {
      window.memoryManager?.cacheManager?.cleanExpired?.();
    }
  });
}

function setupScrollFabs() {
  const manager = window.memoryManager?.eventManager;
  const wrap = document.getElementById("scrollFabs");
  const topBtn = document.getElementById("scrollTopBtn");
  const bottomBtn = document.getElementById("scrollBottomBtn");

  if (!wrap || !topBtn || !bottomBtn) return;

  function add(el, type, handler, opts) {
    if (manager) manager.add(el, type, handler, opts || false);
    else el.addEventListener(type, handler, opts || false);
  }

  function updateVisibility() {
    const panel = document.getElementById("settingsPanel");
    if (panel && panel.classList.contains("open")) return;

    const y = window.scrollY || document.documentElement.scrollTop || 0;
    if (y > 160) wrap.classList.add("show");
    else wrap.classList.remove("show");
  }

  add(window, "scroll", updateVisibility, { passive: true });

  add(topBtn, "click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  add(bottomBtn, "click", () => {
    const doc = document.documentElement;
    const maxTop = (doc.scrollHeight || document.body.scrollHeight) - doc.clientHeight;
    window.scrollTo({ top: Math.max(0, maxTop), behavior: "smooth" });
  });

  updateVisibility();
}

export function installScroll() {
  if (typeof window.setupScrollFabs === "function" && typeof window.smoothScrollToTop === "function") {
    return {
      smoothScrollToTop: window.smoothScrollToTop,
      smoothScrollToCategory: window.smoothScrollToCategory,
      setupScrollFabs: window.setupScrollFabs,
      setupVisibilityHandling: window.setupVisibilityHandling,
    };
  }

  window.smoothScrollToTop = smoothScrollToTop;
  window.smoothScrollToCategory = smoothScrollToCategory;
  window.setupScrollFabs = setupScrollFabs;
  window.setupVisibilityHandling = setupVisibilityHandling;
  return { smoothScrollToTop, smoothScrollToCategory, setupScrollFabs, setupVisibilityHandling };
}

