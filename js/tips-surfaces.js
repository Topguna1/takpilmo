(function () {
  function ensureNamespace() {
    window.ddakpilmo = window.ddakpilmo || {};
    window.ddakpilmo.tips = window.ddakpilmo.tips || {};
    return window.ddakpilmo.tips;
  }

  function cleanupLegacySurfaces() {
    [
      "#guideHubSection",
      "#searchAssistBar",
      "#detailGuide",
      ".category-guide",
    ].forEach((selector) => {
      document.querySelectorAll(selector).forEach((node) => node.remove());
    });
  }

  function updateSelectedFiltersSummary() {
    window.updateSelectedFiltersSummary?.();
  }

  function syncSubject(subject) {
    if (!subject) return;

    const select = document.getElementById("subjectFilter");
    if (select) {
      select.value = subject;
      select.dispatchEvent(new Event("change", { bubbles: true }));
      return;
    }

    const setFilters = window.App?.store?.setFilters || window.setFilters;
    setFilters?.({ currentSubjectFilter: subject });
    updateSelectedFiltersSummary();
  }

  function syncGov(gov) {
    if (!gov) return;

    const button = document.querySelector(`#govFilter .filter-btn[data-gov="${gov}"]`);
    if (button) {
      button.click();
      return;
    }

    const setFilters = window.App?.store?.setFilters || window.setFilters;
    setFilters?.({ currentGovFilter: gov });
    updateSelectedFiltersSummary();
  }

  function syncCategory(category) {
    if (!category) return;

    const button = document.querySelector(`#filterTabs .tab-btn[data-cat="${category}"]`);
    if (button) {
      button.click();
      return;
    }

    const setFilters = window.App?.store?.setFilters || window.setFilters;
    setFilters?.({ currentCategoryFilter: category });
    updateSelectedFiltersSummary();
  }

  function openListView() {
    if (location.hash !== "#/") {
      location.hash = "#/";
      return;
    }

    window.App?.router?.showList?.();
    window.__route?.parseRoute?.();
  }

  function hydrateEntryPoints() {
    cleanupLegacySurfaces();

    const tipsLink = document.querySelector(".tips-section .tips-link");
    if (tipsLink && tipsLink.dataset.upgraded !== "true") {
      tipsLink.dataset.upgraded = "true";
      tipsLink.innerHTML = `
        <span class="tips-icon">🧭</span>
        <span class="tips-link-content">
          <span class="tips-link-title">자료 탐색 가이드</span>
          <span class="tips-link-desc">공식 자료 판단법, 과목별 탐색 포인트, 사이트 활용 흐름 보기</span>
        </span>
        <span class="tips-arrow">→</span>
      `;

      const sideCard = tipsLink.closest(".side-card");
      const title = sideCard?.querySelector(".side-card-title");
      if (title) title.textContent = "탐색 가이드";
    }

    const menuPanel = document.querySelector(".top-menu-panel");
    if (menuPanel && !menuPanel.querySelector('[data-menu-tips="true"]')) {
      const link = document.createElement("a");
      link.href = "#/tips";
      link.className = "top-menu-link";
      link.role = "menuitem";
      link.dataset.menuTips = "true";
      link.textContent = "자료 탐색 가이드";
      menuPanel.insertBefore(link, menuPanel.firstChild);
    }
  }

  function handleAction(target) {
    const element = target?.closest?.("[data-tip-action]");
    if (!element) return false;

    const { tipSubject, tipGov, tipCategory, tipOpen } = element.dataset;

    if (tipOpen === "tips") {
      location.hash = tipSubject
        ? `#/tips?tab=curriculum&mode=elem_middle&subject=${encodeURIComponent(tipSubject)}`
        : "#/tips";
      return true;
    }

    if (tipCategory) syncCategory(tipCategory);
    if (tipSubject) syncSubject(tipSubject);
    if (tipGov) syncGov(tipGov);

    if (
      tipOpen === "home" ||
      location.hash.startsWith("#/tips") ||
      location.hash.startsWith("#/about") ||
      location.hash.startsWith("#site=")
    ) {
      openListView();
    }

    return true;
  }

  const api = ensureNamespace();
  api.cleanupLegacySurfaces = cleanupLegacySurfaces;
  api.hydrateEntryPoints = hydrateEntryPoints;
  api.handleAction = handleAction;

  window.handleTipsAction = handleAction;
})();
