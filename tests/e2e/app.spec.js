import { expect, test } from "@playwright/test";

const categoriesFixture = {
  learning: { name: "학습", icon: "📘" },
  career: { name: "진로", icon: "🧭" },
  info: { name: "참고자료", icon: "📊" },
};

const sitesFixture = Array.from({ length: 12 }, (_, index) => ({
  key: `alpha-${index + 1}`,
  id: `alpha-${index + 1}`,
  name: `Alpha ${index + 1}`,
  url: `https://alpha${index + 1}.example.com`,
  desc: `Alpha 설명 ${index + 1}`,
  category: index < 10 ? "learning" : "career",
  ages: ["elem"],
  subjects: [index < 10 ? "math" : "career"],
})).concat([
  {
    key: "naver",
    id: "naver",
    name: "네이버",
    url: "https://naver.com",
    desc: "대표 포털 사이트",
    category: "learning",
    ages: ["elem"],
    subjects: ["math"],
  },
  {
    key: "GoogleScholar",
    id: "GoogleScholar",
    name: "Google Scholar",
    url: "https://scholar.google.com",
    desc: "논문 검색",
    category: "info",
    ages: ["high"],
    subjects: ["general"],
  },
  {
    key: "RISS",
    id: "RISS",
    name: "RISS",
    url: "https://www.riss.kr",
    desc: "국내 논문 검색",
    category: "info",
    ages: ["high"],
    subjects: ["general"],
  },
]);

test.beforeEach(async ({ page }) => {
  await page.route("**/data/categories.json", async (route) => {
    await route.fulfill({ json: categoriesFixture });
  });

  await page.route("**/data/sites.json", async (route) => {
    await route.fulfill({ json: sitesFixture });
  });

  await page.route("**/script.google.com/**", async (route) => {
    await route.fulfill({ json: { items: {} } });
  });

  await page.route("**/cdn.jsdelivr.net/npm/fuse.js@*", async (route) => {
    await route.fulfill({
      contentType: "application/javascript",
      body: `
        window.Fuse = function(items) {
          this.search = function(query) {
            return items
              .filter((item) => String(item.name || "").toLowerCase().includes(String(query || "").toLowerCase()))
              .map((item) => ({ item }));
          };
        };
      `,
    });
  });

  await page.route("**/pretendard.css", async (route) => {
    await route.fulfill({ contentType: "text/css", body: "" });
  });
});

