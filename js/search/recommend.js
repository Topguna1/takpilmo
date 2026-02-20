// Related site recommendation helpers
(function () {
  function isSameSite(a, b) {
    if (!a || !b) return false;
    const aKey = String(a.key || a.id || a.name || "").trim().toLowerCase();
    const bKey = String(b.key || b.id || b.name || "").trim().toLowerCase();
    return aKey && bKey && aKey === bKey;
  }

  function scoreRelatedSite(currentSite, candidate) {
    if (!currentSite || !candidate) return 0;
    let score = 0;

    if (currentSite.category && candidate.category === currentSite.category) {
      score += 1;
    }

    const currentSubjects = Array.isArray(currentSite.subjects) ? currentSite.subjects : [];
    const candidateSubjects = Array.isArray(candidate.subjects) ? candidate.subjects : [];
    if (currentSubjects.some((subject) => candidateSubjects.includes(subject))) {
      score += 2;
    }

    return score;
  }

  function getRelatedSites(currentSite, allSites, options = {}) {
    const limit = Number.isFinite(options.limit) ? options.limit : 6;
    const list = Array.isArray(allSites) ? allSites : [];

    return list
      .filter((candidate) => candidate && (candidate.id || candidate.name))
      .filter((candidate) => !isSameSite(currentSite, candidate))
      .map((candidate) => ({ item: candidate, score: scoreRelatedSite(currentSite, candidate) }))
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, Math.max(0, limit))
      .map((entry) => entry.item);
  }

  window.getRelatedSites = getRelatedSites;
})();
