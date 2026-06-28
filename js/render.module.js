function getState() {
  return window.App?.store?.getState?.() || window.state || {};
}

function siteKeyOf(site) {
  return site?.key || site?.id || site?.url || site?.name || "";
}

function shallowEqualArray(a, b) {
  if (a === b) return true;
  if (!a || !b || a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

function createRenderer() {
  const RAF = window.requestAnimationFrame || function (cb) { return setTimeout(cb, 16); };
  const CAF = window.cancelAnimationFrame || clearTimeout;
  const renderState = {
    scheduled: false,
    rafId: 0,
    after: [],
    prevKeysByCategory: Object.create(null),
    prevCountByCategory: Object.create(null),
    prevStats: { total: -1, filtered: -1, perPage: -1, totalPages: -1 },
  };

  function computeFilteredData(state) {
    const getFiltered = window.App?.search?.getFilteredSites || window.getFilteredSites || window.getFilteredSitesWithCache;
    const filtered = typeof getFiltered === "function" ? getFiltered(state) : [];
    const allCats = typeof window.getAllCategories === "function" ? window.getAllCategories() : {};
    const categories = Object.keys(allCats).length
      ? Object.keys(allCats)
      : Array.from(new Set(filtered.map((site) => site?.category).filter(Boolean)));
    const categoryMap = new Map(categories.map((category) => [category, []]));

    filtered.forEach((site) => {
      const category = site?.category;
      if (!category) return;
      if (!categoryMap.has(category)) {
        categoryMap.set(category, []);
      }
      categoryMap.get(category).push(site);
    });

    return { filtered, categories, categoryMap };
  }

  function updateLayout(filtered, state) {
    const container = document.getElementById("categoriesContainer");
    if (!container) return;

    const query = String(state.currentSearchQuery || "").trim();
    const isAll = state.currentCategoryFilter === "all";
    container.classList.remove("results-cols-1", "results-cols-2");

    if (!query || !isAll) return;

    const categoryCount = new Set(filtered.map((site) => site?.category).filter(Boolean)).size;
    if (categoryCount === 1) container.classList.add("results-cols-1");
    else if (categoryCount === 2) container.classList.add("results-cols-2");
  }

  function getPageSlice(list, category, state) {
    if (state.currentCategoryFilter !== "all" && state.currentCategoryFilter === category) {
      return list;
    }

    const currentPage = state.currentPageByCategory?.[category] || 1;
    const perPage = state.ITEMS_PER_PAGE || 5;
    const start = (currentPage - 1) * perPage;
    return list.slice(start, start + perPage);
  }

  function updateSections(renderData, state) {
    const { filtered, categories, categoryMap } = renderData;

    categories.forEach((category) => {
      const section = document.getElementById(`${category}-section`);
      const content = document.getElementById(`${category}-content`);
      const countEl = document.getElementById(`${category}-count`);
      const pager = document.getElementById(`${category}-pagination`);
      if (!section || !content) return;

      const list = categoryMap.get(category) || [];
      const totalCount = list.length;

      if (countEl && renderState.prevCountByCategory[category] !== totalCount) {
        countEl.textContent = String(totalCount);
        renderState.prevCountByCategory[category] = totalCount;
      }

      if (totalCount === 0) {
        section.style.display = "none";
        renderState.prevKeysByCategory[category] = [];
        if (pager) pager.replaceChildren();
        return;
      }

      section.style.display = "block";
      const slice = getPageSlice(list, category, state);
      const visibleKeys = slice.map(siteKeyOf);
      const prevKeys = renderState.prevKeysByCategory[category] || [];
      const selectedOnly = state.currentCategoryFilter !== "all" && state.currentCategoryFilter === category;

      if (pager) {
        pager.style.display = selectedOnly ? "none" : "";
        if (selectedOnly) {
          pager.replaceChildren();
        } else if (typeof window.renderPagination === "function") {
          window.renderPagination(category, totalCount);
        }
      }

      if (!shallowEqualArray(prevKeys, visibleKeys)) {
        const fragment = typeof window.buildCardsFragment === "function"
          ? window.buildCardsFragment(slice)
          : document.createDocumentFragment();

        if (!fragment.childNodes.length && typeof window.createSiteCard === "function") {
          slice.forEach((site) => fragment.appendChild(window.createSiteCard(site)));
        }

        content.replaceChildren(fragment);
        renderState.prevKeysByCategory[category] = visibleKeys;
      }

    });

    const noResults = document.getElementById("noResults");
    if (noResults) {
      noResults.style.display = filtered.length ? "none" : "block";
    }
  }

  function updateStats(filteredLength, state) {
    const total = Array.isArray(state.sites) ? state.sites.length : 0;
    const perPage = state.ITEMS_PER_PAGE || 5;
    const totalPages = Math.max(1, Math.ceil(filteredLength / perPage) || 1);

    if (
      renderState.prevStats.total === total &&
      renderState.prevStats.filtered === filteredLength &&
      renderState.prevStats.perPage === perPage &&
      renderState.prevStats.totalPages === totalPages
    ) {
      return;
    }

    const totalCountEl = document.getElementById("totalCount");
    const filteredCountEl = document.getElementById("filteredCount");
    const paginationInfo = document.getElementById("paginationInfo");
    const footerSitesEl = document.getElementById("footerTotalSites");
    const footerCatsEl = document.getElementById("footerTotalCategories");

    if (totalCountEl) totalCountEl.textContent = String(total);
    if (filteredCountEl) filteredCountEl.textContent = String(filteredLength);
    if (paginationInfo) paginationInfo.textContent = `📄 ${perPage}개씩 보기 · 1/${totalPages} 페이지`;
    if (footerSitesEl) footerSitesEl.textContent = String(total);
    if (footerCatsEl) {
      const categories = typeof window.getAllCategories === "function" ? window.getAllCategories() : {};
      const categoryCount = Object.keys(categories).length || new Set((state.sites || []).map((site) => site?.category).filter(Boolean)).size;
      footerCatsEl.textContent = String(categoryCount);
    }

    renderState.prevStats = { total, filtered: filteredLength, perPage, totalPages };
  }

  function applyHighlights(state) {
    const query = String(state.currentSearchQuery || "").trim();
    const scope = document.getElementById("categoriesContainer");
    if (!scope || !window.ddakHighlight) return;

    if (query) window.ddakHighlight.apply(query, scope);
    else if (typeof window.ddakHighlight.clear === "function") window.ddakHighlight.clear(scope);
  }

  function flushAfterJobs() {
    const jobs = renderState.after.splice(0);
    jobs.forEach(({ callback, resolve }) => {
      try {
        if (typeof callback === "function") callback();
      } catch (error) {
        console.error("afterNextRender callback error:", error);
      } finally {
        resolve?.();
      }
    });
  }

  function renderNow() {
    const state = getState();
    try {
      const renderData = computeFilteredData(state);
      updateLayout(renderData.filtered, state);
      updateSections(renderData, state);
      updateStats(renderData.filtered.length, state);
      applyHighlights(state);
    } catch (error) {
      console.error("renderNow error:", error);
    } finally {
      renderState.scheduled = false;
      renderState.rafId = 0;
      flushAfterJobs();
    }
  }

  function requestRender() {
    if (renderState.scheduled) return;
    renderState.scheduled = true;
    if (renderState.rafId) CAF(renderState.rafId);
    renderState.rafId = RAF(renderNow);
  }

  function afterNextRender(callback) {
    return new Promise((resolve) => {
      renderState.after.push({
        callback: typeof callback === "function" ? callback : null,
        resolve,
      });
      requestRender();
    });
  }

  return {
    requestRender,
    afterNextRender,
    renderNow,
  };
}

export function installRender() {
  window.App = window.App || {};
  if (window.App.render?.requestRender && typeof window.App.render.afterNextRender === "function") {
    return window.App.render;
  }

  const render = createRenderer();
  window.App.render = render;

  if (typeof window.App?.store?.subscribe === "function") {
    window.App.store.subscribe(() => {
      render.requestRender();
    });
  }

  window.afterNextRender = render.afterNextRender;
  window.renderSites = render.requestRender;
  return render;
}
