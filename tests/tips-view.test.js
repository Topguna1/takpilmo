import { describe, expect, it } from "vitest";
import { loadBrowserScript, resetBrowserEnv } from "./helpers/browser-env.js";

function createTipsDom() {
  return `<section id="tipsView" class="tips-view"></section>`;
}

function createTipsPayload() {
  return {
    curriculumGroups: [
      {
        id: "elem-middle-math",
        mode: "elem_middle",
        subjectKey: "math",
        subjectLabel: "수학",
        title: "수학 자료 탐색 가이드",
        subtitle: "개념과 기본 문제 흐름을 먼저 잡는 법",
        sortOrder: 1,
      },
      {
        id: "high-math",
        mode: "high",
        subjectKey: "math",
        subjectLabel: "수학",
        title: "고등 수학 자료 탐색 가이드",
        subtitle: "세부 과목별로 자료 흐름을 나눠 보는 법",
        sortOrder: 1,
      },
    ],
    curriculumTopics: [
      {
        id: "high-math-common-math-1",
        mode: "high",
        subjectKey: "math",
        topicKey: "common_math_1",
        topicLabel: "공통수학 1",
        title: "공통수학 1 자료 찾기",
        subtitle: "개념과 유형 자료를 나눠 보는 법",
        sortOrder: 1,
      },
      {
        id: "high-math-calculus",
        mode: "high",
        subjectKey: "math",
        topicKey: "calculus",
        topicLabel: "미적분",
        title: "미적분 자료 찾기",
        subtitle: "개념 설명과 풀이 자료를 구분하는 법",
        sortOrder: 2,
      },
    ],
    curriculumSections: [
      {
        id: "common-math-1-first",
        mode: "high",
        subjectKey: "math",
        topicKey: "common_math_1",
        title: "이 단원에서 먼저 볼 것",
        sortOrder: 1,
      },
      {
        id: "common-math-1-sites",
        mode: "high",
        subjectKey: "math",
        topicKey: "common_math_1",
        title: "추천 사이트",
        sortOrder: 2,
      },
    ],
    curriculumItems: [
      {
        id: "common-math-1-first-1",
        sectionId: "common-math-1-first",
        content: "<strong>개념 자료 먼저</strong> 보고 유형 자료로 넘어갑니다.",
        sortOrder: 1,
      },
      {
        id: "common-math-1-sites-1",
        sectionId: "common-math-1-sites",
        content: "상세 페이지에서 관련 사이트를 함께 비교합니다.",
        sortOrder: 1,
      },
    ],
    guides: [
      {
        id: "free-paper-access",
        slug: "free-paper-access",
        tab: "utility",
        categoryKey: "research",
        categoryLabel: "논문 / 근거자료",
        title: "논문 사이트 학생 기준 무료로 보기",
        subtitle: "무료 전문과 초록, 기관 원문 순서",
        summary: "무료 열람 경로를 정리합니다.",
        target: "high",
        badgeText: "무료 열람",
        icon: "🆓",
        audienceLabel: "고등 추천",
        featured: true,
        featuredOrder: 1,
        primaryCtaText: "바로 따라하기",
        primaryCtaType: "detail",
        sortOrder: 1,
      },
      {
        id: "ppt-tip",
        slug: "ppt-tip",
        tab: "utility",
        categoryKey: "presentation",
        categoryLabel: "발표 / PPT",
        title: "PPT 자료 찾는 팁",
        subtitle: "구조와 근거를 먼저 모으는 방식",
        summary: "PPT용 자료 수집 흐름을 정리합니다.",
        target: "elementary_middle",
        badgeText: "발표 준비",
        icon: "🖼️",
        audienceLabel: "초·중 추천",
        featured: true,
        featuredOrder: 2,
        primaryCtaText: "이 방법 사용하기",
        primaryCtaType: "detail",
        sortOrder: 2,
      },
      {
        id: "report-evidence",
        slug: "report-evidence",
        tab: "utility",
        categoryKey: "research",
        categoryLabel: "논문 / 근거자료",
        title: "보고서용 근거자료 찾기",
        subtitle: "통계와 원문을 함께 비교하는 방식",
        summary: "보고서에 쓸 근거자료 흐름을 정리합니다.",
        target: "all",
        badgeText: "근거자료",
        icon: "📊",
        audienceLabel: "공통",
        featured: false,
        sortOrder: 3,
      },
    ],
    guideSections: [
      {
        id: "free-paper-overview",
        guideId: "free-paper-access",
        sectionType: "overview",
        title: "이런 상황에서 유용합니다",
        content: "<strong>무료 전문이 바로 안 보일 때</strong> 확인할 순서를 정리합니다.",
        sortOrder: 1,
      },
      {
        id: "free-paper-access-free",
        guideId: "free-paper-access",
        sectionType: "free_access",
        title: "학생 기준 무료 열람",
        content: "기관 제공 원문과 무료 표기를 먼저 확인합니다.",
        sortOrder: 2,
      },
    ],
    guideLinks: [
      {
        id: "free-paper-link",
        guideId: "free-paper-access",
        label: "RISS 보기",
        linkType: "route",
        hrefOrSiteKey: "#/",
        sortOrder: 1,
      },
      {
        id: "report-evidence-link",
        guideId: "report-evidence",
        label: "메인 목록으로 이동",
        linkType: "route",
        hrefOrSiteKey: "#/",
        sortOrder: 1,
      },
    ],
  };
}

