// Section rendering helpers extracted from main.js
(function () {
  function createCategorySection(categoryKey) {
    const allCategories = typeof getAllCategories === "function" ? getAllCategories() : {};
    const info = allCategories[categoryKey];
    if (!info) return null;

    const section = document.createElement("div");
    section.className = "category-section";
    section.id = `${categoryKey}-section`;
    section.innerHTML = `
      <div class="category-header">
        <div class="category-info">
          <span class="category-icon">${info.icon}</span>
          <div>
            <div class="category-title">${info.name}</div>
            <div class="category-subtitle">${categoryKey}</div>
          </div>
        </div>
        <div class="category-count" id="${categoryKey}-count">0</div>
      </div>
      <div class="category-content" id="${categoryKey}-content"></div>
      <div class="pagination" id="${categoryKey}-pagination"></div>
    `;
    return section;
  }

  function renderCategorySections() {
    const container = document.getElementById("categoriesContainer");
    if (!container) return;
    if (!container.dataset.initialized) {
      container.innerHTML = "";
      const keys = Object.keys(typeof getAllCategories === "function" ? getAllCategories() : {});
      keys.forEach((key) => {
        const section = createCategorySection(key);
        if (section) container.appendChild(section);
      });
      container.dataset.initialized = "true";
    }
  }

  function renderSitesLegacy() {
    try {
      const allKeys = Object.keys(typeof getAllCategories === "function" ? getAllCategories() : {});
      const filtered = typeof getFilteredSites === "function" ? getFilteredSites() : [];
      const hasResults = filtered.length > 0;
      const state = window.state || {};

      allKeys.forEach((category) => {
        try {
          const content = document.getElementById(`${category}-content`);
          const section = document.getElementById(`${category}-section`);
          const countEl = document.getElementById(`${category}-count`);
          if (!content || !section) return;

          const sitesInCategory = filtered.filter((s) => s.category === category);
          if (countEl) countEl.textContent = sitesInCategory.length;

          if (sitesInCategory.length > 0) {
            section.style.display = "block";

            const total = sitesInCategory.length;
            const perPage = state.ITEMS_PER_PAGE || 10;
            const totalPages = Math.ceil(total / perPage);
            let currentPage = state.currentPageByCategory?.[category] || 1;

            if (currentPage > totalPages) {
              currentPage = 1;
              if (!state.currentPageByCategory) state.currentPageByCategory = {};
              state.currentPageByCategory[category] = 1;
            }

            const start = (currentPage - 1) * perPage;
            const end = start + perPage;
            const pagedSites = sitesInCategory.slice(start, end);

            const frag = typeof buildCardsFragment === "function" ? buildCardsFragment(pagedSites) : document.createDocumentFragment();
            content.replaceChildren(frag);

            if (typeof renderPagination === "function") renderPagination(category, total);
          } else {
            section.style.display = "none";
            content.replaceChildren();
          }
        } catch (categoryError) {
          console.warn(`category ${category} render error:`, categoryError);
        }
      });

      const noResultsEl = document.getElementById("noResults");
      if (noResultsEl) noResultsEl.style.display = hasResults ? "none" : "block";
      if (typeof updateStats === "function") updateStats(filtered.length);
    } catch (error) {
      console.error("renderSitesLegacy error:", error);
    }
  }

  window.createCategorySection = createCategorySection;
  window.renderCategorySections = renderCategorySections;
  window.renderSitesLegacy = renderSitesLegacy;
})();
