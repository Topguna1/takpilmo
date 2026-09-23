(function () {
  "use strict";

  const DETAILS_API_URL =
    "https://script.google.com/macros/s/AKfycbxu0QNxzD11mmExZ89ItV9TIvKz9Dd1EYxAiQbL56SyGQU2yzZNyT0qzB6dpwwbslzJeA/exec";

  const CONTENT_CACHE_KEY = "contentSheetCache:v4";
  const LEGACY_CONTENT_CACHE_KEYS = ["contentSheetCache:v3"];
  const GUIDE_SECTION_TYPES = new Set(["overview", "steps", "free_access", "recommended_sites", "notes"]);
  const GUIDE_LINK_TYPES = new Set(["external", "site", "route"]);
  const GUIDE_TARGET_TYPES = new Set(["all", "elementary_middle", "high"]);
  const GUIDE_TABS = new Set(["utility"]);
  const GUIDE_CTA_TYPES = new Set(["detail", "site", "route", "external", "link"]);
  const CURRICULUM_MODES = new Set(["elem_middle", "high"]);
  const EMPTY_TIPS = Object.freeze({
    subjects: [],
    sections: [],
    items: [],
    curriculumGroups: [],
    curriculumTopics: [],
    curriculumSections: [],
    curriculumItems: [],
    guides: [],
    guideSections: [],
    guideLinks: [],
  });

  function getContentApiUrl() {
    return (
      window.ddakpilmo?.config?.contentApiUrl ||
      window.DDAKPILMO_CONTENT_API_URL ||
      window.CONTENT_API_URL ||
      DETAILS_API_URL
    );
  }

  function trimText(value) {
    return String(value == null ? "" : value).trim();
  }

  function toNumber(value, fallback) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  function toList(value) {
    if (Array.isArray(value)) {
      return value.map((item) => trimText(item)).filter(Boolean);
    }

    return String(value == null ? "" : value)
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  function toBool(value) {
    if (value === true) return true;
    const normalized = trimText(value).toLowerCase();
    return normalized === "true" || normalized === "1" || normalized === "y" || normalized === "yes";
  }

  function sortByOrder(list) {
    return list.sort((a, b) => toNumber(a?.sortOrder, 9999) - toNumber(b?.sortOrder, 9999));
  }

  function normalizeCategories(categories) {
    if (!Array.isArray(categories)) return null;

    return categories
      .filter((item) => item && trimText(item.key))
      .sort((a, b) => toNumber(a?.sortOrder, 9999) - toNumber(b?.sortOrder, 9999))
      .reduce((acc, item) => {
        const key = trimText(item.key);
        acc[key] = {
          name: trimText(item.name),
          icon: trimText(item.icon),
          description: trimText(item.description),
          sortOrder: toNumber(item.sortOrder, 9999),
          enabled: item.enabled !== false,
        };
        return acc;
      }, {});
  }

  function normalizeSites(sites) {
    if (!Array.isArray(sites)) return null;

    return sites
      .filter((site) => site && trimText(site.key) && trimText(site.name) && trimText(site.url))
      .sort((a, b) => toNumber(a?.sortOrder, 9999) - toNumber(b?.sortOrder, 9999))
      .map((site) => ({
        ...site,
        key: trimText(site.key),
        name: trimText(site.name),
        url: trimText(site.url),
        desc: trimText(site.desc),
        category: trimText(site.category),
        ages: toList(site.ages),
        subjects: toList(site.subjects),
        isGov: site.isGov === true || trimText(site.isGov).toLowerCase() === "true",
      }));
  }

  function normalizeDetailsMap(payload) {
    const rawMap =
      (payload?.details && payload.details.bySiteKey && typeof payload.details.bySiteKey === "object"
        ? payload.details.bySiteKey
        : null) ||
      (payload?.items && typeof payload.items === "object" ? payload.items : null) ||
      (payload?.details && !Array.isArray(payload.details) && typeof payload.details === "object"
        ? payload.details
        : null) ||
      {};

    return Object.entries(rawMap).reduce((acc, entry) => {
      const rawKey = entry[0];
      const rawValue = entry[1];
      const key = trimText(rawKey);
      if (!key || !rawValue || typeof rawValue !== "object") return acc;
      acc[key] = {
        ...rawValue,
        title: trimText(rawValue.title),
        detailDesc: String(rawValue.detailDesc == null ? "" : rawValue.detailDesc),
        notes: String(rawValue.notes == null ? "" : rawValue.notes),
        updatedAt: trimText(rawValue.updatedAt),
      };
      return acc;
    }, {});
  }

  function normalizeTipSubjects(rawSubjects) {
    if (!Array.isArray(rawSubjects)) return [];

    return sortByOrder(
      rawSubjects
        .filter((subject) => subject && trimText(subject.id) && trimText(subject.name))
        .filter((subject) => subject.enabled !== false)
        .map((subject) => ({
          id: trimText(subject.id),
          name: trimText(subject.name),
          emoji: trimText(subject.emoji) || "📘",
          title: trimText(subject.title) || trimText(subject.name),
          subtitle: trimText(subject.subtitle),
          sortOrder: toNumber(subject.sortOrder, 9999),
        }))
    );
  }

  function normalizeTipSections(rawSections, subjectIds) {
    if (!Array.isArray(rawSections)) return [];

    return sortByOrder(
      rawSections
        .filter((section) => section && trimText(section.id) && trimText(section.subjectId) && trimText(section.title))
        .filter((section) => section.enabled !== false)
        .map((section) => ({
          id: trimText(section.id),
          subjectId: trimText(section.subjectId),
          title: trimText(section.title),
          sortOrder: toNumber(section.sortOrder, 9999),
        }))
        .filter((section) => subjectIds.has(section.subjectId))
    );
  }

  function normalizeTipItems(rawItems, sectionIds) {
    if (!Array.isArray(rawItems)) return [];

    return sortByOrder(
      rawItems
        .filter((item) => item && trimText(item.id) && trimText(item.sectionId) && trimText(item.content))
        .filter((item) => item.enabled !== false)
        .map((item) => ({
          id: trimText(item.id),
          sectionId: trimText(item.sectionId),
          content: String(item.content == null ? "" : item.content).trim(),
          sortOrder: toNumber(item.sortOrder, 9999),
        }))
        .filter((item) => sectionIds.has(item.sectionId))
    );
  }

  function normalizeCurriculumGroups(rawGroups) {
    if (!Array.isArray(rawGroups)) return [];

    return sortByOrder(
      rawGroups
        .filter(
          (group) =>
            group &&
            trimText(group.id) &&
            trimText(group.mode) &&
            trimText(group.subjectKey) &&
            trimText(group.subjectLabel)
        )
        .filter((group) => group.enabled !== false)
        .map((group) => ({
          id: trimText(group.id),
          mode: trimText(group.mode).toLowerCase(),
          subjectKey: trimText(group.subjectKey),
          subjectLabel: trimText(group.subjectLabel),
          title: trimText(group.title) || trimText(group.subjectLabel),
          subtitle: trimText(group.subtitle),
          sortOrder: toNumber(group.sortOrder, 9999),
        }))
        .filter((group) => CURRICULUM_MODES.has(group.mode))
    );
  }

  function normalizeCurriculumTopics(rawTopics, subjectPairs) {
    if (!Array.isArray(rawTopics)) return [];

    return sortByOrder(
      rawTopics
        .filter(
          (topic) =>
            topic &&
            trimText(topic.id) &&
            trimText(topic.mode) &&
            trimText(topic.subjectKey) &&
            trimText(topic.topicKey) &&
            trimText(topic.topicLabel)
        )
        .filter((topic) => topic.enabled !== false)
        .map((topic) => ({
          id: trimText(topic.id),
          mode: trimText(topic.mode).toLowerCase(),
          subjectKey: trimText(topic.subjectKey),
          topicKey: trimText(topic.topicKey),
          topicLabel: trimText(topic.topicLabel),
          title: trimText(topic.title) || trimText(topic.topicLabel),
          subtitle: trimText(topic.subtitle),
          parentKey: trimText(topic.parentKey),
          sortOrder: toNumber(topic.sortOrder, 9999),
        }))
        .filter((topic) => CURRICULUM_MODES.has(topic.mode))
        .filter((topic) => subjectPairs.has(`${topic.mode}:${topic.subjectKey}`))
    );
  }

  function normalizeCurriculumSections(rawSections, subjectPairs, topicPairs) {
    if (!Array.isArray(rawSections)) return [];

    return sortByOrder(
      rawSections
        .filter(
          (section) =>
            section &&
            trimText(section.id) &&
            trimText(section.mode) &&
            trimText(section.subjectKey) &&
            trimText(section.title)
        )
        .filter((section) => section.enabled !== false)
        .map((section) => ({
          id: trimText(section.id),
          mode: trimText(section.mode).toLowerCase(),
          subjectKey: trimText(section.subjectKey),
          topicKey: trimText(section.topicKey),
          title: trimText(section.title),
          sortOrder: toNumber(section.sortOrder, 9999),
        }))
        .filter((section) => CURRICULUM_MODES.has(section.mode))
        .filter((section) => {
          const subjectKey = `${section.mode}:${section.subjectKey}`;
          if (!subjectPairs.has(subjectKey)) return false;
          if (!section.topicKey) return true;
          return topicPairs.has(`${section.mode}:${section.subjectKey}:${section.topicKey}`);
        })
    );
  }

  function normalizeCurriculumItems(rawItems, sectionIds) {
    if (!Array.isArray(rawItems)) return [];

    return sortByOrder(
      rawItems
        .filter((item) => item && trimText(item.id) && trimText(item.sectionId) && trimText(item.content))
        .filter((item) => item.enabled !== false)
        .map((item) => ({
          id: trimText(item.id),
          sectionId: trimText(item.sectionId),
          content: String(item.content == null ? "" : item.content).trim(),
          sortOrder: toNumber(item.sortOrder, 9999),
        }))
        .filter((item) => sectionIds.has(item.sectionId))
    );
  }

  function normalizeGuideList(rawGuides) {
    if (!Array.isArray(rawGuides)) return [];

    return sortByOrder(
      rawGuides
        .filter((guide) => guide && trimText(guide.id) && trimText(guide.title) && trimText(guide.summary))
        .filter((guide) => guide.enabled !== false)
        .map((guide) => {
          const rawTab = trimText(guide.tab).toLowerCase();
          const rawTarget = trimText(guide.target).toLowerCase();
          const rawPrimaryType = trimText(guide.primaryCtaType).toLowerCase();
          const rawSecondaryType = trimText(guide.secondaryCtaType).toLowerCase();

          return {
            id: trimText(guide.id),
            slug: trimText(guide.slug) || trimText(guide.id),
            tab: GUIDE_TABS.has(rawTab) ? rawTab : "utility",
            categoryKey: trimText(guide.categoryKey) || "general",
            categoryLabel: trimText(guide.categoryLabel) || "전체",
            title: trimText(guide.title),
            subtitle: trimText(guide.subtitle),
            summary: trimText(guide.summary),
            badgeText: trimText(guide.badgeText || guide.badge),
            icon: trimText(guide.icon) || "🧭",
            target: GUIDE_TARGET_TYPES.has(rawTarget) ? rawTarget : "all",
            audienceLabel: trimText(guide.audienceLabel),
            featured: toBool(guide.featured),
            featuredOrder: toNumber(guide.featuredOrder, toNumber(guide.sortOrder, 9999)),
            primaryCtaText: trimText(guide.primaryCtaText),
            primaryCtaType: GUIDE_CTA_TYPES.has(rawPrimaryType) ? rawPrimaryType : "",
            primaryCtaValue: trimText(guide.primaryCtaValue),
            secondaryCtaText: trimText(guide.secondaryCtaText),
            secondaryCtaType: GUIDE_CTA_TYPES.has(rawSecondaryType) ? rawSecondaryType : "",
            secondaryCtaValue: trimText(guide.secondaryCtaValue),
            updatedAt: trimText(guide.updatedAt),
            sortOrder: toNumber(guide.sortOrder, 9999),
          };
        })
    );
  }

  function normalizeGuideSections(rawSections, guideIds) {
    if (!Array.isArray(rawSections)) return [];

    return sortByOrder(
      rawSections
        .filter(
          (section) =>
            section &&
            trimText(section.id) &&
            trimText(section.guideId) &&
            trimText(section.sectionType) &&
            trimText(section.content)
        )
        .filter((section) => section.enabled !== false)
        .map((section) => ({
          id: trimText(section.id),
          guideId: trimText(section.guideId),
          sectionType: trimText(section.sectionType).toLowerCase(),
          title: trimText(section.title),
          content: String(section.content == null ? "" : section.content).trim(),
          sortOrder: toNumber(section.sortOrder, 9999),
        }))
        .filter((section) => guideIds.has(section.guideId) && GUIDE_SECTION_TYPES.has(section.sectionType))
    );
  }

  function normalizeGuideLinks(rawLinks, guideIds, siteKeys) {
    if (!Array.isArray(rawLinks)) return [];

    return sortByOrder(
      rawLinks
        .filter(
          (link) =>
            link &&
            trimText(link.id) &&
            trimText(link.guideId) &&
            trimText(link.label) &&
            trimText(link.linkType) &&
            trimText(link.hrefOrSiteKey)
        )
        .filter((link) => link.enabled !== false)
        .map((link) => ({
          id: trimText(link.id),
          guideId: trimText(link.guideId),
          label: trimText(link.label),
          linkType: trimText(link.linkType).toLowerCase(),
          hrefOrSiteKey: trimText(link.hrefOrSiteKey),
          sortOrder: toNumber(link.sortOrder, 9999),
        }))
        .filter((link) => {
          if (!guideIds.has(link.guideId) || !GUIDE_LINK_TYPES.has(link.linkType)) return false;
          if (link.linkType === "site") return siteKeys.has(link.hrefOrSiteKey);
          return true;
        })
    );
  }

  function normalizeTipsPayload(rawTips, sites) {
    const subjects = normalizeTipSubjects(rawTips?.subjects);
    const subjectIds = new Set(subjects.map((subject) => subject.id));
    const sections = normalizeTipSections(rawTips?.sections, subjectIds);
    const sectionIds = new Set(sections.map((section) => section.id));
    const items = normalizeTipItems(rawTips?.items, sectionIds);

    const curriculumGroups = normalizeCurriculumGroups(rawTips?.curriculumGroups);
    const subjectPairs = new Set(curriculumGroups.map((group) => `${group.mode}:${group.subjectKey}`));
    const curriculumTopics = normalizeCurriculumTopics(rawTips?.curriculumTopics, subjectPairs);
    const topicPairs = new Set(
      curriculumTopics.map((topic) => `${topic.mode}:${topic.subjectKey}:${topic.topicKey}`)
    );
    const curriculumSections = normalizeCurriculumSections(rawTips?.curriculumSections, subjectPairs, topicPairs);
    const curriculumSectionIds = new Set(curriculumSections.map((section) => section.id));
    const curriculumItems = normalizeCurriculumItems(rawTips?.curriculumItems, curriculumSectionIds);

    const guides = normalizeGuideList(rawTips?.guides);
    const guideIds = new Set(guides.map((guide) => guide.id));
    const siteKeys = new Set(
      (Array.isArray(sites) ? sites : [])
        .map((site) => trimText(site?.key || site?.id))
        .filter(Boolean)
    );
    const guideSections = normalizeGuideSections(rawTips?.guideSections, guideIds);
    const guideLinks = normalizeGuideLinks(rawTips?.guideLinks, guideIds, siteKeys);

    return {
      subjects: subjects,
      sections: sections,
      items: items,
      curriculumGroups: curriculumGroups,
      curriculumTopics: curriculumTopics,
      curriculumSections: curriculumSections,
      curriculumItems: curriculumItems,
      guides: guides,
      guideSections: guideSections,
      guideLinks: guideLinks,
    };
  }

  function hasTipsContent(tips) {
    return Boolean(
      tips &&
        (tips.subjects?.length ||
          tips.sections?.length ||
          tips.items?.length ||
          tips.curriculumGroups?.length ||
          tips.curriculumTopics?.length ||
          tips.curriculumSections?.length ||
          tips.curriculumItems?.length ||
          tips.guides?.length ||
          tips.guideSections?.length ||
          tips.guideLinks?.length)
    );
  }

  function normalizeRemoteContentPayload(payload) {
    return {
      hasContentShape: Array.isArray(payload?.categories) && Array.isArray(payload?.sites),
      categories: normalizeCategories(payload?.categories),
      sites: normalizeSites(payload?.sites),
      detailsBySiteKey: normalizeDetailsMap(payload),
      rawTips: payload?.tips || null,
      version: trimText(payload?.version),
      generatedAt: trimText(payload?.generatedAt),
    };
  }

  function applyContentToWindow(data) {
    if (data.categories && typeof data.categories === "object") {
      window.defaultCategories = data.categories;
    }

    if (Array.isArray(data.sites)) {
      window.initialSites = data.sites;
    }

    if (data.detailsBySiteKey && typeof data.detailsBySiteKey === "object") {
      window.siteDetailMap = { ...data.detailsBySiteKey };
    } else {
      window.siteDetailMap = {};
    }

    window.ddakpilmoContentTips = data.tips && typeof data.tips === "object"
      ? {
          subjects: Array.isArray(data.tips.subjects) ? data.tips.subjects : [],
          sections: Array.isArray(data.tips.sections) ? data.tips.sections : [],
          items: Array.isArray(data.tips.items) ? data.tips.items : [],
          curriculumGroups: Array.isArray(data.tips.curriculumGroups) ? data.tips.curriculumGroups : [],
          curriculumTopics: Array.isArray(data.tips.curriculumTopics) ? data.tips.curriculumTopics : [],
          curriculumSections: Array.isArray(data.tips.curriculumSections) ? data.tips.curriculumSections : [],
          curriculumItems: Array.isArray(data.tips.curriculumItems) ? data.tips.curriculumItems : [],
          guides: Array.isArray(data.tips.guides) ? data.tips.guides : [],
          guideSections: Array.isArray(data.tips.guideSections) ? data.tips.guideSections : [],
          guideLinks: Array.isArray(data.tips.guideLinks) ? data.tips.guideLinks : [],
        }
      : { ...EMPTY_TIPS };
  }

  async function loadContentFromRemote(options) {
    const cacheMinutes = options && options.cacheMinutes != null ? options.cacheMinutes : 0;
    const preferCache = Boolean(options && options.preferCache);
    const now = Date.now();
    let cached = null;

    try {
      cached = JSON.parse(localStorage.getItem(CONTENT_CACHE_KEY) || "null");
      if (
        preferCache &&
        cacheMinutes > 0 &&
        cached?.ts &&
        now - cached.ts < cacheMinutes * 60 * 1000 &&
        cached?.data
      ) {
        return normalizeRemoteContentPayload(cached.data);
      }
    } catch {}

    let res;
    try {
      res = await fetch(getContentApiUrl(), { cache: "no-store" });
    } catch (error) {
      if (cached?.data) {
        console.warn("[data] remote content fetch failed; using stale cached sheet payload", error);
        return normalizeRemoteContentPayload(cached.data);
      }
      throw error;
    }

    if (!res.ok) {
      const error = new Error(`content load failed: ${res.status}`);
      if (cached?.data) {
        console.warn("[data] remote content returned an error; using stale cached sheet payload", error);
        return normalizeRemoteContentPayload(cached.data);
      }
      throw error;
    }

    const payload = await res.json();

    try {
      localStorage.setItem(CONTENT_CACHE_KEY, JSON.stringify({ ts: now, data: payload }));
      LEGACY_CONTENT_CACHE_KEYS.forEach(function (key) {
        localStorage.removeItem(key);
      });
    } catch {}

    return normalizeRemoteContentPayload(payload);
  }

  function clearContentCache() {
    try {
      localStorage.removeItem(CONTENT_CACHE_KEY);
      LEGACY_CONTENT_CACHE_KEYS.forEach(function (key) {
        localStorage.removeItem(key);
      });
    } catch {}
  }

  async function loadLocalSnapshot() {
    const results = await Promise.all([
      fetch("data/categories.json"),
      fetch("data/sites.json"),
      fetch("data/content.example.json").catch(() => null),
    ]);
    const categoriesRes = results[0];
    const sitesRes = results[1];
    const contentRes = results[2];

    if (!categoriesRes.ok || !sitesRes.ok) {
      throw new Error("JSON fetch failed");
    }

    const categories = await categoriesRes.json();
    const sites = await sitesRes.json();
    const contentExample = contentRes?.ok ? await contentRes.json() : {};

    return {
      categories: categories && typeof categories === "object" ? categories : {},
      sites: Array.isArray(sites) ? sites : [],
      rawTips: contentExample?.tips || null,
    };
  }

  async function loadJSONData(options) {
    const cacheMinutes = options && options.cacheMinutes != null ? options.cacheMinutes : 0;
    let remotePayload = null;

    try {
      remotePayload = await loadContentFromRemote({ cacheMinutes: cacheMinutes });
    } catch (error) {
      console.warn("[data] remote content load failed; falling back to local snapshot", error);
    }

    try {
      if (remotePayload?.hasContentShape && remotePayload.categories && remotePayload.sites) {
        const remoteTips = normalizeTipsPayload(remotePayload.rawTips, remotePayload.sites);
        const fallbackSnapshot = !hasTipsContent(remoteTips) ? await loadLocalSnapshot() : null;
        const fallbackTips = fallbackSnapshot?.rawTips
          ? normalizeTipsPayload(fallbackSnapshot.rawTips, remotePayload.sites)
          : EMPTY_TIPS;

        applyContentToWindow({
          categories: remotePayload.categories,
          sites: remotePayload.sites,
          detailsBySiteKey: remotePayload.detailsBySiteKey,
          tips: hasTipsContent(remoteTips) ? remoteTips : fallbackTips,
        });
        window.__siteDataContentLoaded = true;
        return;
      }

      const localSnapshot = await loadLocalSnapshot();
      const remoteTips = normalizeTipsPayload(remotePayload?.rawTips, localSnapshot.sites);
      const localTips = normalizeTipsPayload(localSnapshot.rawTips, localSnapshot.sites);

      applyContentToWindow({
        categories: localSnapshot.categories,
        sites: localSnapshot.sites,
        detailsBySiteKey: remotePayload?.detailsBySiteKey || {},
        tips: hasTipsContent(remoteTips) ? remoteTips : localTips,
      });
      window.__siteDataContentLoaded = false;
    } catch (err) {
      console.error("JSON loading error:", err);
      window.handleDataLoadFailure?.();
      throw err;
    }
  }

  async function refreshContentFromSheet() {
    clearContentCache();
    return loadJSONData({ cacheMinutes: 0 });
  }

  async function loadDetailsFromSheet(options) {
    const cacheMinutes = options && options.cacheMinutes != null ? options.cacheMinutes : 0;

    if (window.__siteDataContentLoaded && Object.keys(window.siteDetailMap || {}).length > 0) {
      return window.siteDetailMap;
    }

    const remotePayload = await loadContentFromRemote({ cacheMinutes: cacheMinutes });
    const detailsBySiteKey = remotePayload?.detailsBySiteKey || {};

    if (Object.keys(detailsBySiteKey).length > 0) {
      window.siteDetailMap = {
        ...(window.siteDetailMap || {}),
        ...detailsBySiteKey,
      };
    }

    return window.siteDetailMap || {};
  }

  window.CONTENT_API_URL = getContentApiUrl();
  window.DETAILS_API_URL = DETAILS_API_URL;
  window.loadContentFromRemote = loadContentFromRemote;
  window.clearContentCache = clearContentCache;
  window.refreshContentFromSheet = refreshContentFromSheet;
  window.loadLocalSnapshot = loadLocalSnapshot;
  window.loadDetailsFromSheet = loadDetailsFromSheet;
  window.loadJSONData = loadJSONData;
})();
