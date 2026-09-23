function getUiState() {
  return window.App?.store?.getState?.() || window.state || {};
}

function updateSelectedFiltersSummary() {
  const host = document.getElementById("activeFilterSummary");
  if (!host) return;

  const refs = getUiState();
  const ageMap = window.ageNames || {};
  const subjectMap = window.subjectNames || {};
  const getCategoryNameSafe =
    window.getCategoryName ||
    window.ddakpilmo?.config?.getCategoryName ||
    ((key) => String(key || ""));
  const escapeHtmlSafe =
    window.ddakpilmo?.utils?.escapeHtml ||
    window.escapeHtml ||
    ((value) => String(value ?? ""));

  const chips = [
    {
      label: "연령대",
      value: refs.currentAgeFilter === "all" ? "전체" : (ageMap[refs.currentAgeFilter] || refs.currentAgeFilter || "전체"),
      isAll: refs.currentAgeFilter === "all",
    },
    {
      label: "과목",
      value: refs.currentSubjectFilter === "all" ? "전체 과목" : (subjectMap[refs.currentSubjectFilter] || refs.currentSubjectFilter || "전체 과목"),
      isAll: refs.currentSubjectFilter === "all",
    },
    {
      label: "카테고리",
      value: refs.currentCategoryFilter === "all" ? "전체" : getCategoryNameSafe(refs.currentCategoryFilter),
      isAll: refs.currentCategoryFilter === "all",
    },
    {
      label: "정부 운영",
      value: refs.currentGovFilter === "all" ? "전체" : "정부 운영",
      isAll: refs.currentGovFilter === "all",
    },
  ];

  const title = '<span class="active-filter-summary-title">선택된 필터</span>';
  const chipHtml = chips
    .map((chip) => {
      const chipClass = chip.isAll ? "active-filter-chip is-all" : "active-filter-chip is-active";
      return `<span class="${chipClass}"><span class="chip-label">${escapeHtmlSafe(chip.label)}</span><strong class="chip-value">${escapeHtmlSafe(chip.value)}</strong></span>`;
    })
    .join("");

  host.innerHTML = title + chipHtml;
}

window.updateSelectedFiltersSummary = updateSelectedFiltersSummary;