describe("tips view", () => {
  it("renders curriculum mode with high-school topic navigation", () => {
    resetBrowserEnv(createTipsDom());
    window.ddakpilmoContentTips = createTipsPayload();
    window.location.hash = "#/tips?tab=curriculum&mode=high&subject=math&topic=common_math_1";

    loadBrowserScript("tIps/tips.view.js");
    window.renderTipsView();

    expect(document.getElementById("tipsHeroTitle")?.textContent).toBe("자료 탐색 가이드");
    expect(document.querySelectorAll(".tips-primary-tab")).toHaveLength(2);
    expect(document.querySelector('[data-subject-nav="math"]')).not.toBeNull();
    expect(document.querySelector('[data-topic-nav="common_math_1"]')?.classList.contains("is-active")).toBe(true);
    expect(document.querySelector(".tips-panel-title")?.textContent).toContain("공통수학 1");
    expect(document.querySelector(".tips-main-content")?.textContent).toContain("개념 자료 먼저");
    expect(document.querySelectorAll("[data-filter-group]")).toHaveLength(0);
  });

  it("renders featured and full utility guide card grids with category filters", () => {
    resetBrowserEnv(createTipsDom());
    window.ddakpilmoContentTips = createTipsPayload();
    window.location.hash = "#/tips?tab=utility";

    loadBrowserScript("tIps/tips.view.js");
    window.renderTipsView();

    expect(document.querySelector(".tips-primary-tab.is-active")?.textContent).toContain("실용 팁");
    expect(document.getElementById("tipsUtilityFeatured")).not.toBeNull();
    expect(document.getElementById("tipsUtilityAll")).not.toBeNull();
    expect(document.querySelectorAll("#tipsUtilityFeatured .tips-guide-card")).toHaveLength(2);
    expect(document.querySelectorAll("#tipsUtilityAll .tips-guide-card")).toHaveLength(3);
    expect(document.getElementById("tipsUtilityDetailPanel")).toBeNull();
    expect(document.querySelector('[data-utility-category="all"]')?.classList.contains("is-active")).toBe(true);
    expect(document.querySelector('[data-utility-category="research"]')).not.toBeNull();
  });

  it("filters utility cards and normalizes legacy guide query links", () => {
    resetBrowserEnv(createTipsDom());
    window.ddakpilmoContentTips = createTipsPayload();
    window.location.hash = "#/tips?tab=utility&guide=free-paper-access";

    loadBrowserScript("tIps/tips.view.js");
    window.renderTipsView();

    expect(window.location.hash).toBe("#/tips?tab=utility&category=research");
    expect(document.querySelector('[data-utility-category="research"]')?.classList.contains("is-active")).toBe(true);
    expect(document.querySelectorAll("#tipsUtilityAll .tips-guide-card")).toHaveLength(2);
  });

  it("renders an independent utility detail route with sections and related guides", () => {
    resetBrowserEnv(createTipsDom());
    window.ddakpilmoContentTips = createTipsPayload();
    window.location.hash = "#/tips/guide/free-paper-access?category=research";

    loadBrowserScript("tIps/tips.view.js");
    window.renderTipsView();

    expect(document.getElementById("tipsUtilityDetailPanel")?.textContent).toContain("논문 사이트 학생 기준 무료로 보기");
    expect(document.querySelector('#tipsUtilityDetailPanel [data-section-type="free_access"]')).not.toBeNull();
    expect(document.querySelector(".tips-related-guides")?.textContent).toContain("보고서용 근거자료 찾기");
    expect(document.getElementById("tipsGuideBackBtn")).not.toBeNull();
  });

  it("restores the utility list category and scroll position after leaving a detail card", () => {
    const env = resetBrowserEnv(createTipsDom());
    window.ddakpilmoContentTips = createTipsPayload();
    window.location.hash = "#/tips?tab=utility&category=research";

    loadBrowserScript("tIps/tips.view.js");
    window.renderTipsView();

    env.setScroll(360);
    document.querySelector('#tipsUtilityAll [data-guide-select="free-paper-access"]')
      ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    window.location.hash = "#/tips/guide/free-paper-access?category=research";
    window.renderTipsView();
    document.getElementById("tipsGuideBackBtn")?.click();
    window.renderTipsView();
    env.flushRaf();

    expect(window.location.hash).toBe("#/tips?tab=utility&category=research");
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 360, behavior: "auto" });
  });

  it("falls back to the full utility list for an unknown guide slug", () => {
    resetBrowserEnv(createTipsDom());
    window.ddakpilmoContentTips = createTipsPayload();
    window.location.hash = "#/tips/guide/not-found?category=research";

    loadBrowserScript("tIps/tips.view.js");
    window.renderTipsView();

    expect(window.location.hash).toBe("#/tips?tab=utility");
    expect(document.getElementById("tipsUtilityAll")).not.toBeNull();
    expect(document.querySelector('[data-utility-category="all"]')?.classList.contains("is-active")).toBe(true);
  });
});
