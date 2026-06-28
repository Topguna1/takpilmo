(function () {
  "use strict";

  const DEFAULT_TIPS = {
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
  };

  const GUIDE_SECTION_ORDER = ["overview", "steps", "free_access", "recommended_sites", "notes"];
  const GUIDE_SECTION_LABELS = {
    overview: "이 팁이 필요한 상황",
    steps: "바로 따라하는 순서",
    free_access: "학생 기준 무료로 보기",
    recommended_sites: "추천 사이트/링크",
    notes: "주의할 점",
  };
  const MODE_LABELS = {
    elem_middle: "초·중",
    high: "고등",
  };
  const TARGET_LABELS = {
    all: "공통",
    elementary_middle: "초·중",
    high: "고등",
  };
  let utilityListReturnState = null;

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  function escapeAttr(value) {
    return escapeHtml(value).replaceAll("'", "&#39;");
  }

  function sanitizeAllowedHtml(rawHtml) {
    const template = document.createElement("template");
    template.innerHTML = String(rawHtml == null ? "" : rawHtml);
    const allowed = new Set(["STRONG", "EM", "CODE", "BR"]);

    function sanitizeNode(node) {
      if (node.nodeType === Node.TEXT_NODE) {
        return document.createTextNode(node.textContent || "");
      }

      if (node.nodeType !== Node.ELEMENT_NODE) {
        return document.createDocumentFragment();
      }

      const tagName = node.tagName.toUpperCase();
      if (!allowed.has(tagName)) {
        const fragment = document.createDocumentFragment();
        Array.from(node.childNodes).forEach((child) => {
          fragment.appendChild(sanitizeNode(child));
        });
        return fragment;
      }

      const safeElement = document.createElement(tagName.toLowerCase());
      Array.from(node.childNodes).forEach((child) => {
        safeElement.appendChild(sanitizeNode(child));
      });
      return safeElement;
    }

    const wrapper = document.createElement("div");
    Array.from(template.content.childNodes).forEach((child) => {
      wrapper.appendChild(sanitizeNode(child));
    });
    return wrapper.innerHTML;
  }

  function getTipsData() {
    const raw = window.ddakpilmoContentTips || DEFAULT_TIPS;
    return {
      subjects: Array.isArray(raw.subjects) ? raw.subjects : [],
      sections: Array.isArray(raw.sections) ? raw.sections : [],
      items: Array.isArray(raw.items) ? raw.items : [],
      curriculumGroups: Array.isArray(raw.curriculumGroups) ? raw.curriculumGroups : [],
      curriculumTopics: Array.isArray(raw.curriculumTopics) ? raw.curriculumTopics : [],
      curriculumSections: Array.isArray(raw.curriculumSections) ? raw.curriculumSections : [],
      curriculumItems: Array.isArray(raw.curriculumItems) ? raw.curriculumItems : [],
      guides: Array.isArray(raw.guides) ? raw.guides : [],
      guideSections: Array.isArray(raw.guideSections) ? raw.guideSections : [],
      guideLinks: Array.isArray(raw.guideLinks) ? raw.guideLinks : [],
    };
  }

  function parseHashParams() {
    const hash = String(window.location.hash || "");
    const queryIndex = hash.indexOf("?");
    if (queryIndex < 0) return new URLSearchParams();
    return new URLSearchParams(hash.slice(queryIndex + 1));
  }

  function buildTipsHash(state) {
    const params = new URLSearchParams();
    const tab = state.tab === "utility" ? "utility" : "curriculum";
    params.set("tab", tab);

    if (tab === "curriculum") {
      params.set("mode", state.mode === "high" ? "high" : "elem_middle");
      if (state.subject) params.set("subject", state.subject);
      if (state.topic) params.set("topic", state.topic);
    }

    if (tab === "utility" && state.category && state.category !== "all") {
      params.set("category", state.category);
    }

    return `#/tips?${params.toString()}`;
  }

  function buildGuideDetailHash(guide, category = "all") {
    const slug = String(guide?.slug || guide?.id || "").trim();
    const params = new URLSearchParams();
    if (category && category !== "all") params.set("category", category);
    return `#/tips/guide/${encodeURIComponent(slug)}${params.size ? `?${params.toString()}` : ""}`;
  }

  function getGuideDetailSlug() {
    const match = String(window.location.hash || "").match(/^#\/tips\/guide\/([^?]+)/);
    return match ? decodeURIComponent(match[1] || "").trim() : "";
  }

  function getUtilityCategory(guides, requestedCategory) {
    const category = String(requestedCategory || "").trim();
    if (category && category !== "all" && guides.some((guide) => guide.categoryKey === category)) {
      return category;
    }
    return "all";
  }

  function getLegacySubjects(data) {
    return (data.subjects || []).map((subject) => ({
      mode: "elem_middle",
      subjectKey: subject.id,
      subjectLabel: subject.name,
      title: subject.title || subject.name,
      subtitle: subject.subtitle || "",
      sortOrder: subject.sortOrder || 9999,
    }));
  }

  function getCurriculumSubjects(data, mode) {
    const nextMode = mode === "high" ? "high" : "elem_middle";
    const groups = (data.curriculumGroups || []).filter((group) => group.mode === nextMode);
    if (groups.length) return groups;
    if (nextMode === "elem_middle") return getLegacySubjects(data);
    return [];
  }

  function getCurriculumTopics(data, mode, subjectKey) {
    if (mode !== "high") return [];
    return (data.curriculumTopics || []).filter((topic) => topic.mode === "high" && topic.subjectKey === subjectKey);
  }

  function getUtilityGuides(data) {
    return (data.guides || []).filter((guide) => !guide.tab || guide.tab === "utility");
  }

  function getUtilityCategories(guides) {
    const seen = new Set();
    const categories = [];
    guides.forEach((guide) => {
      const key = String(guide.categoryKey || "general").trim();
      if (!key || seen.has(key)) return;
      seen.add(key);
      categories.push({
        key,
        label: guide.categoryLabel || "전체",
      });
    });
    return categories;
  }

  function getCurrentState(data) {
    const params = parseHashParams();
    const requestedTab = String(params.get("tab") || "").trim().toLowerCase();
    const tab = requestedTab === "utility" ? "utility" : "curriculum";

    if (tab === "utility") {
      const guides = getUtilityGuides(data);
      const requestedGuide = String(params.get("guide") || "").trim();
      const matchedGuide = guides.find((guide) => guide.id === requestedGuide || guide.slug === requestedGuide);
      const requestedCategory = params.get("category") || matchedGuide?.categoryKey || "";

      return {
        tab,
        mode: "elem_middle",
        subject: "",
        topic: "",
        category: getUtilityCategory(guides, requestedCategory),
      };
    }

    const requestedMode = String(params.get("mode") || "").trim().toLowerCase();
    const mode = requestedMode === "high" ? "high" : "elem_middle";
    const subjects = getCurriculumSubjects(data, mode);
    const requestedSubject = String(params.get("subject") || "").trim();
    const matchedSubject = subjects.find((subject) => subject.subjectKey === requestedSubject);
    const activeSubject = matchedSubject?.subjectKey || subjects[0]?.subjectKey || "";
    const topics = getCurriculumTopics(data, mode, activeSubject);
    const requestedTopic = String(params.get("topic") || "").trim();
    const matchedTopic = topics.find((topic) => topic.topicKey === requestedTopic);
    const activeTopic = mode === "high" ? (matchedTopic?.topicKey || topics[0]?.topicKey || "") : "";

    return {
      tab,
      mode,
      subject: activeSubject,
      topic: activeTopic,
      category: "",
    };
  }

  function getCurriculumMeta(data, state) {
    const subjectMeta = getCurriculumSubjects(data, state.mode).find((subject) => subject.subjectKey === state.subject);
    const topicMeta = getCurriculumTopics(data, state.mode, state.subject).find((topic) => topic.topicKey === state.topic);
    return { subjectMeta, topicMeta };
  }

  function getCurriculumSections(data, state) {
    if ((data.curriculumSections || []).length) {
      const exactSections = data.curriculumSections.filter((section) => {
        if (section.mode !== state.mode || section.subjectKey !== state.subject) return false;
        if (state.mode === "high" && state.topic) return section.topicKey === state.topic;
        return !section.topicKey;
      });

      if (exactSections.length) return exactSections;

      return data.curriculumSections.filter((section) => (
        section.mode === state.mode &&
        section.subjectKey === state.subject &&
        !section.topicKey
      ));
    }

    if (state.mode !== "elem_middle") return [];
    return data.sections.filter((section) => section.subjectId === state.subject);
  }

  function getCurriculumItems(data, sectionId) {
    if ((data.curriculumItems || []).length) {
      return data.curriculumItems.filter((item) => item.sectionId === sectionId);
    }
    return data.items.filter((item) => item.sectionId === sectionId);
  }

  function groupGuideSections(data) {
    return data.guideSections.reduce((acc, section) => {
      if (!acc[section.guideId]) acc[section.guideId] = [];
      acc[section.guideId].push(section);
      return acc;
    }, {});
  }

  function getGuideActionLabel(guide) {
    if (guide.primaryCtaText) return guide.primaryCtaText;
    if (guide.primaryCtaType === "site") return "사이트부터 보기";
    return "바로 따라하기";
  }

  function getGuidePointChips(sections) {
    return sections
      .map((section) => GUIDE_SECTION_LABELS[section.sectionType] || section.title || "")
      .filter(Boolean)
      .slice(0, 3);
  }

  function renderGuideLink(link) {
    const label = escapeHtml(link.label);

    if (link.linkType === "external") {
      return `
        <a class="tips-guide-link-chip" href="${escapeAttr(link.hrefOrSiteKey)}" target="_blank" rel="noopener noreferrer">
          ${label}
        </a>
      `;
    }

    if (link.linkType === "site") {
      return `
        <a class="tips-guide-link-chip" href="#site=${encodeURIComponent(link.hrefOrSiteKey)}">
          ${label}
        </a>
      `;
    }

    return `
      <a class="tips-guide-link-chip" href="${escapeAttr(link.hrefOrSiteKey)}">
        ${label}
      </a>
    `;
  }

  function resolveGuideCtaLink(type, value) {
    const ctaType = String(type || "").trim().toLowerCase();
    const ctaValue = String(value || "").trim();
    if (!ctaType || !ctaValue) return null;

    if (ctaType === "site") {
      return { href: `#site=${encodeURIComponent(ctaValue)}`, target: "", rel: "" };
    }

    if (ctaType === "route") {
      return { href: ctaValue, target: "", rel: "" };
    }

    if (ctaType === "external" || ctaType === "link") {
      return { href: ctaValue, target: "_blank", rel: "noopener noreferrer" };
    }

    return null;
  }

  function renderGuideActionLinks(guide, guideLinks) {
    const actions = [];
    if (guide.primaryCtaType !== "detail" && (guide.primaryCtaType || guide.primaryCtaValue)) {
      const primary = resolveGuideCtaLink(guide.primaryCtaType, guide.primaryCtaValue);
      if (primary) {
        actions.push(`
          <a
            class="tips-guide-link-chip is-primary"
            href="${escapeAttr(primary.href)}"
            ${primary.target ? `target="${primary.target}"` : ""}
            ${primary.rel ? `rel="${primary.rel}"` : ""}
          >
            ${escapeHtml(guide.primaryCtaText || "바로 따라하기")}
          </a>
        `);
      }
    }

    const secondary = resolveGuideCtaLink(guide.secondaryCtaType, guide.secondaryCtaValue);
    if (secondary) {
      actions.push(`
        <a
          class="tips-guide-link-chip"
          href="${escapeAttr(secondary.href)}"
          ${secondary.target ? `target="${secondary.target}"` : ""}
          ${secondary.rel ? `rel="${secondary.rel}"` : ""}
        >
          ${escapeHtml(guide.secondaryCtaText || "연결 보기")}
        </a>
      `);
    }

    if (!actions.length && guideLinks.length) {
      actions.push(renderGuideLink(guideLinks[0]));
    }

    if (!actions.length) {
      actions.push(`<a class="tips-guide-link-chip" href="#/">메인 목록으로 이동</a>`);
    }

    return actions.join("");
  }

  function renderTopTabs(state) {
    return `
      <nav class="tips-primary-tabs" aria-label="자료 탐색 가이드 상위 탭">
        <a href="${buildTipsHash({ tab: "curriculum", mode: state.mode || "elem_middle", subject: state.subject, topic: state.topic })}" class="tips-primary-tab ${state.tab === "curriculum" ? "is-active" : ""}">
          교과 가이드
        </a>
        <a href="${buildTipsHash({ tab: "utility", category: state.category })}" class="tips-primary-tab ${state.tab === "utility" ? "is-active" : ""}">
          실용 팁
        </a>
      </nav>
    `;
  }

  function renderHero(state) {
    return `
      <section class="tips-hero" aria-labelledby="tipsHeroTitle">
        <div class="tips-hero-copy">
          <span class="tips-kicker">정식 안내 기능</span>
          <h1 class="tips-hero-title" id="tipsHeroTitle">자료 탐색 가이드</h1>
          <p class="tips-hero-desc">
            ${state.tab === "curriculum"
              ? "학년대와 교과를 먼저 고르면, 지금 필요한 단원과 자료 흐름을 바로 따라갈 수 있습니다."
              : "논문 무료 열람, PPT 자료 수집, 보고서 근거자료처럼 교과 밖에서 자주 막히는 주제를 따로 모아두었습니다."}
          </p>
          <div class="tips-summary-chips">
            <span class="tips-summary-chip">초·중 / 고등</span>
            <span class="tips-summary-chip">교과별 탐색</span>
            <span class="tips-summary-chip">실용 팁 분리</span>
          </div>
          <div class="tips-hero-actions">
            <a class="tips-hero-action primary" href="${buildTipsHash({ tab: "curriculum", mode: "elem_middle" })}">교과 가이드 보기</a>
            <a class="tips-hero-action" href="${buildTipsHash({ tab: "utility" })}">실용 팁 보기</a>
            <a class="tips-hero-action" href="#/">메인 목록으로 가기</a>
          </div>
        </div>
        <div class="tips-hero-visual" aria-hidden="true">
          <div class="tips-visual-card tips-visual-card-large">
            <span class="tips-visual-card-kicker">바로 고르는 기준</span>
            <strong>${state.tab === "curriculum" ? "연령대 → 교과 → 세부 분야" : "주제 → 방법 → 바로가기"}</strong>
            <p>${state.tab === "curriculum"
              ? "초·중은 과목 중심으로, 고등은 세부 단원까지 나눠서 필요한 자료 흐름을 안내합니다."
              : "교과와 무관한 자료 활용 팁은 별도 탭으로 분리해 바로 따라하기 쉽게 정리합니다."}
            </p>
          </div>
          <div class="tips-visual-grid">
            <div class="tips-visual-card">
              <span class="tips-visual-card-kicker">1차 분기</span>
              <strong>교과 가이드 / 실용 팁</strong>
            </div>
            <div class="tips-visual-card">
              <span class="tips-visual-card-kicker">2차 분기</span>
              <strong>초·중 / 고등</strong>
            </div>
            <div class="tips-visual-card">
              <span class="tips-visual-card-kicker">활용</span>
              <strong>추천 사이트로 바로 이동</strong>
            </div>
          </div>
        </div>
      </section>
    `;
  }

  function renderCurriculumSidebar(data, state) {
    const subjects = getCurriculumSubjects(data, state.mode);
    const topics = getCurriculumTopics(data, state.mode, state.subject);

    return `
      <aside class="tips-sidebar">
        <div class="tips-sidebar-mobile-header">
          <span class="tips-sidebar-mobile-title">교과 탐색 메뉴</span>
          <button type="button" id="tipsMobileNavClose" class="tips-sidebar-mobile-close">닫기</button>
        </div>
        <div class="tips-sidebar-card">
          <div class="tips-sidebar-header">
            <span class="tips-sidebar-title">연령대</span>
          </div>
          <div class="tips-mode-tabs">
            <a href="${buildTipsHash({ tab: "curriculum", mode: "elem_middle" })}" class="tips-mode-tab ${state.mode === "elem_middle" ? "is-active" : ""}">초·중</a>
            <a href="${buildTipsHash({ tab: "curriculum", mode: "high" })}" class="tips-mode-tab ${state.mode === "high" ? "is-active" : ""}">고등</a>
          </div>
        </div>

        <div class="tips-sidebar-card">
          <div class="tips-sidebar-header">
            <span class="tips-sidebar-title">교과</span>
          </div>
          <nav class="tips-side-list" aria-label="교과 목록">
            ${subjects.map((subject) => `
              <a
                href="${buildTipsHash({ tab: "curriculum", mode: state.mode, subject: subject.subjectKey })}"
                class="tips-side-link ${subject.subjectKey === state.subject ? "is-active" : ""}"
                data-subject-nav="${escapeAttr(subject.subjectKey)}"
              >
                ${escapeHtml(subject.subjectLabel)}
              </a>
            `).join("")}
          </nav>
        </div>

        ${state.mode === "high" && topics.length
          ? `
            <div class="tips-sidebar-card">
              <div class="tips-sidebar-header">
                <span class="tips-sidebar-title">세부 분야</span>
              </div>
              <nav class="tips-side-list tips-side-sublist" aria-label="세부 분야 목록">
                ${topics.map((topic) => `
                  <a
                    href="${buildTipsHash({ tab: "curriculum", mode: "high", subject: state.subject, topic: topic.topicKey })}"
                    class="tips-side-link ${topic.topicKey === state.topic ? "is-active" : ""}"
                    data-topic-nav="${escapeAttr(topic.topicKey)}"
                  >
                    ${escapeHtml(topic.topicLabel)}
                  </a>
                `).join("")}
              </nav>
            </div>
          `
          : ""}
      </aside>
    `;
  }

  function renderCurriculumContent(data, state) {
    const { subjectMeta, topicMeta } = getCurriculumMeta(data, state);
    const sections = getCurriculumSections(data, state);
    const panelTitle = topicMeta?.title || subjectMeta?.title || "교과 가이드";
    const panelDesc =
      topicMeta?.subtitle ||
      subjectMeta?.subtitle ||
      "선택한 교과와 분야에서 먼저 볼 것과 추천 사이트 흐름을 정리했습니다.";

    return `
      <main class="tips-main-content">
        <section class="tips-work-panel">
          <div class="tips-panel-header">
            <span class="tips-section-kicker">교과 가이드</span>
            <h2 class="tips-panel-title">${escapeHtml(panelTitle)}</h2>
            <p class="tips-panel-desc">${escapeHtml(panelDesc)}</p>
            <div class="tips-summary-chips">
              <span class="tips-summary-chip is-compact">${escapeHtml(MODE_LABELS[state.mode])}</span>
              ${subjectMeta ? `<span class="tips-summary-chip is-compact">${escapeHtml(subjectMeta.subjectLabel)}</span>` : ""}
              ${topicMeta ? `<span class="tips-summary-chip is-compact">${escapeHtml(topicMeta.topicLabel)}</span>` : ""}
            </div>
          </div>

          ${sections.length
            ? `
              <div class="tips-grid tips-grid-2">
                ${sections.map((section) => `
                  <article class="tips-info-card">
                    <h3 class="tips-card-title">${escapeHtml(section.title)}</h3>
                    <ul class="tips-bullet-list">
                      ${getCurriculumItems(data, section.id).map((item) => `
                        <li><span class="tips-rich-list-item">${sanitizeAllowedHtml(item.content)}</span></li>
                      `).join("")}
                    </ul>
                  </article>
                `).join("")}
              </div>
            `
            : `
              <section class="tips-empty-state">
                <span class="tips-section-kicker">준비 중</span>
                <h3 class="tips-section-title">해당 과목/분야 가이드를 준비 중입니다</h3>
                <p class="tips-section-desc">현재 선택한 교과나 세부 분야의 가이드는 아직 채워지지 않았습니다. 상위 교과를 보거나 다른 분야를 선택해 보세요.</p>
                <div class="tips-cta-actions">
                  <a class="tips-cta-button primary" href="${buildTipsHash({ tab: "curriculum", mode: state.mode, subject: state.subject })}">상위 교과 보기</a>
                  <a class="tips-cta-button" href="#/">메인 목록으로 이동</a>
                </div>
              </section>
            `}
        </section>

        <section class="tips-cta-band">
          <div class="tips-cta-copy">
            <span class="tips-section-kicker">다음 단계</span>
            <h2 class="tips-section-title">교과 가이드를 본 뒤 메인 목록에서 실제 사이트를 비교해 보세요</h2>
            <p class="tips-section-desc">여기서는 무엇부터 보면 좋은지 정리하고, 실제 자료 찾기는 메인 목록과 상세 페이지에서 이어집니다.</p>
          </div>
          <div class="tips-cta-actions">
            <a class="tips-cta-button primary" href="#/">메인 목록으로 이동</a>
            <a class="tips-cta-button" href="${buildTipsHash({ tab: "utility" })}">실용 팁 보기</a>
          </div>
        </section>
      </main>
    `;
  }

  function renderUtilityFilterChips(guides, activeCategory) {
    const categories = getUtilityCategories(guides);
    return `
      <nav class="tips-utility-filters" aria-label="실용 팁 카테고리">
        <a
          href="${buildTipsHash({ tab: "utility", category: "all" })}"
          class="tips-filter-chip ${activeCategory === "all" ? "is-active" : ""}"
          data-utility-category="all"
        >
          전체
        </a>
        ${categories.map((category) => `
          <a
            href="${buildTipsHash({ tab: "utility", category: category.key })}"
            class="tips-filter-chip ${category.key === activeCategory ? "is-active" : ""}"
            data-utility-category="${escapeAttr(category.key)}"
          >
            ${escapeHtml(category.label)}
          </a>
        `).join("")}
      </nav>
    `;
  }

  function renderUtilityGuideCards(guides, sectionsByGuide, category) {
    return guides.map((guide) => {
      const sections = sectionsByGuide[guide.id] || [];
      const pointChips = getGuidePointChips(sections);
      return `
        <a
          href="${buildGuideDetailHash(guide, category)}"
          class="tips-guide-card"
          data-guide-select="${escapeAttr(guide.id)}"
        >
          <div class="tips-guide-card-top">
            <span class="tips-guide-icon">${escapeHtml(guide.icon || "🧭")}</span>
            <div class="tips-guide-meta">
              ${guide.badgeText ? `<span class="tips-guide-badge">${escapeHtml(guide.badgeText)}</span>` : ""}
              <span class="tips-guide-audience">${escapeHtml(guide.audienceLabel || TARGET_LABELS[guide.target] || "공통")}</span>
            </div>
          </div>
          <h3 class="tips-guide-title">${escapeHtml(guide.title)}</h3>
          <p class="tips-guide-summary">${escapeHtml(guide.summary)}</p>
          ${guide.subtitle ? `<p class="tips-guide-subtitle">${escapeHtml(guide.subtitle)}</p>` : ""}
          <div class="tips-guide-points">
            ${pointChips.map((chip) => `<span class="tips-guide-point">${escapeHtml(chip)}</span>`).join("")}
          </div>
          <span class="tips-guide-cta">${escapeHtml(getGuideActionLabel(guide))}</span>
        </a>
      `;
    }).join("");
  }

  function renderUtilityGuideSections(data, guide) {
    const guideSections = data.guideSections
      .filter((section) => section.guideId === guide.id)
      .sort((a, b) => {
        const typeDiff = GUIDE_SECTION_ORDER.indexOf(a.sectionType) - GUIDE_SECTION_ORDER.indexOf(b.sectionType);
        return typeDiff || (a.sortOrder || 9999) - (b.sortOrder || 9999);
      });
    const guideLinks = data.guideLinks.filter((link) => link.guideId === guide.id);

    return `
      ${guideSections.map((section) => `
        <article class="tips-guide-detail-section" data-section-type="${escapeAttr(section.sectionType)}">
          <h4 class="tips-guide-detail-title">${escapeHtml(GUIDE_SECTION_LABELS[section.sectionType] || section.title)}</h4>
          ${section.title ? `<p class="tips-guide-detail-subtitle">${escapeHtml(section.title)}</p>` : ""}
          <div class="tips-guide-detail-copy">${sanitizeAllowedHtml(section.content)}</div>
          ${section.sectionType === "recommended_sites" && guideLinks.length
            ? `<div class="tips-guide-links">${guideLinks.map(renderGuideLink).join("")}</div>`
            : ""}
        </article>
      `).join("")}
      ${guideLinks.length && !guideSections.some((section) => section.sectionType === "recommended_sites")
        ? `
          <article class="tips-guide-detail-section" data-section-type="recommended_sites">
            <h4 class="tips-guide-detail-title">${GUIDE_SECTION_LABELS.recommended_sites}</h4>
            <div class="tips-guide-links">${guideLinks.map(renderGuideLink).join("")}</div>
          </article>
        `
        : ""}
    `;
  }

  function renderUtilityContent(data, state) {
    const guides = getUtilityGuides(data);
    const sectionsByGuide = groupGuideSections(data);
    const activeCategory = getUtilityCategory(guides, state.category);
    const filteredGuides = activeCategory === "all"
      ? guides
      : guides.filter((guide) => guide.categoryKey === activeCategory);
    const featuredGuides = filteredGuides.filter((guide) => guide.featured)
      .sort((a, b) => (a.featuredOrder || a.sortOrder || 9999) - (b.featuredOrder || b.sortOrder || 9999));

    return `
      <main class="tips-main-content">
        <section class="tips-work-panel">
          <div class="tips-panel-header">
            <span class="tips-section-kicker">실용 팁</span>
            <h2 class="tips-panel-title">교과 밖에서 자주 막히는 주제를 따로 모았습니다</h2>
            <p class="tips-panel-desc">논문 무료 열람, PPT 자료 모으기, 보고서 근거자료 찾기처럼 탐색 흐름과는 다른 주제를 실용 팁으로 분리했습니다.</p>
            ${renderUtilityFilterChips(guides, activeCategory)}
          </div>

          ${featuredGuides.length
            ? `
              <section class="tips-section-block" id="tipsUtilityFeatured">
                <div class="tips-section-head">
                  <span class="tips-section-kicker">운영자 추천</span>
                  <h3 class="tips-section-title">먼저 보면 좋은 실용 팁</h3>
                  <p class="tips-section-desc">바로 따라할 수 있는 대표 주제를 카드로 골라볼 수 있습니다.</p>
                </div>
                <div class="tips-guide-grid">
                  ${renderUtilityGuideCards(featuredGuides, sectionsByGuide, activeCategory)}
                </div>
              </section>
            `
            : ""}

          ${filteredGuides.length
            ? `
              <section class="tips-section-block" id="tipsUtilityAll">
                <div class="tips-section-head">
                  <span class="tips-section-kicker">전체 가이드</span>
                  <h3 class="tips-section-title">${activeCategory === "all" ? "필요한 주제를 골라보세요" : "선택한 카테고리의 가이드"}</h3>
                  <p class="tips-section-desc">카드를 누르면 별도 상세 화면에서 순서와 관련 사이트를 확인할 수 있습니다.</p>
                </div>
                <div class="tips-guide-grid">
                  ${renderUtilityGuideCards(filteredGuides, sectionsByGuide, activeCategory)}
                </div>
              </section>
            `
            : `
              <section class="tips-empty-state">
                <span class="tips-section-kicker">준비 중</span>
                <h3 class="tips-section-title">실용 팁을 준비 중입니다</h3>
                <p class="tips-section-desc">논문 무료 열람, PPT 자료 찾기 같은 실용 팁은 곧 추가될 예정입니다.</p>
                <div class="tips-cta-actions">
                  <a class="tips-cta-button primary" href="${buildTipsHash({ tab: "curriculum", mode: "elem_middle" })}">교과 가이드 보기</a>
                  <a class="tips-cta-button" href="#/">메인 목록으로 이동</a>
                </div>
              </section>
            `}
        </section>

        <section class="tips-cta-band">
          <div class="tips-cta-copy">
            <span class="tips-section-kicker">탐색 이어가기</span>
            <h2 class="tips-section-title">실용 팁을 본 뒤 필요한 사이트를 바로 열어보세요</h2>
            <p class="tips-section-desc">상세 패널의 관련 사이트 링크와 메인 목록을 연결해 실제 탐색으로 이어지도록 구성했습니다.</p>
          </div>
          <div class="tips-cta-actions">
            <a class="tips-cta-button primary" href="#/">메인 목록으로 이동</a>
            <a class="tips-cta-button" href="${buildTipsHash({ tab: "curriculum", mode: "high" })}">고등 교과 가이드 보기</a>
          </div>
        </section>
      </main>
    `;
  }

  function renderUtilityGuideDetail(data, guide, category) {
    const guides = getUtilityGuides(data);
    const guideLinks = data.guideLinks.filter((link) => link.guideId === guide.id);
    const sectionsByGuide = groupGuideSections(data);
    const relatedGuides = guides
      .filter((item) => item.id !== guide.id && item.categoryKey === guide.categoryKey)
      .slice(0, 3);

    return `
      <div class="tips-layout tips-guide-detail-layout">
        <div class="tips-top-header">
          <button type="button" id="tipsGuideBackBtn" class="detail-back">← 실용 팁 목록</button>
          <span class="tips-page-label">자료 탐색 가이드 상세</span>
        </div>

        <main class="tips-guide-detail-page">
          <section class="tips-detail-panel" id="tipsUtilityDetailPanel">
            <div class="tips-detail-head">
              <span class="tips-guide-detail-eyebrow">실용 팁 상세</span>
              <div class="tips-guide-detail-heading">
                <span class="tips-guide-icon tips-guide-detail-icon">${escapeHtml(guide.icon || "🧭")}</span>
                <div>
                  <div class="tips-guide-meta">
                    ${guide.badgeText ? `<span class="tips-guide-badge">${escapeHtml(guide.badgeText)}</span>` : ""}
                    <span class="tips-guide-audience">${escapeHtml(guide.audienceLabel || TARGET_LABELS[guide.target] || "공통")}</span>
                  </div>
                  <h1 class="tips-guide-detail-page-title">${escapeHtml(guide.title)}</h1>
                </div>
              </div>
              <p class="tips-guide-detail-summary">${escapeHtml(guide.summary)}</p>
              ${guide.subtitle ? `<p class="tips-panel-desc">${escapeHtml(guide.subtitle)}</p>` : ""}
              <div class="tips-guide-actions">
                ${renderGuideActionLinks(guide, guideLinks)}
              </div>
            </div>
            <div class="tips-guide-detail-body">
              ${renderUtilityGuideSections(data, guide)}
            </div>
          </section>

          ${relatedGuides.length
            ? `
              <section class="tips-related-guides" aria-labelledby="tipsRelatedGuidesTitle">
                <div class="tips-section-head">
                  <span class="tips-section-kicker">관련 가이드</span>
                  <h2 class="tips-section-title" id="tipsRelatedGuidesTitle">같은 주제의 다른 팁</h2>
                </div>
                <div class="tips-guide-grid">
                  ${renderUtilityGuideCards(relatedGuides, sectionsByGuide, category)}
                </div>
              </section>
            `
            : ""}
        </main>
      </div>
    `;
  }

  function rememberUtilityListState(category) {
    utilityListReturnState = {
      category: category || "all",
      scrollY: Number.isFinite(window.scrollY) ? window.scrollY : 0,
      restorePending: false,
    };
  }

  function restoreUtilityListStateIfNeeded(state) {
    if (state.tab !== "utility" || !utilityListReturnState?.restorePending) return;
    const scrollY = utilityListReturnState.scrollY;
    utilityListReturnState = null;
    requestAnimationFrame(() => {
      window.scrollTo({ top: scrollY, behavior: "auto" });
      setTimeout(() => window.scrollTo({ top: scrollY, behavior: "auto" }), 0);
    });
  }

  function normalizeLegacyUtilityHash(data) {
    const params = parseHashParams();
    const requestedGuide = String(params.get("guide") || "").trim();
    if (!requestedGuide || !String(window.location.hash || "").startsWith("#/tips?")) return;
    const guide = getUtilityGuides(data).find((item) => item.id === requestedGuide || item.slug === requestedGuide);
    history.replaceState(null, "", buildTipsHash({ tab: "utility", category: guide?.categoryKey || "all" }));
  }

  function renderTipsView() {
    const tipsView = document.getElementById("tipsView");
    if (!tipsView) return;

    const data = getTipsData();
    const detailSlug = getGuideDetailSlug();
    if (detailSlug) {
      const guide = getUtilityGuides(data).find((item) => item.slug === detailSlug || item.id === detailSlug);
      if (!guide) {
        history.replaceState(null, "", buildTipsHash({ tab: "utility", category: "all" }));
      } else {
        const category = getUtilityCategory(getUtilityGuides(data), parseHashParams().get("category"));
        tipsView.innerHTML = renderUtilityGuideDetail(data, guide, category);
        tipsView.dataset.rendered = "true";
        tipsView.dataset.view = "guide-detail";

        document.getElementById("tipsGuideBackBtn")?.addEventListener("click", (event) => {
          event.preventDefault();
          const returnCategory = utilityListReturnState?.category || "all";
          if (utilityListReturnState) utilityListReturnState.restorePending = true;
          window.location.hash = buildTipsHash({ tab: "utility", category: returnCategory });
        });

        tipsView.querySelectorAll("[data-guide-select]").forEach((card) => {
          card.addEventListener("click", () => rememberUtilityListState(category));
        });
        window.scrollTo({ top: 0, behavior: "auto" });
        return;
      }
    }

    normalizeLegacyUtilityHash(data);
    const state = getCurrentState(data);

    tipsView.innerHTML = `
      <div class="tips-layout">
        <div class="tips-top-header">
          <button type="button" id="tipsBackBtn" class="detail-back">목록으로</button>
          <span class="tips-page-label">운영자가 직접 관리하는 자료 안내</span>
          <button type="button" id="tipsMobileNavTrigger" class="tips-mobile-nav-trigger">탐색 열기</button>
        </div>

        ${renderHero(state)}
        ${renderTopTabs(state)}

        <div class="tips-content-layout ${state.tab === "utility" ? "is-utility" : ""}">
          ${state.tab === "curriculum" ? renderCurriculumSidebar(data, state) : ""}
          ${state.tab === "curriculum" ? renderCurriculumContent(data, state) : renderUtilityContent(data, state)}
        </div>
      </div>
    `;

    tipsView.dataset.rendered = "true";
    tipsView.dataset.view = state.tab === "utility" ? "utility-list" : "curriculum";

    document.getElementById("tipsBackBtn")?.addEventListener("click", (event) => {
      event.preventDefault();
      window.location.hash = "#/";
    });

    const layout = tipsView.querySelector(".tips-layout");
    document.getElementById("tipsMobileNavTrigger")?.addEventListener("click", () => {
      layout?.classList.toggle("is-nav-open");
    });
    document.getElementById("tipsMobileNavClose")?.addEventListener("click", () => {
      layout?.classList.remove("is-nav-open");
    });

    if (state.tab === "utility") {
      tipsView.querySelectorAll("[data-guide-select]").forEach((card) => {
        card.addEventListener("click", () => rememberUtilityListState(state.category));
      });
      restoreUtilityListStateIfNeeded(state);
    }
  }

  window.renderTipsView = renderTipsView;
})();