function setupEventListeners() {
  if (setupEventListeners.__initialized) {
    console.log("[init] setupEventListeners already initialized; skip");
    return;
  }

  const manager = window.memoryManager?.eventManager;
  const add = (el, evt, fn, opt) => {
    if (!el) return;
    if (manager) manager.add(el, evt, fn, opt);
    else el.addEventListener(evt, fn, opt);
  };
  const store = window.App?.store;
  const setFilters = store?.setFilters || window.setFilters;
  const setState = store?.setState || window.setState;

  const searchInput = document.getElementById("searchInput");
  const autocompleteList = document.getElementById("autocomplete-list");
  const mainPanel = document.querySelector(".main-panel");
  const highlight =
    window.ddakpilmo?.search?.highlightSearchTerms ||
    window.highlightSearchTerms ||
    null;
  const escape =
    window.ddakpilmo?.utils?.escapeHtml ||
    window.escapeHtml ||
    ((value) => String(value ?? ""));

  if (!searchInput || !autocompleteList) {
    throw new Error("Missing search input or autocomplete list");
  }

  let currentFocus = -1;
  let isComposing = false;
  let lastCommittedQuery = String(searchInput.value || "").trim();

  const debouncedSearch = (window.debounce || ((fn) => fn))((value) => {
    try {
      setFilters?.({ currentSearchQuery: value });
    } catch (error) {
      console.error("Search update failed:", error);
    }
  }, 300);

  function clearAutocomplete() {
    autocompleteList.innerHTML = "";
    currentFocus = -1;
  }

  function commitSearch(query, options = {}) {
    const normalized = String(query || "").trim();
    if (!options.force && normalized === lastCommittedQuery) {
      updateAutocomplete(normalized);
      return;
    }

    if (options.immediate) {
      debouncedSearch.cancel?.();
      setFilters?.({ currentSearchQuery: normalized });
    } else {
      debouncedSearch(normalized);
    }
    lastCommittedQuery = normalized;
    updateAutocomplete(normalized);
  }

  function getSites() {
    const state = getUiState();
    return Array.isArray(state.sites) ? state.sites : [];
  }

  function updateAutocomplete(query) {
    clearAutocomplete();
    if (!query) return;

    let matches = [];
    const activeFuse = window.fuse;
    if (activeFuse) {
      try {
        matches = activeFuse.search(query).map((result) => result.item);
      } catch (error) {
        console.warn("Fuse search failed:", error);
      }
    }

    if (/[\u3131-\u318E]/.test(query)) {
      const jamoQuery = query.toLowerCase();
      const jamoMatches = getSites().filter((site) =>
        String(site?.chosungFull || "").toLowerCase().includes(jamoQuery)
      );
      const deduped = new Map(matches.map((site) => [site?.name, site]));
      jamoMatches.forEach((site) => {
        if (site?.name) deduped.set(site.name, site);
      });
      matches = Array.from(deduped.values());
    }

    matches.slice(0, 8).forEach((site) => {
      if (!site?.name) return;
      const item = document.createElement("button");
      item.type = "button";
      item.className = "autocomplete-item";
      item.setAttribute("data-value", site.name);

      const nameHtml = typeof highlight === "function" ? highlight(site.name, query) : escape(site.name);
      const descHtml = typeof highlight === "function" ? highlight(site.desc || "", query) : escape(site.desc || "");
      item.innerHTML = `<strong>${nameHtml}</strong><br><span class="autocomplete-desc">${descHtml}</span>`;

      add(item, "click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        searchInput.value = site.name;
        clearAutocomplete();
        setFilters?.({ currentSearchQuery: site.name });
      });

      autocompleteList.appendChild(item);
    });
  }

  function getAutocompleteValue(el) {
    if (!el) return "";
    const byData = el.getAttribute("data-value");
    if (byData) return byData.trim();
    return el.textContent.trim();
  }

  function removeActive(items) {
    items.forEach((item) => item.classList.remove("active"));
  }

  if (mainPanel) {
    add(mainPanel, "click", (e) => {
      const detailBtn = e.target.closest(".detail-btn");
      if (detailBtn) {
        const card = detailBtn.closest(".link-card");
        const key = card?.dataset.key || card?.dataset.id;
        if (!key) return;
        const nextHash = `#site=${encodeURIComponent(key)}`;
        if (location.hash !== nextHash) location.hash = nextHash;
        else window.App?.router?.parseRoute?.() || window.__route?.parseRoute?.();
        return;
      }

      const shareBtn = e.target.closest(".share-btn");
      if (shareBtn) {
        e.preventDefault();
        const card = shareBtn.closest(".link-card");
        const key = card?.dataset.key || card?.dataset.id;
        if (!key) return;
        const siteIndex = window.buildSiteIndex?.();
        const site = siteIndex?.get?.(key) || siteIndex?.get?.(String(key).toLowerCase());
        if (site) shareSite(site.name || "", site.url || "");
      }
    });
  }

  add(searchInput, "compositionstart", () => {
    debouncedSearch.cancel?.();
    isComposing = true;
  });

  add(searchInput, "compositionend", function () {
    isComposing = false;
    setTimeout(() => {
      commitSearch(this.value, { immediate: true, force: true });
    }, 0);
  });

  add(searchInput, "input", function (event) {
    if (isComposing || event.isComposing) {
      commitSearch(this.value, { immediate: true });
      return;
    }
    commitSearch(this.value);
  });

  add(searchInput, "keydown", function (e) {
    const items = Array.from(autocompleteList.querySelectorAll(".autocomplete-item"));
    if (!items.length) return;

    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      currentFocus = e.key === "ArrowDown"
        ? (currentFocus + 1) % items.length
        : (currentFocus - 1 + items.length) % items.length;

      removeActive(items);
      items[currentFocus]?.classList.add("active");
      items[currentFocus]?.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
      return;
    }

    if (e.key === "Enter" && currentFocus >= 0) {
      e.preventDefault();
      const value = getAutocompleteValue(items[currentFocus]);
      this.value = value;
      clearAutocomplete();
      setFilters?.({ currentSearchQuery: value });
      return;
    }

    if (e.key === "Escape") {
      clearAutocomplete();
      this.blur();
    }
  });

  add(document, "click", (e) => {
    const tipAction = e.target.closest("[data-tip-action]");
    if (tipAction) {
      e.preventDefault();
      e.stopPropagation();
      window.ddakpilmo?.tips?.handleAction?.(tipAction);
      return;
    }

    if (e.target !== searchInput && !autocompleteList.contains(e.target)) {
      clearAutocomplete();
    }
  });

  document.querySelectorAll("#ageFilter .filter-btn").forEach((btn) => {
    add(btn, "click", (e) => {
      document.querySelectorAll("#ageFilter .filter-btn").forEach((node) => node.classList.remove("active"));
      e.currentTarget.classList.add("active");
      setFilters?.({ currentAgeFilter: e.currentTarget.dataset.age });
      updateSelectedFiltersSummary();
    });
  });

  add(document.getElementById("subjectFilter"), "change", (e) => {
    setFilters?.({ currentSubjectFilter: e.target.value });
    updateSelectedFiltersSummary();
  });

  document.querySelectorAll("#govFilter .filter-btn").forEach((btn) => {
    add(btn, "click", (e) => {
      document.querySelectorAll("#govFilter .filter-btn").forEach((node) => node.classList.remove("active"));
      e.currentTarget.classList.add("active");
      setFilters?.({ currentGovFilter: e.currentTarget.dataset.gov });
      updateSelectedFiltersSummary();
    });
  });

  add(document.getElementById("darkToggle"), "click", () => {
    const willDark = !document.body.classList.contains("dark");
    window.applyTheme?.(willDark ? "dark" : "light");
  });

  add(document.getElementById("resetBtn"), "click", resetFilters);
  add(document.getElementById("viewAllBtn"), "click", resetFilters);

  add(document.getElementById("itemsPerPage"), "change", (e) => {
    setState?.({ ITEMS_PER_PAGE: parseInt(e.target.value, 10) }, { resetPages: true, render: true });
  });

  add(document, "keydown", (e) => {
    if (e.ctrlKey && e.key.toLowerCase() === "k") {
      e.preventDefault();
      searchInput.focus();
      searchInput.select();
    }
  });

  setupEventListeners.__initialized = true;
  updateSelectedFiltersSummary();
  console.log("[init] setupEventListeners completed");
}

