function updateSelectedFiltersSummary() {
  const host = document.getElementById("activeFilterSummary");
  if (!host) return;

  const refs = window.state || {};
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

  const ageKey = refs.currentAgeFilter || "all";
  const subjectKey = refs.currentSubjectFilter || "all";
  const categoryKey = refs.currentCategoryFilter || "all";
  const govKey = refs.currentGovFilter || "all";

  const chips = [
    {
      label: "\uC5F0\uB839\uB300",
      value: ageKey === "all" ? "\uC804\uCCB4" : (ageMap[ageKey] || ageKey),
      isAll: ageKey === "all",
    },
    {
      label: "\uACFC\uBAA9",
      value:
        subjectKey === "all"
          ? "\uC804\uCCB4 \uACFC\uBAA9"
          : (subjectMap[subjectKey] || subjectKey),
      isAll: subjectKey === "all",
    },
    {
      label: "\uCE74\uD14C\uACE0\uB9AC",
      value:
        categoryKey === "all"
          ? "\uC804\uCCB4"
          : getCategoryNameSafe(categoryKey),
      isAll: categoryKey === "all",
    },
    {
      label: "\uC815\uBD80 \uC6B4\uC601",
      value: govKey === "all" ? "\uC804\uCCB4" : "\uC815\uBD80 \uC6B4\uC601",
      isAll: govKey === "all",
    },
  ];

  const title = '<span class="active-filter-summary-title">✅ \uC120\uD0DD\uB41C \uD544\uD130</span>';
  const chipHtml = chips
    .map((chip) => {
      const chipClass = chip.isAll ? "active-filter-chip is-all" : "active-filter-chip is-active";
      return `<span class="${chipClass}"><span class="chip-label">${escapeHtmlSafe(chip.label)}</span><strong class="chip-value">${escapeHtmlSafe(chip.value)}</strong></span>`;
    })
    .join("");

  host.innerHTML = title + chipHtml;
}

window.updateSelectedFiltersSummary = updateSelectedFiltersSummary;

