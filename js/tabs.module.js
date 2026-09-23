function buildCategoryTabs() {
  const tabs = document.getElementById("filterTabs");
  if (!tabs) return;

  const allCats = window.getAllCategories?.() || {};
  const keys = Object.keys(allCats);

  const afterRender = window.App?.render?.afterNextRender || window.afterNextRender;
  const applyFilters = window.App?.store?.setFilters || window.setFilters;

  tabs.innerHTML = "";

  const allBtn = document.createElement("button");
  allBtn.className = "tab-btn active";
  allBtn.dataset.cat = "all";
  allBtn.textContent = "전체";

  allBtn.addEventListener("click", () => {
    updateActiveTab(allBtn);

    window.beginCategorySwitch?.();
    window.scrollTo({ top: 0, behavior: "auto" });

    document
      .querySelectorAll(".category-section.expanded-category")
      .forEach((sec) => sec.classList.remove("expanded-category"));

    applyFilters?.({ currentCategoryFilter: "all" });
    window.updateSelectedFiltersSummary?.();
    window.updateCategoryPagingMode?.();
    (afterRender ? afterRender(window.endCategorySwitch) : requestAnimationFrame(window.endCategorySwitch));
  });

  tabs.appendChild(allBtn);

  keys.forEach((key) => {
    const btn = document.createElement("button");
    btn.className = "tab-btn";
    btn.dataset.cat = key;
    btn.textContent = `${allCats[key].icon} ${allCats[key].name}`;

    btn.addEventListener("click", () => {
      updateActiveTab(btn);

      window.beginCategorySwitch?.();
      window.scrollTo({ top: 0, behavior: "auto" });

      document
        .querySelectorAll(".category-section")
        .forEach((sec) => sec.classList.remove("expanded-category"));

      const selected = document.querySelector(`.category-section#${key}-section`);
      if (selected) selected.classList.add("expanded-category");

      applyFilters?.({ currentCategoryFilter: key });
      window.updateSelectedFiltersSummary?.();
      window.updateCategoryPagingMode?.();
      (afterRender ? afterRender(window.endCategorySwitch) : requestAnimationFrame(window.endCategorySwitch));
    });

    tabs.appendChild(btn);
  });
}

function updateActiveTab(selectedTab) {
  document.querySelectorAll("#filterTabs .tab-btn").forEach((btn) => {
    btn.classList.remove("active");
  });
  selectedTab.classList.add("active");
  window.updateSelectedFiltersSummary?.();
}

export function installTabs() {
  if (typeof window.buildCategoryTabs === "function" && typeof window.updateActiveTab === "function") {
    return {
      buildCategoryTabs: window.buildCategoryTabs,
      updateActiveTab: window.updateActiveTab,
    };
  }

  window.buildCategoryTabs = buildCategoryTabs;
  window.updateActiveTab = updateActiveTab;
  return { buildCategoryTabs, updateActiveTab };
}
