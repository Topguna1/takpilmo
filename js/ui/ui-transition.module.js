export function installUiTransition() {
  if (typeof window.beginCategorySwitch === "function" && typeof window.endCategorySwitch === "function") {
    return {
      beginCategorySwitch: window.beginCategorySwitch,
      endCategorySwitch: window.endCategorySwitch,
    };
  }

  const root = document.documentElement;

  function beginCategorySwitch() {
    root.classList.add("switching-cate");
  }

  function endCategorySwitch() {
    root.classList.remove("switching-cate");
    root.classList.add("switching-cate-done");
    setTimeout(() => root.classList.remove("switching-cate-done"), 160);
  }

  window.beginCategorySwitch = beginCategorySwitch;
  window.endCategorySwitch = endCategorySwitch;
  return { beginCategorySwitch, endCategorySwitch };
}