// ==================== 이벤트 리스너 설정 ====================
function setupEventListeners() {
  if (setupEventListeners.__initialized) {
    console.log("[init] setupEventListeners already initialized; skip");
    return;
  }
  console.log("⚙ 메모리 안전 이벤트 리스너 설정 시작...");

  const manager = window.memoryManager?.eventManager;

  if (!manager) {
    console.warn("⚠ 메모리 관리자 없음. 기본 방식 사용");
    if (typeof setupEventListenersOriginal === "function") {
      setupEventListenersOriginal();
    } else {
      const ipt = document.getElementById("searchInput");
      if (ipt && !ipt.__bound) {
        ipt.__bound = true;
      }
    }
    setupEventListeners.__initialized = true;
    updateSelectedFiltersSummary();
    return;
  }

  try {
    const searchInput = document.getElementById("searchInput");
    const autocompleteList = document.getElementById("autocomplete-list");
    const highlight =
      window.ddakpilmo?.search?.highlightSearchTerms ||
      window.highlightSearchTerms ||
      null;
    const escape =
      window.ddakpilmo?.utils?.escapeHtml ||
      window.escapeHtml ||
      ((value) => String(value ?? ""));
    // ==================== 카드 클릭/상세 버튼 이벤트 위임 ====================
    const cardsContainer = document.getElementById("categoriesContainer");
    if (cardsContainer && !cardsContainer.__delegationBound) {
      const onContainerClick = (e) => {
        const card = e.target.closest(".link-card");
        if (!card) return;

        // 1) 링크(a) 클릭은 원래 동작 유지
        if (e.target.closest("a")) return;

        // 2) 공유 버튼은 shareBtn에서 자체 처리
        if (e.target.closest(".share-btn")) return;

        // 3) 상세 버튼(detail-btn)일 때만 상세로 이동
        const isDetailBtn = !!e.target.closest(".detail-btn");
        const shouldGoDetail = isDetailBtn;
        if (!shouldGoDetail) return;

        const key = card.dataset.key || card.dataset.id;
        if (!key) return;

        const nextHash = `#site=${encodeURIComponent(key)}`;
        if (location.hash !== nextHash) location.hash = nextHash;
        else window.__route?.parseRoute?.();
      };

      const onContainerKeydown = (e) => {
        if (e.key !== "Enter" && e.key !== " ") return;

        const card = e.target.closest(".link-card");
        if (!card) return;

        if (e.target.closest("a") || e.target.closest("button")) return;

        e.preventDefault();
        const key = card.dataset.key || card.dataset.id;
        if (!key) return;

        const nextHash = `#site=${encodeURIComponent(key)}`;
        if (location.hash !== nextHash) location.hash = nextHash;
        else window.__route?.parseRoute?.();
      };

      try {
        const safeManager = window.memoryManager?.eventManager;
        if (safeManager) {
          safeManager.add(cardsContainer, "click", onContainerClick);
          safeManager.add(cardsContainer, "keydown", onContainerKeydown);
        } else {
          cardsContainer.addEventListener("click", onContainerClick);
          cardsContainer.addEventListener("keydown", onContainerKeydown);
        }
      } catch {
        cardsContainer.addEventListener("click", onContainerClick);
        cardsContainer.addEventListener("keydown", onContainerKeydown);
      }

      cardsContainer.__delegationBound = true;
    }

    let isComposing = false;

    if (!searchInput || !autocompleteList) {
      throw new Error("필수 검색 요소를 찾을 수 없습니다");
    }

    let currentFocus = -1;

    const debouncedSearch = debounce((value) => {
      try {
        setFilters({ currentSearchQuery: value });
      } catch (error) {
        console.error("검색 처리 오류:", error);
      }
    }, 300);

    manager.add(searchInput, "input", function () {
      if (isComposing) return;
      const query = this.value.trim();
      autocompleteList.innerHTML = "";
      currentFocus = -1;

      debouncedSearch(query);

      if (!query) return;

      try {
        let matches = [];

        const activeFuse = window.fuse;
        if (activeFuse) {
          matches = activeFuse.search(query).map((r) => r.item);
        }

        const jamoRegex = /[\u3131-\u318E]/;
        if (jamoRegex.test(query)) {
          const jamoQuery = query.toLowerCase();
          const jamoMatches = state.sites.filter((s) =>
            (s.chosungFull || "").toLowerCase().includes(jamoQuery)
          );
          const map = {};
          matches.concat(jamoMatches).forEach((m) => {
            if (m && m.name) map[m.name] = m;
          });
          matches = Object.values(map);
        }

        matches.slice(0, 8).forEach((site) => {
          if (!site || !site.name) return;

          const item = document.createElement("div");
          item.className = "autocomplete-item";

          const siteName =
            typeof highlight === "function"
              ? highlight(site.name, query)
              : escape(site.name);

          const siteDesc =
            typeof highlight === "function"
              ? highlight(site.desc || "", query)
              : escape(site.desc || "");

          item.innerHTML = `
            <strong>${siteName}</strong><br>
            <span class="autocomplete-desc">${siteDesc}</span>
          `;

          manager.add(item, "click", function (e) {
            e.preventDefault();
            e.stopPropagation();

            searchInput.value = site.name;
            autocompleteList.innerHTML = "";
            currentFocus = -1;
            setFilters({ currentSearchQuery: site.name });
          });

          autocompleteList.appendChild(item);
        });
      } catch (error) {
        console.error("자동완성 처리 오류:", error);
      }
    });

    manager.add(searchInput, "keydown", function (e) {
      const items = autocompleteList.querySelectorAll(
        ".autocomplete-item, .item, .ac-item, .suggestion"
      );
      const hasItems = items && items.length > 0;

      if ((e.key === "ArrowDown" || e.key === "ArrowUp") && hasItems) {
        e.preventDefault();
        if (e.key === "ArrowDown") {
          currentFocus =
            (typeof currentFocus === "number" ? currentFocus : -1) + 1;
        } else {
          currentFocus =
            (typeof currentFocus === "number" ? currentFocus : items.length) -
            1;
        }
        currentFocus = (currentFocus + items.length) % items.length;

        removeActive(items);
        items[currentFocus].classList.add("active");
        items[currentFocus].scrollIntoView({
          block: "nearest",
          inline: "nearest",
          behavior: "smooth",
        });

        const val = getAutocompleteTitle(items[currentFocus]);
        this.value = val;
        if (typeof debouncedSearch === "function") debouncedSearch(val);
      } else if (e.key === "Enter") {
        if (hasItems && currentFocus > -1 && items[currentFocus]) {
          e.preventDefault();
          const val = getAutocompleteTitle(items[currentFocus]);
          this.value = val;
          if (typeof debouncedSearch === "function") debouncedSearch(val);
          autocompleteList.innerHTML = "";
          currentFocus = -1;
        }
      } else if (e.key === "Escape") {
        autocompleteList.innerHTML = "";
        currentFocus = -1;
        this.blur();
      }
    });

    function getAutocompleteTitle(el) {
      if (!el) return "";
      const byData = el.getAttribute("data-value") || el.getAttribute("data-title");
      if (byData) return byData.trim();

      const titleEl =
        el.querySelector('[data-role="title"]') ||
        el.querySelector(".title") ||
        el.querySelector(".item-title") ||
        el.querySelector(".name") ||
        el.firstElementChild;

      if (titleEl) return titleEl.textContent.trim();

      const clone = el.cloneNode(true);
      clone
        .querySelectorAll(".desc, .description, .meta, .subtitle, .extra, small")
        .forEach((n) => n.remove());
      return clone.textContent.trim();
    }

    function removeActive(items) {
      for (let i = 0; i < items.length; i++) {
        items[i].classList.remove("active");
      }
    }

    manager.add(document, "click", function (e) {
      if (e.target !== searchInput && !autocompleteList.contains(e.target)) {
        autocompleteList.innerHTML = "";
        currentFocus = -1;
      }
    });

    document.querySelectorAll("#ageFilter .filter-btn").forEach((btn) => {
      manager.add(btn, "click", (e) => {
        document.querySelectorAll("#ageFilter .filter-btn").forEach((b) => {
          b.classList.remove("active");
        });
        e.currentTarget.classList.add("active");
        setFilters({ currentAgeFilter: e.currentTarget.dataset.age });
        updateSelectedFiltersSummary();
      });
    });

    const subjectFilter = document.getElementById("subjectFilter");
    if (subjectFilter) {
      manager.add(subjectFilter, "change", (e) => {
        setFilters({ currentSubjectFilter: e.target.value });
        updateSelectedFiltersSummary();
      });
    }

    document.querySelectorAll("#govFilter .filter-btn").forEach((btn) => {
      manager.add(btn, "click", (e) => {
        document.querySelectorAll("#govFilter .filter-btn").forEach((b) => {
          b.classList.remove("active");
        });
        e.currentTarget.classList.add("active");
        setFilters({ currentGovFilter: e.currentTarget.dataset.gov });
        updateSelectedFiltersSummary();
      });
    });

    const darkToggle = document.getElementById("darkToggle");
    if (darkToggle) {
      manager.add(darkToggle, "click", () => {
        const willDark = !document.body.classList.contains("dark");
        window.applyTheme?.(willDark ? "dark" : "light");
      });
    }

    const resetBtn = document.getElementById("resetBtn");
    const viewAllBtn = document.getElementById("viewAllBtn");

    if (resetBtn) {
      manager.add(resetBtn, "click", resetFilters);
    }
    if (viewAllBtn) {
      manager.add(viewAllBtn, "click", resetFilters);
    }

    const itemsPerPage = document.getElementById("itemsPerPage");
    if (itemsPerPage) {
      manager.add(itemsPerPage, "change", (e) => {
        setState(
          { ITEMS_PER_PAGE: parseInt(e.target.value, 10) },
          { resetPages: true, render: true }
        );
      });
    }

    manager.add(document, "keydown", (e) => {
      if (e.ctrlKey && e.key === "k") {
        e.preventDefault();
        searchInput.focus();
        searchInput.select();
      }
    });

    setupEventListeners.__initialized = true;
    updateSelectedFiltersSummary();
    console.log("✅ 메모리 안전 이벤트 리스너 설정 완료");
  } catch (error) {
    console.error("❌ 이벤트 리스너 설정 실패:", error);
    throw error;
  }
}

