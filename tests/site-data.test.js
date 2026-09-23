import { beforeEach, describe, expect, it, vi } from "vitest";
import { installSiteData } from "../js/data/site-data.module.js";
import { resetBrowserEnv } from "./helpers/browser-env.js";

function createRemotePayload(overrides = {}) {
  return {
    version: "2026-04-24T10:00:00Z",
    generatedAt: "2026-04-24T10:00:00Z",
    categories: [
      { key: "info", name: "참고자료", icon: "📊", sortOrder: 1 },
      { key: "learning", name: "학습", icon: "📘", sortOrder: 2 },
    ],
    sites: [
      {
        key: "GoogleScholar",
        name: "Google Scholar",
        url: "https://scholar.google.com/",
        desc: "논문 자료 검색",
        category: "info",
        ages: "high,adult",
        subjects: ["general"],
        isGov: false,
        sortOrder: 1,
      },
    ],
    details: {
      bySiteKey: {
        GoogleScholar: {
          title: "Google Scholar",
          detailDesc: "논문 검색 상세 설명",
          updatedAt: "2026-04-24T10:00:00Z",
        },
      },
    },
    tips: {
      curriculumGroups: [
        {
          id: "elem-middle-math",
          mode: "elem_middle",
          subjectKey: "math",
          subjectLabel: "수학",
          title: "수학 자료 탐색 가이드",
          subtitle: "개념과 기본 문제 흐름",
          sortOrder: 1,
          enabled: true,
        },
        {
          id: "high-math",
          mode: "high",
          subjectKey: "math",
          subjectLabel: "수학",
          title: "고등 수학 자료 탐색 가이드",
          subtitle: "세부 과목별 자료 흐름",
          sortOrder: 2,
          enabled: true,
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
          sortOrder: 1,
          enabled: true,
        },
      ],
      curriculumSections: [
        {
          id: "high-math-common-math-1-first",
          mode: "high",
          subjectKey: "math",
          topicKey: "common_math_1",
          title: "이 단원에서 먼저 볼 것",
          sortOrder: 1,
          enabled: true,
        },
      ],
      curriculumItems: [
        {
          id: "high-math-common-math-1-first-1",
          sectionId: "high-math-common-math-1-first",
          content: "<strong>개념 자료 먼저</strong> 보고 유형 자료로 넘어갑니다.",
          sortOrder: 1,
          enabled: true,
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
          featuredOrder: 3,
          primaryCtaText: "바로 따라하기",
          primaryCtaType: "detail",
          primaryCtaValue: "free-paper-access",
          secondaryCtaText: "Google Scholar 보기",
          secondaryCtaType: "site",
          secondaryCtaValue: "GoogleScholar",
          updatedAt: "2026-04-24",
          sortOrder: 1,
          enabled: true,
        },
      ],
      guideSections: [
        {
          id: "free-paper-overview",
          guideId: "free-paper-access",
          sectionType: "overview",
          title: "개요",
          content: "무료 전문이 보이지 않을 때 확인 순서를 정리합니다.",
          sortOrder: 1,
          enabled: true,
        },
      ],
      guideLinks: [
        {
          id: "free-paper-link",
          guideId: "free-paper-access",
          label: "Google Scholar",
          linkType: "site",
          hrefOrSiteKey: "GoogleScholar",
          sortOrder: 1,
          enabled: true,
        },
      ],
    },
    ...overrides,
  };
}

