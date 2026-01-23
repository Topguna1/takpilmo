// ==================== 카테고리 탭 관리 ====================
function buildCategoryTabs() {
  const tabs = document.getElementById("filterTabs");
  if (!tabs) return;

  const allCats = getAllCategories();
  const keys = Object.keys(allCats);

  tabs.innerHTML = "";

  // 전체 탭
  const allBtn = document.createElement("button");
  allBtn.className = "tab-btn active";
  allBtn.dataset.cat = "all";
  allBtn.textContent = "전체";

  allBtn.addEventListener("click", () => {
    updateActiveTab(allBtn);

    beginCategorySwitch();
    window.scrollTo({ top: 0, behavior: "auto" });

    document
    .querySelectorAll(".category-section.expanded-category")
    .forEach((sec) => sec.classList.remove("expanded-category"));

    setFilters({ currentCategoryFilter: "all" });
    updateCategoryPagingMode();
    (window.afterNextRender ? window.afterNextRender(endCategorySwitch) : requestAnimationFrame(endCategorySwitch));
  });

  tabs.appendChild(allBtn);

  // 카테고리별 탭
  keys.forEach((key) => {
    const btn = document.createElement("button");
    btn.className = "tab-btn";
    btn.dataset.cat = key;
    btn.textContent = `${allCats[key].icon} ${allCats[key].name}`;

    btn.addEventListener("click", () => {
      updateActiveTab(btn);

      // ✅ 전환 시작(전체와 동일)
      beginCategorySwitch();
      window.scrollTo({ top: 0, behavior: "auto" });

      // expanded-category는 즉시 확정
      document
        .querySelectorAll(".category-section")
        .forEach((sec) => sec.classList.remove("expanded-category"));

      const selected = document.querySelector(`.category-section#${key}-section`);
      if (selected) selected.classList.add("expanded-category");

      setFilters({ currentCategoryFilter: key });
      updateCategoryPagingMode();
      (window.afterNextRender ? window.afterNextRender(endCategorySwitch) : requestAnimationFrame(endCategorySwitch));
    });

    tabs.appendChild(btn);
  });
}

function updateActiveTab(selectedTab) {
  document.querySelectorAll("#filterTabs .tab-btn").forEach(btn => {
    btn.classList.remove("active");
  });
  selectedTab.classList.add("active");
}