function resetFilters() {
  setState(
    {
      currentAgeFilter: "all",
      currentCategoryFilter: "all",
      currentSubjectFilter: "all",
      currentGovFilter: "all",
      currentSearchQuery: "",
      expandedCategories: {},
    },
    { resetPages: true, render: true }
  );

  const searchInput = document.getElementById("searchInput");
  if (searchInput) searchInput.value = "";

  document
    .querySelectorAll("#ageFilter .filter-btn")
    .forEach((b) => b.classList.remove("active"));
  const ageAll = document.querySelector("#ageFilter .filter-btn[data-age='all']");
  if (ageAll) ageAll.classList.add("active");

  const subjectFilter = document.getElementById("subjectFilter");
  if (subjectFilter) subjectFilter.value = "all";

  document
    .querySelectorAll("#filterTabs .tab-btn")
    .forEach((b) => b.classList.remove("active"));
  const allTab = document.querySelector("#filterTabs .tab-btn[data-cat='all']");
  if (allTab) allTab.classList.add("active");

  if (typeof updateCategoryPagingMode === "function") updateCategoryPagingMode();

  document
    .querySelectorAll(".category-section.expanded-category")
    .forEach((sec) => sec.classList.remove("expanded-category"));

  document.querySelectorAll("[id$='-pagination']").forEach((pager) => {
    pager.removeAttribute("style");
    pager._btnCache = {};
    pager.classList.add("pagination");
  });
  updateSelectedFiltersSummary();
  showToast("모든 필터가 초기화되었습니다");
}

// ==================== 공유 기능 ====================
function shareSite(siteName, url) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(url).then(() => {
      showToast("링크가 복사되었습니다");
    });
  } else {
    const ta = document.createElement("textarea");
    ta.value = url;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
    showToast("링크가 복사되었습니다");
  }

  document
    .querySelectorAll(".category-section.expanded-category")
    .forEach((sec) => sec.classList.remove("expanded-category"));
  document.querySelectorAll(".pagination").forEach((p) => {
    p.style.display = "";
    p._btnCache = {};
  });
}

window.setupEventListeners = setupEventListeners;
window.resetFilters = resetFilters;
window.shareSite = shareSite;