test("keeps the main page focused on cards and shows the restructured tips page", async ({ page }) => {
  const visibleCards = page.locator(".link-card:visible");

  await page.goto("/index.html");

  await expect(page.locator("#guideHubSection")).toHaveCount(0);
  await expect(page.locator("#searchAssistBar")).toHaveCount(0);
  await expect(page.locator("#itemsPerPage")).toHaveValue("5");
  await expect(page.locator(".tips-link-title")).toHaveText("자료 탐색 가이드");
  await expect(visibleCards).toHaveCount(9);
  await expect(page.locator("#filteredCount")).toHaveText("15");

  await page.locator(".top-menu > summary").click();
  await expect(page.locator('.top-menu-panel [data-menu-tips="true"]')).toHaveText("자료 탐색 가이드");

  await page.locator("#searchInput").fill("Alpha 1");
  await expect(page.locator("#filteredCount")).toHaveText("4");

  await page.locator("#searchInput").fill("네이버");
  await expect(page.locator("#filteredCount")).toHaveText("1");
  await expect(visibleCards).toHaveCount(1);
  await expect(visibleCards.first()).toContainText("네이버");

  await page.locator("#searchInput").fill("");
  await expect(page.locator("#filteredCount")).toHaveText("15");

  await page.evaluate(() => window.scrollTo({ top: 500, behavior: "auto" }));
  await page.locator(".detail-btn:visible").first().evaluate((button) => button.click());

  await expect(page.locator("#detailView")).toBeVisible();
  await expect(page.locator("#detailTitle")).toContainText("Alpha 1");

  await page.locator("#detailBackBtn").click();
  await expect(page.locator(".ui-scale-wrap")).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(400);

  await page.goto("/index.html#/tips");
  await expect(page.locator("#tipsView")).toHaveAttribute("aria-hidden", "false");
  await expect(page.locator("#tipsHeroTitle")).toHaveText("자료 탐색 가이드");
  await expect(page.locator(".tips-primary-tab")).toHaveCount(2);
  await expect(page.locator(".tips-primary-tab.is-active")).toHaveText("교과 가이드");
  await expect(page.locator("#tipsFilterPanel")).toHaveCount(0);
  await expect(page.locator('[data-subject-nav="math"]')).toBeVisible();
  await page.locator('[data-subject-nav="math"]').click();
  await expect(page.locator(".tips-panel-title")).toContainText("수학");

  await page.locator(".tips-mode-tab", { hasText: "고등" }).click();
  await expect(page).toHaveURL(/mode=high/);
  await expect(page.locator('[data-topic-nav="common_math_1"]')).toBeVisible();
  await expect(page.locator('[data-topic-nav="common_math_2"]')).toBeVisible();
  await expect(page.locator('[data-topic-nav="algebra"]')).toBeVisible();
  await expect(page.locator('[data-topic-nav="calculus"]')).toBeVisible();

  await page.locator('[data-topic-nav="calculus"]').click();
  await expect(page).toHaveURL(/topic=calculus/);
  await expect(page.locator(".tips-panel-title")).toContainText("미적분");

  await page.locator(".tips-primary-tab", { hasText: "실용 팁" }).click();
  await expect(page).toHaveURL(/tab=utility/);
  await expect(page.locator(".tips-primary-tab.is-active")).toHaveText("실용 팁");
  await expect(page.locator("#tipsUtilityFeatured")).toBeVisible();
  await expect(page.locator("#tipsUtilityFeatured")).toContainText("논문 사이트 학생 기준 무료로 보기");
  await expect(page.locator("#tipsUtilityFeatured")).toContainText("PPT 자료 찾는 팁");
  await expect(page.locator("#tipsUtilityAll")).toBeVisible();
  await expect(page.locator("#tipsUtilityDetailPanel")).toHaveCount(0);
  await expect(page.locator('[data-utility-category="all"]')).toHaveClass(/is-active/);
  await expect(page.locator('[data-utility-category="research"]')).toBeVisible();

  await page.locator('[data-utility-category="presentation"]').click();
  await expect(page).toHaveURL(/category=presentation/);
  await expect(page.locator('[data-utility-category="presentation"]')).toHaveClass(/is-active/);
  await page.locator('#tipsUtilityAll [data-guide-select="ppt-tip"]').click();
  await expect(page).toHaveURL(/#\/tips\/guide\/ppt-tip\?category=presentation/);
  await expect(page.locator("#tipsUtilityDetailPanel")).toContainText("PPT 자료 찾는 팁");
  await expect(page.locator("#tipsGuideBackBtn")).toBeVisible();

  await page.locator("#tipsGuideBackBtn").click();
  await expect(page).toHaveURL(/tab=utility&category=presentation/);
  await expect(page.locator("#tipsUtilityAll")).toContainText("PPT 자료 찾는 팁");

  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('#tipsUtilityAll [data-guide-select="ppt-tip"]').click();
  await expect(page.locator("#tipsUtilityDetailPanel")).toBeVisible();
  await expect(page.locator("#tipsGuideBackBtn")).toBeVisible();
  await page.locator("#tipsGuideBackBtn").click();

  await page.locator('#tipsView .tips-cta-button.primary').click();
  await expect(page.locator(".ui-scale-wrap")).toBeVisible();
  await expect(page).toHaveURL(/#\/$/);
});

test("commits the full Korean query after IME composition ends", async ({ page }) => {
  const visibleCards = page.locator(".link-card:visible");
  const koreanQuery = "네이버";
  const firstSyllable = "네";
  const secondSyllable = "이";
  const finalSyllable = "버";

  await page.goto("/index.html");
  await page.waitForFunction(() => window.setupEventListeners?.__initialized === true);

  await page.locator("#searchInput").evaluate((input, query) => {
    input.focus();
    input.value = "";

    input.dispatchEvent(new CompositionEvent("compositionstart", { bubbles: true, data: "" }));
    input.value = query;
    input.dispatchEvent(new InputEvent("input", {
      bubbles: true,
      data: query,
      inputType: "insertCompositionText",
      isComposing: true,
    }));
  }, firstSyllable);

  await expect.poll(() => page.evaluate(() => window.App?.store?.getState?.().currentSearchQuery)).toBe(firstSyllable);
  await expect(page.locator("#filteredCount")).toHaveText("3");
  await expect(visibleCards).toHaveCount(3);

  await page.locator("#searchInput").evaluate((input, values) => {
    input.value = values.partial;
    input.dispatchEvent(new InputEvent("input", {
      bubbles: true,
      data: values.delta,
      inputType: "insertCompositionText",
      isComposing: true,
    }));
  }, { partial: `${firstSyllable}${secondSyllable}`, delta: secondSyllable });

  await page.locator("#searchInput").evaluate((input, payload) => {
    input.value = payload.query;
    input.dispatchEvent(new CompositionEvent("compositionend", { bubbles: true, data: payload.finalSyllable }));
    input.dispatchEvent(new InputEvent("input", {
      bubbles: true,
      data: payload.finalSyllable,
      inputType: "insertText",
    }));
  }, { query: koreanQuery, finalSyllable });

  await expect(page.locator("#searchInput")).toHaveValue(koreanQuery);
  await expect(page.locator("#filteredCount")).toHaveText("1");
  await expect(visibleCards).toHaveCount(1);
});

test("persists retention dashboard actions without breaking list routing", async ({ page }) => {
  await page.goto("/index.html");
  await page.waitForFunction(() => window.setupEventListeners?.__initialized === true);

  await expect(page.locator("#retentionDashboard")).toBeVisible();
  await expect(page.locator(".retention-hero h2")).toHaveText("오늘도 유용한 사이트와 함께 시작해보세요!");
  await expect(page.locator(".retention-daily-section h2")).toHaveText("오늘의 추천 사이트");
  await expect(page.locator(".retention-recommend-card")).toHaveCount(4);
  await expect(page.locator(".retention-quick-tile")).toHaveCount(0);
  await expect(page.locator(".side-mypage-card")).toContainText("마이페이지");
  await expect(page.locator(".retention-recent-card")).toContainText("아직 열람한 사이트가 없습니다.");
  await expect(page.locator(".retention-saved-card")).toBeVisible();
  await expect(page.locator(".retention-dday-card")).toHaveCount(0);
  await expect(page.locator(".retention-mini-calendar-card")).toHaveCount(0);

  const firstCard = page.locator(".link-card:visible").first();
  await expect(firstCard).toContainText("Alpha 1");

  await firstCard.locator("[data-retention-action='bookmark']").click();
  await expect(firstCard.locator("[data-retention-action='bookmark']")).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("#retentionDashboard")).toContainText("Alpha 1");
  await expect.poll(() => page.evaluate(() => (
    JSON.parse(localStorage.getItem("ddakpilmo.retention.bookmarks.v1") || "[]")
  ))).toContain("alpha-1");
  await expect(firstCard.locator("[data-retention-action='pin']")).toHaveCount(0);

  await page.evaluate(() => {
    localStorage.setItem("ddakpilmo.retention.bookmarks.v1", JSON.stringify([
      "alpha-1",
      "alpha-2",
      "alpha-3",
      "alpha-4",
      "alpha-5",
      "alpha-6",
    ]));
    window.ddakpilmo?.retention?.renderDashboard?.();
  });
  await expect(page.locator(".retention-saved-card .retention-saved-item")).toHaveCount(5);
  await expect(page.locator(".retention-saved-card .retention-panel-toggle")).toHaveText("상세 보기");
  await page.locator(".retention-saved-card .retention-panel-toggle").click();
  await expect(page).toHaveURL(/#\/saved-sites/);
  await expect(page.locator("#retentionView")).toHaveAttribute("aria-hidden", "false");
  await expect(page.locator("#retentionView .retention-list-card")).toHaveCount(6);
  await expect(page.locator("#retentionView")).toContainText("저장한 사이트");
  await page.locator("#retentionView [data-retention-list-back]").click();
  await expect(page.locator(".ui-scale-wrap")).toBeVisible();

  await firstCard.locator(".detail-btn").click();
  await expect(page.locator("#detailView")).toBeVisible();
  await expect(page.locator("#detailTitle")).toContainText("Alpha 1");
  await expect(page.locator("#detailView [data-retention-action='bookmark']")).toHaveAttribute("aria-pressed", "true");
  await expect.poll(() => page.evaluate(() => (
    JSON.parse(localStorage.getItem("takpilmo_recent_sites") || "[]")[0]?.key
  ))).toBe("alpha-1");

  await page.locator("#detailBackBtn").click();
  await expect(page.locator(".ui-scale-wrap")).toBeVisible();
  await expect(page.locator(".retention-recent-card")).toContainText("Alpha 1");
  await expect(page.locator(".retention-recent-card .retention-recent-favicon")).toHaveCount(1);

  await page.evaluate(() => {
    const now = Date.now();
    localStorage.setItem("takpilmo_recent_sites", JSON.stringify([
      "alpha-1",
      "alpha-2",
      "alpha-3",
      "alpha-4",
      "alpha-5",
      "alpha-6",
    ].map((key, index) => ({ key, viewedAt: new Date(now - index * 60000).toISOString() }))));
    window.ddakpilmo?.retention?.renderDashboard?.();
  });
  await expect(page.locator(".retention-recent-card .retention-recent-item")).toHaveCount(5);
  await expect(page.locator(".retention-recent-card .retention-panel-toggle")).toHaveText("상세 보기");
  await page.locator(".retention-recent-card .retention-panel-toggle").click();
  await expect(page).toHaveURL(/#\/recent-sites/);
  await expect(page.locator("#retentionView")).toHaveAttribute("aria-hidden", "false");
  await expect(page.locator("#retentionView .retention-list-card")).toHaveCount(6);
  await expect(page.locator("#retentionView")).toContainText("최근 열람 사이트");
  await page.locator("#retentionView [data-retention-list-back]").click();
  await expect(page.locator(".ui-scale-wrap")).toBeVisible();

  await page.locator("[data-retention-mypage]").click();
  await expect(page.locator("#toastHost")).toContainText("마이페이지는 준비 중입니다.");
});
