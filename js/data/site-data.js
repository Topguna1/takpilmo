// Data loading extracted from main.js
(function () {
  const DETAILS_API_URL =
    "https://script.google.com/macros/s/AKfycbxn5IBkNF6mloJZ3WkbY4jzdggOrPnWo9RW7zVLrO6Gawasv2J77x18F-XDB5_plTbfig/exec/s/AKfycbwR4uC3aEqcznGJ7_U9KayDn6TufxJ1-3xGNp5bVYK_ts7qrNB1iy_MqZ8YIKW6HY7_gg/exec";

  async function loadDetailsFromSheet({ cacheMinutes = 60 } = {}) {
    const cacheKey = "detailsSheetCache:v1";
    const now = Date.now();

    try {
      const cached = JSON.parse(localStorage.getItem(cacheKey) || "null");
      if (cached?.ts && now - cached.ts < cacheMinutes * 60 * 1000 && cached?.data?.items) {
        window.siteDetailMap = window.siteDetailMap || {};
        Object.assign(window.siteDetailMap, cached.data.items);
        return;
      }
    } catch {}

    const res = await fetch(DETAILS_API_URL, { cache: "no-store" });
    if (!res.ok) throw new Error("details sheet load failed: " + res.status);

    const data = await res.json();
    window.siteDetailMap = window.siteDetailMap || {};
    Object.assign(window.siteDetailMap, data.items || {});

    try {
      localStorage.setItem(cacheKey, JSON.stringify({ ts: now, data }));
    } catch {}
  }

  async function loadJSONData() {
    try {
      const [categoriesRes, sitesRes] = await Promise.all([
        fetch("data/categories.json"),
        fetch("data/sites.json")
      ]);

      if (!categoriesRes.ok || !sitesRes.ok) {
        throw new Error("JSON fetch failed");
      }

      window.defaultCategories = await categoriesRes.json();
      const sitesData = await sitesRes.json();
      window.initialSites = Array.isArray(sitesData) ? sitesData : [];

      console.log("JSON data loaded", {
        categories: Object.keys(window.defaultCategories).length,
        sites: window.initialSites.length
      });
    } catch (err) {
      console.error("JSON loading error:", err);
      window.handleDataLoadFailure?.();
      throw err;
    }
  }

  window.DETAILS_API_URL = DETAILS_API_URL;
  window.loadDetailsFromSheet = loadDetailsFromSheet;
  window.loadJSONData = loadJSONData;
})();
