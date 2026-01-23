// js/ui-transition.js
(() => {
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
})();