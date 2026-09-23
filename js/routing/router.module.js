function getState() {
  return window.App?.store?.getState?.() || window.state || {};
}

function getAllSites() {
  const state = getState();
  if (Array.isArray(state.sites) && state.sites.length) return state.sites;
  if (Array.isArray(window.initialSites) && window.initialSites.length) return window.initialSites;
  return window.sitesData || window.allSites || [];
}

function buildSiteIndex() {
  const map = new Map();
  const put = (key, site) => {
    const value = String(key || "").trim();
    if (!value) return;
    map.set(value, site);
    map.set(value.toLowerCase(), site);
  };

  getAllSites().forEach((site) => {
    if (!site) return;
    put(site.key, site);
    put(site.id, site);
    put(site.slug, site);
    put(site.name, site);
  });

  return map;
}

function addEventListenerWithCleanup(element, event, handler, options) {
  if (!element) return;
  const manager = window.memoryManager?.eventManager;
  if (manager) manager.add(element, event, handler, options);
  else element.addEventListener(event, handler, options);
}

function createRouter() {
  const listView = document.querySelector(".ui-scale-wrap");
  const detailView = document.getElementById("detailView");
  const aboutView = document.getElementById("aboutView");
  const tipsView = document.getElementById("tipsView");
  const retentionView = document.getElementById("retentionView");
  const backBtn = document.getElementById("detailBackBtn");
  const copyBtn = document.getElementById("detailCopyBtn");
  const detailTitle = document.getElementById("detailTitle");
  const detailDesc = document.getElementById("detailDesc");
  const detailMeta = document.getElementById("detailMeta");
  const detailRelated = document.getElementById("detailRelated");
  const detailGoBtn = document.getElementById("detailGoBtn");
  const detailFavicon = document.getElementById("detailFavicon");

  if (!listView || !detailView) {
    throw new Error("Routing root elements are missing");
  }

  let savedScrollY = 0;
  let lastListFocus = null;
  let siteIndex = buildSiteIndex();
  let cachedSitesRef = getAllSites();
  let cachedSitesLen = Array.isArray(cachedSitesRef) ? cachedSitesRef.length : -1;

  function ensureSiteIndexUpToDate() {
    const list = getAllSites();
    const len = Array.isArray(list) ? list.length : -1;
    if (!siteIndex || cachedSitesRef !== list || cachedSitesLen !== len) {
      siteIndex = buildSiteIndex();
      cachedSitesRef = list;
      cachedSitesLen = len;
    }
  }

  function setActiveView(viewName) {
    const views = {
      list: listView,
      detail: detailView,
      about: aboutView,
      tips: tipsView,
      retention: retentionView,
    };

    Object.entries(views).forEach(([name, el]) => {
      if (!el) return;
      const active = name === viewName;
      el.style.display = active ? "" : "none";
      el.setAttribute("aria-hidden", active ? "false" : "true");
    });
  }

  function getHighlightedText(text) {
    const query = getState().currentSearchQuery || "";
    const highlight =
      window.ddakpilmo?.search?.highlightSearchTerms ||
      window.highlightSearchTerms;
    const escapeHtml =
      window.ddakpilmo?.utils?.escapeHtml ||
      window.escapeHtml ||
      ((value) => String(value ?? ""));

    if (typeof highlight === "function") {
      return highlight(text, query);
    }
    return escapeHtml(text || "");
  }

  function fillDetailMeta(site) {
    if (!detailMeta) return;
    detailMeta.replaceChildren();

    const ageMap = window.ageNames || window.ddakpilmo?.config?.ageNames || {};
    const subjectMap = window.subjectNames || window.ddakpilmo?.config?.subjectNames || {};
    const getCategoryName =
      window.getCategoryName ||
      window.ddakpilmo?.config?.getCategoryName ||
      ((key) => String(key || ""));

    const chips = [];
    if (site?.isGov === true) chips.push("정부 운영");
    if (Array.isArray(site?.subjects) && site.subjects.length) {
      chips.push(`과목: ${site.subjects.map((subject) => subjectMap[subject] || subject).join(", ")}`);
    }
    if (Array.isArray(site?.ages) && site.ages.length) {
      chips.push(`연령: ${site.ages.map((age) => ageMap[age] || age).join(", ")}`);
    }
    if (site?.category) {
      chips.push(`카테고리: ${getCategoryName(site.category)}`);
    }

    chips.forEach((text) => {
      const chip = document.createElement("span");
      chip.className = "detail-chip";
      chip.textContent = text;
      detailMeta.appendChild(chip);
    });
  }

  function fillRelatedSites(site) {
    if (!detailRelated) return;
    detailRelated.replaceChildren();

    const related = typeof window.getRelatedSites === "function"
      ? window.getRelatedSites(site, getAllSites(), { limit: 6 })
      : [];

    if (!related.length) {
      const empty = document.createElement("p");
      empty.style.color = "#999";
      empty.style.fontSize = "14px";
      empty.textContent = "관련 추천 사이트가 없습니다.";
      detailRelated.appendChild(empty);
      return;
    }

    related.forEach((relatedSite) => {
      const link = document.createElement("a");
      link.className = "detail-go";
      link.style.display = "block";
      link.style.textAlign = "center";
      link.style.marginTop = "8px";
      link.href = `#site=${encodeURIComponent(relatedSite.key || relatedSite.id)}`;
      link.textContent = relatedSite.name;
      detailRelated.appendChild(link);
    });
  }

  function fillDetailContent(site) {
    window.__currentSite = site;
    if (detailTitle) {
      detailTitle.innerHTML = `<span class="detail-title-text">${getHighlightedText(site?.name || "이름 없음")}</span>`;
      detailTitle.querySelectorAll(".gov-flag, .detail-gov-flag").forEach((el) => el.remove());

      if (site?.isGov === true && window.GOV_ICON_DATA_URL) {
        const govIcon = document.createElement("img");
        govIcon.className = "gov-flag korea-gov detail-gov-flag";
        govIcon.src = window.GOV_ICON_DATA_URL;
        govIcon.alt = "정부 운영";
        govIcon.title = "정부 운영";
        detailTitle.appendChild(govIcon);
      }
    }

    if (detailDesc) {
      const detail = window.siteDetailMap?.[site?.key] || window.siteDetailMap?.[site?.id] || null;
      const detailText = detail?.detailDesc || detail?.description || detail?.desc || site?.description || site?.desc || "";
      detailDesc.textContent = String(detailText || "").trim();
    }

    if (detailFavicon) {
      const faviconUrl = `https://www.google.com/s2/favicons?sz=128&domain_url=${encodeURIComponent(site?.url || "")}`;
      detailFavicon.src = faviconUrl;
      detailFavicon.alt = `${site?.name || ""} favicon`;
      detailFavicon.style.display = site?.url ? "" : "none";
    }

      if (detailGoBtn) {
        detailGoBtn.href = site?.url || site?.link || "#";
        detailGoBtn.dataset.retentionVisit = String(site?.key || site?.id || site?.url || site?.name || "").trim();
      }

      fillDetailMeta(site);
      fillRelatedSites(site);
      window.ddakpilmo?.retention?.renderDetailActions?.(detailGoBtn?.parentElement, site);
    }

  function showList() {
    setActiveView("list");
    const afterRender = window.App?.render?.afterNextRender || window.afterNextRender;
    Promise.resolve(typeof afterRender === "function" ? afterRender() : undefined).then(() => {
      window.scrollTo({ top: Number.isFinite(savedScrollY) ? savedScrollY : 0, behavior: "auto" });
      if (lastListFocus && typeof lastListFocus.focus === "function" && lastListFocus.isConnected) {
        lastListFocus.focus({ preventScroll: true });
        return;
      }
      document.getElementById("searchInput")?.focus?.({ preventScroll: true });
    });
  }

  function showDetail(site) {
    savedScrollY = window.scrollY || 0;
    lastListFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    fillDetailContent(site);
    window.ddakpilmo?.retention?.recent?.recordRecentSite?.(site);
    setActiveView("detail");
    window.scrollTo({ top: 0, behavior: "auto" });
    requestAnimationFrame(() => {
      backBtn?.focus?.({ preventScroll: true });
    });
  }

  function parseRoute() {
    ensureSiteIndexUpToDate();
    const hash = location.hash || "#/";

    if (hash.startsWith("#/about")) {
      setActiveView("about");
      window.renderAboutView?.();
      window.fillAboutStats?.();
      window.initScrollReveal?.(aboutView);
      window.scrollTo({ top: 0, behavior: "auto" });
      return;
    }

    if (hash.startsWith("#/tips")) {
      setActiveView("tips");
      window.renderTipsView?.();
      window.scrollTo({ top: 0, behavior: "auto" });
      return;
    }

    if (hash.startsWith("#/saved-sites")) {
      setActiveView("retention");
      window.ddakpilmo?.retention?.renderCollectionView?.("saved");
      window.scrollTo({ top: 0, behavior: "auto" });
      return;
    }

    if (hash.startsWith("#/recent-sites")) {
      setActiveView("retention");
      window.ddakpilmo?.retention?.renderCollectionView?.("recent");
      window.scrollTo({ top: 0, behavior: "auto" });
      return;
    }

    const match = hash.match(/#site=([^&]+)/);
    if (!match) {
      showList();
      return;
    }

    const requestedKey = decodeURIComponent(match[1] || "").trim();
    const site = siteIndex.get(requestedKey) || siteIndex.get(requestedKey.toLowerCase());
    if (!site) {
      console.warn("Site not found:", requestedKey);
      showList();
      return;
    }

    const canonicalKey = String(site.key || site.id || requestedKey).trim();
    const canonicalHash = `#site=${encodeURIComponent(canonicalKey)}`;
    if (location.hash !== canonicalHash) {
      history.replaceState(null, "", canonicalHash);
    }
    showDetail(site);
  }

  addEventListenerWithCleanup(backBtn, "click", (e) => {
    e.preventDefault();
    if (location.hash !== "#/") {
      location.hash = "#/";
    } else {
      showList();
    }
  });

  addEventListenerWithCleanup(copyBtn, "click", async () => {
    try {
      const url = (window.__currentSite?.url || window.__currentSite?.link || "").trim();
      await navigator.clipboard.writeText(url || location.href);
      window.showToast?.(url ? "사이트 주소가 복사되었습니다!" : "현재 주소가 복사되었습니다!");
    } catch {
      window.showToast?.("복사에 실패했습니다.", "error");
    }
  });

  if (window.__routeHashHandler) {
    window.removeEventListener("hashchange", window.__routeHashHandler);
  }
  window.addEventListener("hashchange", parseRoute);
  window.__routeHashHandler = parseRoute;

  try {
    if ("scrollRestoration" in history) {
      history.scrollRestoration = "manual";
    }
  } catch {}

  return { parseRoute, setActiveView, showList, showDetail };
}

export function installRouter() {
  window.App = window.App || {};

  function setupHashRouting() {
    if (setupHashRouting.__initialized && window.App?.router?.parseRoute) {
      return window.App.router;
    }

    const router = createRouter();
    setupHashRouting.__initialized = true;
    window.App.router = router;
    window.__route = { parseRoute: router.parseRoute };
    router.parseRoute();
    return router;
  }

  window.getAllSites = getAllSites;
  window.buildSiteIndex = buildSiteIndex;
  window.setupHashRouting = setupHashRouting;
  return { setupHashRouting, getAllSites, buildSiteIndex };
}