describe("site data loader", () => {
  beforeEach(() => {
    resetBrowserEnv();
    localStorage.clear();
    delete window.loadJSONData;
    delete window.loadDetailsFromSheet;
    delete window.loadContentFromRemote;
    delete window.clearContentCache;
    delete window.refreshContentFromSheet;
    delete window.loadLocalSnapshot;
    delete window.CONTENT_API_URL;
    delete window.DETAILS_API_URL;
    delete window.DDAKPILMO_CONTENT_API_URL;
    delete window.defaultCategories;
    delete window.initialSites;
    delete window.siteDetailMap;
    delete window.__siteDataContentLoaded;
    vi.restoreAllMocks();
  });

  it("uses a valid default content API URL when no override is configured", () => {
    installSiteData();

    expect(window.CONTENT_API_URL).toBe(
      "https://script.google.com/macros/s/AKfycbxu0QNxzD11mmExZ89ItV9TIvKz9Dd1EYxAiQbL56SyGQU2yzZNyT0qzB6dpwwbslzJeA/exec"
    );
    expect(window.CONTENT_API_URL).not.toContain("/macros/s/https://");
  });

  it("refreshes sheet content after clearing the cached payload", async () => {
    localStorage.setItem("contentSheetCache:v4", JSON.stringify({
      ts: Date.now(),
      data: createRemotePayload({
        categories: [{ key: "cached", name: "캐시", icon: "📦", sortOrder: 1 }],
      }),
    }));

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => createRemotePayload(),
      }))
    );

    installSiteData();
    await window.refreshContentFromSheet();

    expect(window.defaultCategories.cached).toBeUndefined();
    expect(window.defaultCategories.info.name).toBe("참고자료");
  });

  it("fetches the latest sheet content before using a fresh cache", async () => {
    localStorage.setItem("contentSheetCache:v4", JSON.stringify({
      ts: Date.now(),
      data: createRemotePayload({
        categories: [{ key: "cached", name: "캐시", icon: "📦", sortOrder: 1 }],
      }),
    }));

    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => createRemotePayload(),
    }));
    vi.stubGlobal("fetch", fetchMock);

    installSiteData();
    await window.loadJSONData();

    expect(fetchMock).toHaveBeenCalledWith(window.CONTENT_API_URL, { cache: "no-store", signal: expect.any(AbortSignal) });
    expect(window.defaultCategories.cached).toBeUndefined();
    expect(window.defaultCategories.info.name).toBe("참고자료");
  });

  it("loads categories, sites, curriculum guides, and utility guides from content payload", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => createRemotePayload(),
      }))
    );

    installSiteData();
    await window.loadJSONData();

    expect(Object.keys(window.defaultCategories)).toEqual(["info", "learning"]);
    expect(window.initialSites).toHaveLength(1);
    expect(window.siteDetailMap.GoogleScholar.detailDesc).toBe("논문 검색 상세 설명");
    expect(window.ddakpilmoContentTips.curriculumGroups).toHaveLength(2);
    expect(window.ddakpilmoContentTips.curriculumTopics[0].topicKey).toBe("common_math_1");
    expect(window.ddakpilmoContentTips.curriculumSections[0].subjectKey).toBe("math");
    expect(window.ddakpilmoContentTips.curriculumItems[0].sectionId).toBe("high-math-common-math-1-first");
    expect(window.ddakpilmoContentTips.guides).toHaveLength(1);
    expect(window.ddakpilmoContentTips.guides[0].tab).toBe("utility");
    expect(window.ddakpilmoContentTips.guides[0].categoryKey).toBe("research");
    expect(window.ddakpilmoContentTips.guides[0].target).toBe("high");
    expect(window.ddakpilmoContentTips.guideLinks[0].hrefOrSiteKey).toBe("GoogleScholar");
    expect(window.__siteDataContentLoaded).toBe(true);
  });

  it("uses stale cached sheet content when the remote content endpoint fails", async () => {
    localStorage.setItem("contentSheetCache:v4", JSON.stringify({
      ts: Date.now() - 1000 * 60 * 60 * 24,
      data: createRemotePayload({
        details: {
          bySiteKey: {
            GoogleScholar: {
              title: "Google Scholar",
              detailDesc: "stale cached detail",
              updatedAt: "2026-04-24T10:00:00Z",
            },
          },
        },
      }),
    }));

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        status: 403,
        json: async () => ({}),
      }))
    );

    installSiteData();
    await window.loadJSONData();

    expect(window.initialSites).toHaveLength(1);
    expect(window.siteDetailMap.GoogleScholar.detailDesc).toBe("stale cached detail");
    expect(window.__siteDataContentLoaded).toBe(true);
  });

  it("prefers ddakpilmo.config.contentApiUrl when provided", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () =>
        createRemotePayload({
          categories: [],
          sites: [],
          details: { bySiteKey: {} },
          tips: {},
        }),
    }));
    vi.stubGlobal("fetch", fetchMock);

    window.ddakpilmo = { config: { contentApiUrl: "https://example.com/content" } };

    installSiteData();
    await window.loadJSONData();

    expect(fetchMock).toHaveBeenCalledWith("https://example.com/content", { cache: "no-store", signal: expect.any(AbortSignal) });
  });

  it("falls back to local snapshot when remote payload only contains legacy details", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url) => {
        if (String(url).startsWith("data/categories.json")) {
          return {
            ok: true,
            json: async () => ({
              learning: { name: "학습", icon: "📘" },
            }),
          };
        }

        if (String(url).startsWith("data/sites.json")) {
          return {
            ok: true,
            json: async () => [
              {
                key: "local-site",
                name: "로컬 사이트",
                url: "https://example.com",
                desc: "로컬 설명",
                category: "learning",
                ages: ["high"],
                subjects: ["general"],
              },
            ],
          };
        }

        if (String(url).startsWith("data/content.example.json")) {
          return {
            ok: true,
            json: async () => ({
              tips: {
                curriculumGroups: [
                  {
                    id: "local-elem-middle-math",
                    mode: "elem_middle",
                    subjectKey: "math",
                    subjectLabel: "수학",
                    title: "로컬 수학 가이드",
                    sortOrder: 1,
                    enabled: true,
                  },
                ],
                curriculumSections: [
                  {
                    id: "local-section",
                    mode: "elem_middle",
                    subjectKey: "math",
                    title: "로컬 섹션",
                    sortOrder: 1,
                    enabled: true,
                  },
                ],
                curriculumItems: [
                  {
                    id: "local-item",
                    sectionId: "local-section",
                    content: "로컬 fallback 안내",
                    sortOrder: 1,
                    enabled: true,
                  },
                ],
                guides: [
                  {
                    id: "local-guide",
                    tab: "utility",
                    title: "로컬 실용 팁",
                    summary: "로컬 fallback 팁",
                    sortOrder: 1,
                    enabled: true,
                  },
                ],
                guideSections: [
                  {
                    id: "local-guide-overview",
                    guideId: "local-guide",
                    sectionType: "overview",
                    content: "fallback 개요",
                    sortOrder: 1,
                    enabled: true,
                  },
                ],
                guideLinks: [],
              },
            }),
          };
        }

        return {
          ok: true,
          json: async () => ({
            version: 1,
            generatedAt: "2026-04-24T10:00:00Z",
            items: {
              "local-site": {
                title: "로컬 사이트",
                detailDesc: "원격 상세 설명",
                updatedAt: "2026-04-24T10:00:00Z",
              },
            },
          }),
        };
      })
    );

    installSiteData();
    await window.loadJSONData();

    expect(window.defaultCategories.learning.name).toBe("학습");
    expect(window.initialSites[0].key).toBe("local-site");
    expect(window.siteDetailMap["local-site"].detailDesc).toBe("원격 상세 설명");
    expect(window.ddakpilmoContentTips.curriculumGroups[0].id).toBe("local-elem-middle-math");
    expect(window.ddakpilmoContentTips.guides[0].id).toBe("local-guide");
    expect(window.__siteDataContentLoaded).toBe(false);
  });

  it("filters invalid curriculum rows and invalid utility links during normalization", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () =>
          createRemotePayload({
            tips: {
              curriculumGroups: [
                {
                  id: "high-math",
                  mode: "high",
                  subjectKey: "math",
                  subjectLabel: "수학",
                  sortOrder: 1,
                  enabled: true,
                },
              ],
              curriculumTopics: [
                {
                  id: "valid-topic",
                  mode: "high",
                  subjectKey: "math",
                  topicKey: "common_math_1",
                  topicLabel: "공통수학 1",
                  sortOrder: 1,
                  enabled: true,
                },
                {
                  id: "bad-topic",
                  mode: "high",
                  subjectKey: "missing",
                  topicKey: "missing",
                  topicLabel: "잘못된 토픽",
                  sortOrder: 2,
                  enabled: true,
                },
              ],
              curriculumSections: [
                {
                  id: "valid-section",
                  mode: "high",
                  subjectKey: "math",
                  topicKey: "common_math_1",
                  title: "유효한 섹션",
                  sortOrder: 1,
                  enabled: true,
                },
                {
                  id: "bad-section",
                  mode: "high",
                  subjectKey: "math",
                  topicKey: "unknown_topic",
                  title: "잘못된 섹션",
                  sortOrder: 2,
                  enabled: true,
                },
              ],
              curriculumItems: [
                {
                  id: "valid-item",
                  sectionId: "valid-section",
                  content: "유효한 아이템",
                  sortOrder: 1,
                  enabled: true,
                },
                {
                  id: "bad-item",
                  sectionId: "bad-section",
                  content: "잘못된 아이템",
                  sortOrder: 2,
                  enabled: true,
                },
              ],
              guides: [
                {
                  id: "utility-guide",
                  title: "실용 팁",
                  summary: "유효한 실용 팁",
                  tab: "utility",
                  primaryCtaType: "site",
                  primaryCtaValue: "GoogleScholar",
                  sortOrder: 1,
                  enabled: true,
                },
              ],
              guideSections: [
                {
                  id: "valid-guide-overview",
                  guideId: "utility-guide",
                  sectionType: "overview",
                  content: "유효한 개요",
                  sortOrder: 1,
                  enabled: true,
                },
                {
                  id: "bad-guide-overview",
                  guideId: "missing-guide",
                  sectionType: "overview",
                  content: "잘못된 개요",
                  sortOrder: 2,
                  enabled: true,
                },
              ],
              guideLinks: [
                {
                  id: "valid-link",
                  guideId: "utility-guide",
                  label: "Google Scholar",
                  linkType: "site",
                  hrefOrSiteKey: "GoogleScholar",
                  sortOrder: 1,
                  enabled: true,
                },
                {
                  id: "bad-link",
                  guideId: "utility-guide",
                  label: "없는 사이트",
                  linkType: "site",
                  hrefOrSiteKey: "MissingSite",
                  sortOrder: 2,
                  enabled: true,
                },
              ],
            },
          }),
      }))
    );

    installSiteData();
    await window.loadJSONData();

    expect(window.ddakpilmoContentTips.curriculumTopics).toHaveLength(1);
    expect(window.ddakpilmoContentTips.curriculumTopics[0].id).toBe("valid-topic");
    expect(window.ddakpilmoContentTips.curriculumSections).toHaveLength(1);
    expect(window.ddakpilmoContentTips.curriculumSections[0].id).toBe("valid-section");
    expect(window.ddakpilmoContentTips.curriculumItems).toHaveLength(1);
    expect(window.ddakpilmoContentTips.curriculumItems[0].id).toBe("valid-item");
    expect(window.ddakpilmoContentTips.guideSections).toHaveLength(1);
    expect(window.ddakpilmoContentTips.guideSections[0].id).toBe("valid-guide-overview");
    expect(window.ddakpilmoContentTips.guideLinks).toHaveLength(1);
    expect(window.ddakpilmoContentTips.guideLinks[0].id).toBe("valid-link");
  });
});
