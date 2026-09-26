import { installSearchEngine } from '../js/search/filter-engine.module.js';
import { describe, expect, it } from "vitest";
import { resetBrowserEnv } from "./helpers/browser-env.js";

describe("filter engine", () => {
  it("filters by category and search text", () => {
    resetBrowserEnv();

    const state = {
      sites: [
        {
          name: "Alpha Academy",
          desc: "수학 학습 사이트",
          category: "learning",
          ages: ["elem"],
          subjects: ["math"],
          chosungFull: "ㅇㄹㅍ ㅇㅋㄷㅁ",
          __searchText: "alpha academy learning 수학",
          __jamoText: "alpha academy learning 수학",
        },
        {
          name: "Beta Career",
          desc: "진로 정보",
          category: "career",
          ages: ["adult"],
          subjects: ["career"],
          chosungFull: "ㅂㅌ ㅋㄹㅇ",
          __searchText: "beta career career 진로",
          __jamoText: "beta career career 진로",
        },
      ],
      currentAgeFilter: "all",
      currentCategoryFilter: "learning",
      currentSubjectFilter: "all",
      currentGovFilter: "all",
      currentSearchQuery: "alpha",
    };

    window.App = {
      store: {
        getState: () => state,
      },
    };
    window.ageNames = { elem: "초등학생", adult: "성인" };
    window.subjectNames = { math: "수학", career: "진로" };
    window.getCategoryName = (key) => key;

    installSearchEngine();

    expect(window.getFilteredSites().map((site) => site.name)).toEqual(["Alpha Academy"]);
  });

  it("matches chosung-only queries", () => {
    resetBrowserEnv();

    const state = {
      sites: [
        {
          name: "딱필모",
          desc: "교육 링크 모음",
          category: "learning",
          ages: ["elem"],
          subjects: ["math"],
          chosungFull: "ㄸㅍㅁ ㄱㅇ ㄹㅋ ㅁㅇ",
          __searchText: "딱필모 교육 링크 모음",
          __jamoText: "ㄸㅏㄱㅍㅣㄹㅁㅗ ㄱㅛㅇㅠㄱ ㄹㅣㅇㅋㅡ ㅁㅗㅇㅡㅁ",
        },
      ],
      currentAgeFilter: "all",
      currentCategoryFilter: "all",
      currentSubjectFilter: "all",
      currentGovFilter: "all",
      currentSearchQuery: "ㄸㅍㅁ",
    };

    window.App = {
      store: {
        getState: () => state,
      },
    };
    window.ageNames = { elem: "초등학생" };
    window.subjectNames = { math: "수학" };
    window.getCategoryName = (key) => key;

    installSearchEngine();

    expect(window.getFilteredSites()).toHaveLength(1);
  });

  it("builds a stable cache key from state fields", () => {
    resetBrowserEnv();

    const state = {
      sites: [{ name: "Alpha" }],
      currentAgeFilter: "all",
      currentCategoryFilter: "learning",
      currentSubjectFilter: "math",
      currentGovFilter: "gov",
      currentSearchQuery: "alpha",
    };

    window.App = {
      store: {
        getState: () => state,
      },
    };
    installSearchEngine();

    const first = window.App.search.buildFilterCacheKey(state);
    const second = window.App.search.buildFilterCacheKey({
      ...state,
      sites: [...state.sites],
    });

    expect(first).toBe(second);
  });
});