function resetFilters() {
  const setState = window.App?.store?.setState || window.setState;
  setState?.(
    {
      currentAgeFilter: "all",
      currentCategoryFilter: "all",
      currentSubjectFilter: "all",
      currentGovFilter: "all",
      currentSearchQuery: "",
    },
    { resetPages: true, render: true }
  );

  const searchInput = document.getElementById("searchInput");
  if (searchInput) searchInput.value = "";

  document.querySelectorAll("#ageFilter .filter-btn").forEach((btn) => btn.classList.remove("active"));
  document.querySelector("#ageFilter .filter-btn[data-age='all']")?.classList.add("active");

  const subjectFilter = document.getElementById("subjectFilter");
  if (subjectFilter) subjectFilter.value = "all";

  document.querySelectorAll("#govFilter .filter-btn").forEach((btn) => btn.classList.remove("active"));
  document.querySelector("#govFilter .filter-btn[data-gov='all']")?.classList.add("active");

  document.querySelectorAll("#filterTabs .tab-btn").forEach((btn) => btn.classList.remove("active"));
  document.querySelector("#filterTabs .tab-btn[data-cat='all']")?.classList.add("active");

  window.updateCategoryPagingMode?.();
  document.querySelectorAll(".category-section.expanded-category").forEach((sec) => sec.classList.remove("expanded-category"));
  document.querySelectorAll("[id$='-pagination']").forEach((pager) => {
    pager.removeAttribute("style");
    pager._btnCache = {};
    pager.classList.add("pagination");
  });

  updateSelectedFiltersSummary();
  window.showToast?.("모든 필터가 초기화되었습니다");
}

function shareSite(siteName, url) {
  const text = String(url || "").trim();
  if (!text) {
    window.showToast?.("공유할 주소가 없습니다", "error");
    return;
  }

  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(text).then(() => {
      window.showToast?.("링크가 복사되었습니다!");
    }).catch(() => {
      window.showToast?.("링크 복사에 실패했습니다.", "error");
    });
    return;
  }

  const ta = document.createElement("textarea");
  ta.value = text;
  document.body.appendChild(ta);
  ta.select();
  try {
    document.execCommand("copy");
    window.showToast?.("링크가 복사되었습니다!");
  } catch {
    window.showToast?.("링크 복사에 실패했습니다.", "error");
  } finally {
    document.body.removeChild(ta);
  }
}

window.setupEventListeners = setupEventListeners;
window.resetFilters = resetFilters;
window.shareSite = shareSite;
