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
    if (typeof window.renderSites === "function") {
      window.renderSites();
      return;
    }
    console.warn("renderSitesLegacy fallback: window.renderSites is unavailable");
  }

  window.createCategorySection = createCategorySection;
  window.renderCategorySections = renderCategorySections;
  window.renderSitesLegacy = renderSitesLegacy;
})();
