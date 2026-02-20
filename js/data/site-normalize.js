// Site normalization and ID helpers extracted from main.js
(function () {
  function makeSiteId(site, index) {
    if (site?.id) return site.id;
    const base = String(site?.name || "")
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");
    return base ? `${base}-${index}` : `site-${index}`;
  }

  function ensureSiteIds() {
    const list = Array.isArray(window.state?.sites)
      ? window.state.sites
      : Array.isArray(window.initialSites)
        ? window.initialSites
        : [];

    if (!Array.isArray(list) || list.length === 0) return [];

    const used = new Set();
    for (let i = 0; i < list.length; i++) {
      const s = list[i];
      if (!s || typeof s !== "object") continue;

      if (s.id) {
        used.add(s.id);
        continue;
      }

      const baseId = makeSiteId(s, i);
      if (!baseId) continue;

      let finalId = baseId;
      let n = 1;
      while (used.has(finalId)) finalId = `${baseId}-${n++}`;

      s.id = finalId;
      used.add(finalId);
    }
    return list;
  }

  function normalizeText(str, normalizeTextForSearch) {
    if (typeof normalizeTextForSearch === "function") {
      return normalizeTextForSearch(str);
    }
    return String(str || "")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();
  }

  function normalizeSitesForState(initialSites, deps = {}) {
    const ageNames = deps.ageNames || {};
    const subjectNames = deps.subjectNames || {};
    const getCategoryName = deps.getCategoryName || ((k) => String(k || ""));
    const normalizeTextForSearch = deps.normalizeTextForSearch;
    const toJamoString = deps.toJamoString || ((s) => String(s || ""));
    const safeGetChosung = deps.safeGetChosung || ((s) => String(s || ""));

    if (!Array.isArray(initialSites)) return [];

    return initialSites.map((site) => {
      const nameCh = safeGetChosung(site?.name || "");
      const descCh = safeGetChosung(site?.desc || "");

      try {
        const url = site?.url || "";
        let isGovAuto = false;
        try {
          const host = new URL(url).hostname || "";
          isGovAuto = /(^|\.)gov\.kr$/i.test(host) || /(^|\.)[a-z0-9-]+\.go\.kr$/i.test(host);
        } catch (_e) {
          isGovAuto = /(\.go\.kr|gov\.kr)(\/|$)/i.test(url);
        }

        const searchText = normalizeText(
          (site?.name || "") + " " +
            (site?.desc || "") + " " +
            getCategoryName(site?.category) + " " +
            (Array.isArray(site?.ages) ? site.ages : []).map((a) => ageNames[a] || a).join(" ") + " " +
            (Array.isArray(site?.subjects) ? site.subjects : []).map((sub) => subjectNames[sub] || sub).join(" "),
          normalizeTextForSearch
        );

        return {
          ...site,
          isGov: typeof site?.isGov === "boolean" ? site.isGov : isGovAuto,
          chosungName: nameCh,
          chosungDesc: descCh,
          chosungFull: `${nameCh} ${descCh}`,
          __searchText: searchText,
          __jamoText: `${toJamoString(searchText)} ${(nameCh + " " + descCh).toLowerCase()}`
        };
      } catch (error) {
        console.warn("site normalize error:", site, error);
        return {
          name: site?.name || "Unnamed Site",
          url: site?.url || "#",
          desc: site?.desc || "No description",
          category: site?.category || "general",
          ages: Array.isArray(site?.ages) ? site.ages : ["adult"],
          subjects: Array.isArray(site?.subjects) ? site.subjects : ["general"],
          isGov: false,
          chosungName: nameCh,
          chosungDesc: descCh,
          chosungFull: `${nameCh} ${descCh}`
        };
      }
    });
  }

  window.makeSiteId = makeSiteId;
  window.ensureSiteIds = ensureSiteIds;
  window.normalizeSitesForState = normalizeSitesForState;
})();
