// Search/filter engine extracted from main.js
(function () {
  const CHO = [
    "\u3131", "\u3132", "\u3134", "\u3137", "\u3138", "\u3139", "\u3141",
    "\u3142", "\u3143", "\u3145", "\u3146", "\u3147", "\u3148", "\u3149",
    "\u314a", "\u314b", "\u314c", "\u314d", "\u314e"
  ];
  const JUNG = [
    "\u314f", "\u3150", "\u3151", "\u3152", "\u3153", "\u3154", "\u3155",
    "\u3156", "\u3157", "\u3158", "\u3159", "\u315a", "\u315b", "\u315c",
    "\u315d", "\u315e", "\u315f", "\u3160", "\u3161", "\u3162", "\u3163"
  ];
  const JONG = [
    "", "\u3131", "\u3132", "\u3133", "\u3134", "\u3135", "\u3136", "\u3137",
    "\u3139", "\u313a", "\u313b", "\u313c", "\u313d", "\u313e", "\u313f",
    "\u3140", "\u3141", "\u3142", "\u3144", "\u3145", "\u3146", "\u3147",
    "\u3148", "\u314a", "\u314b", "\u314c", "\u314d", "\u314e"
  ];

  function normalizeTextForSearch(str) {
    return String(str ?? "")
      .normalize("NFKC")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();
  }

  function toJamoString(str) {
    const s = String(str ?? "");
    let out = "";

    for (let i = 0; i < s.length; i++) {
      const ch = s.charCodeAt(i);
      if (ch >= 0xac00 && ch <= 0xd7a3) {
        const code = ch - 0xac00;
        const cho = Math.floor(code / 588);
        const jung = Math.floor((code % 588) / 28);
        const jong = code % 28;
        out += CHO[cho] + JUNG[jung] + (JONG[jong] || "");
      } else {
        out += s[i];
      }
    }

    return out.toLowerCase();
  }

  function isChosungOnly(q) {
    return /^[\u3131-\u314e]+$/.test(String(q || ""));
  }

  function safeGetChosung(str) {
    const fn = window.ddakpilmo?.utils?.getChosung || window.getChosung;
    try {
      if (typeof fn === "function") return fn(str);
    } catch {}

    const s = String(str ?? "");
    let out = "";
    for (let i = 0; i < s.length; i++) {
      const ch = s.charCodeAt(i);
      if (ch >= 0xac00 && ch <= 0xd7a3) {
        const code = ch - 0xac00;
        out += CHO[Math.floor(code / 588)] || "";
      } else {
        out += s[i];
      }
    }
    return out;
  }

  function getCategoryNameSafe(key) {
    if (typeof getCategoryName === "function") return getCategoryName(key);
    const cats = (typeof defaultCategories !== "undefined" ? defaultCategories : window.defaultCategories) || {};
    return cats?.[key]?.name || key;
  }

  function getAgeNamesMap() {
    if (typeof ageNames !== "undefined") return ageNames;
    return window.ageNames || {};
  }

  function getSubjectNamesMap() {
    if (typeof subjectNames !== "undefined") return subjectNames;
    return window.subjectNames || {};
  }

  function getFilteredSites() {
    const state = window.state || {};
    const sites = Array.isArray(state.sites) ? state.sites : [];
    const rawQ = state.currentSearchQuery || "";
    const q = rawQ.trim().toLowerCase();
    const tokens = q ? q.split(/\s+/).filter(Boolean) : [];
    const ageMap = getAgeNamesMap();
    const subjectMap = getSubjectNamesMap();

    return sites.filter((site) => {
      const ages = Array.isArray(site?.ages) ? site.ages : [];
      const subjects = Array.isArray(site?.subjects) ? site.subjects : [];

      if (state.currentAgeFilter !== "all" && !ages.includes(state.currentAgeFilter)) return false;
      if (state.currentCategoryFilter !== "all" && site?.category !== state.currentCategoryFilter) return false;
      if (state.currentSubjectFilter !== "all" && !subjects.includes(state.currentSubjectFilter)) return false;
      if (state.currentGovFilter === "gov" && site?.isGov !== true) return false;
      if (!tokens.length) return true;

      const searchTarget = (
        site?.__searchText
          ? site.__searchText
          : (
            (site?.name || "") + " " +
            (site?.desc || "") + " " +
            getCategoryNameSafe(site?.category) + " " +
            ages.map((a) => ageMap[a]).join(" ") + " " +
            subjects.map((sub) => subjectMap[sub]).join(" ")
          )
      ).toLowerCase();

      const siteChosung = (
        site?.chosungFull || (safeGetChosung(site?.name) + " " + safeGetChosung(site?.desc))
      ).toLowerCase();

      const siteJamo = (
        site?.__jamoText ? site.__jamoText : (toJamoString(searchTarget) + " " + siteChosung)
      ).toLowerCase();

      return tokens.every((token) => {
        if (searchTarget.includes(token)) return true;

        if (isChosungOnly(token)) {
          return siteChosung.includes(token);
        }

        const tokenJamo = toJamoString(token);
        if (tokenJamo && siteJamo.includes(tokenJamo)) return true;

        const tokenCh = safeGetChosung(token).toLowerCase();
        if (tokenCh) {
          if (siteChosung.includes(tokenCh)) return true;
          if (safeGetChosung(site?.name).toLowerCase().includes(tokenCh)) return true;
        }

        return false;
      });
    });
  }

  function getFilteredSitesWithCache() {
    const state = window.state || {};
    const cacheManager = window.memoryManager?.cacheManager;
    const cacheKey = `filtered_${state.currentSearchQuery}_${state.currentAgeFilter}_${state.currentCategoryFilter}_${state.currentSubjectFilter}_${state.currentGovFilter}`;

    if (cacheManager) {
      const cached = cacheManager.get(cacheKey);
      if (cached) return cached;
    }

    const filtered = getFilteredSites();
    if (cacheManager) cacheManager.set(cacheKey, filtered);
    return filtered;
  }

  function initFuse() {
    if (typeof window.Fuse !== "function") {
      window.fuse = null;
      return null;
    }
    const sites = Array.isArray(window.state?.sites) ? window.state.sites : [];
    window.fuse = new window.Fuse(sites, {
      keys: ["name", "desc", "subjects", "category"],
      threshold: 0.4,
      minMatchCharLength: 1,
      ignoreLocation: true,
      findAllMatches: true
    });
    return window.fuse;
  }

  window.normalizeTextForSearch = normalizeTextForSearch;
  window.toJamoString = toJamoString;
  window.isChosungOnly = isChosungOnly;
  window.safeGetChosung = safeGetChosung;
  window.getFilteredSites = getFilteredSites;
  window.getFilteredSitesWithCache = getFilteredSitesWithCache;
  window.initFuse = initFuse;
})();
