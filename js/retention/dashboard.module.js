function storage() {
  return window.ddakpilmo?.retention?.storage;
}

function escapeHtml(value) {
  const escape = window.ddakpilmo?.utils?.escapeHtml || window.escapeHtml;
  if (typeof escape === "function") return escape(value);
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function siteKey(site) {
  return storage()?.normalizeSiteKey(site) || "";
}

function getCategoryName(site) {
  const key = site?.category || "";
  const getName = window.getCategoryName || window.ddakpilmo?.config?.getCategoryName;
  return typeof getName === "function" ? getName(key) : key;
}

function faviconFor(site, size = 64) {
  return `https://www.google.com/s2/favicons?sz=${size}&domain_url=${encodeURIComponent(site?.url || "")}`;
}

function formatViewedTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "방금 전";
  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.max(0, Math.floor(diffMs / 60000));
  if (diffMinutes < 1) return "방금 전";
  if (diffMinutes < 60) return `${diffMinutes}분 전`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}시간 전`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}일 전`;
  return `${date.getMonth() + 1}.${date.getDate()}`;
}

function syncSiteControls() {
  document.querySelectorAll("[data-retention-action='bookmark'][data-site-key]").forEach((button) => {
    const key = button.getAttribute("data-site-key") || "";
    const active = !!window.ddakpilmo?.retention?.bookmarks?.isBookmarked?.(key);
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", active ? "true" : "false");
    button.textContent = active ? "저장됨" : "저장";
  });
}

function renderDetailActions(container, site) {
  if (!container || !site) return;
  container.querySelectorAll(".retention-detail-action").forEach((node) => node.remove());
  const key = siteKey(site);
  if (!key) return;

  const button = document.createElement("button");
  button.type = "button";
  button.className = "detail-copy retention-detail-action retention-bookmark-btn";
  button.dataset.retentionAction = "bookmark";
  button.dataset.siteKey = key;
  button.setAttribute("aria-pressed", "false");
  button.textContent = "저장";
  container.appendChild(button);
  syncSiteControls();
}

function ensureHost() {
  const mainPanel = document.querySelector(".main-panel");
  if (!mainPanel) return null;
  let host = document.getElementById("retentionDashboard");
  if (host) return host;

  host = document.createElement("section");
  host.id = "retentionDashboard";
  host.className = "retention-dashboard";
  host.setAttribute("aria-label", "딱필모 홈 추천");
  const filters = mainPanel.querySelector(".filters");
  mainPanel.insertBefore(host, filters || mainPanel.firstChild);
  return host;
}

function ensureSupportHost() {
  const mainPanel = document.querySelector(".main-panel");
  if (!mainPanel) return null;
  let host = document.getElementById("retentionSupport");
  if (host) return host;

  host = document.createElement("section");
  host.id = "retentionSupport";
  host.className = "retention-support";
  host.setAttribute("aria-label", "딱필모 보조 정보");
  const categories = document.getElementById("categoriesContainer");
  if (categories?.parentElement === mainPanel) {
    categories.insertAdjacentElement("afterend", host);
  } else {
    mainPanel.appendChild(host);
  }
  return host;
}

function isMobileHomeLayout() {
  return !!window.matchMedia?.("(max-width: 900px)")?.matches;
}

function renderHero() {
  return `
    <section class="retention-hero" aria-label="오늘의 시작">
      <div class="retention-hero-copy">
        <p class="retention-kicker">딱필모 추천</p>
        <h2>오늘도 유용한 사이트와 함께 시작해보세요!</h2>
        <p>학습, 과제, 진로 탐색에 필요한 사이트를 빠르게 찾아보세요.</p>
      </div>
      <div class="retention-hero-art" aria-hidden="true">
        <span class="retention-art-card retention-art-card-a"></span>
        <span class="retention-art-card retention-art-card-b"></span>
        <span class="retention-art-person">✦</span>
      </div>
    </section>
  `;
}

function renderRecommendationCard(site) {
  const key = siteKey(site);
  return `
    <article class="retention-recommend-card">
      <img class="retention-recommend-favicon" src="${faviconFor(site, 96)}" alt="" loading="lazy" />
      <h3>${escapeHtml(site?.name || key)}</h3>
      <span class="retention-category-pill">${escapeHtml(getCategoryName(site))}</span>
      <p>${escapeHtml(site?.desc || "사이트 설명을 확인해보세요.")}</p>
      <div class="retention-recommend-actions">
        <a class="retention-primary-link" href="${escapeHtml(site?.url || "#")}" target="_blank" rel="noopener noreferrer" data-retention-visit="${escapeHtml(key)}">바로가기</a>
        <a class="retention-secondary-link" href="#site=${encodeURIComponent(key)}">상세 설명</a>
      </div>
    </article>
  `;
}

function renderDailyRecommendations(sites) {
  return `
    <section class="retention-section retention-daily-section">
      <div class="retention-section-head">
        <div>
          <h2>오늘의 추천 사이트</h2>
          <p>매일 업데이트되는 추천 사이트를 확인해보세요!</p>
        </div>
      </div>
      <div class="retention-recommend-grid">
        ${sites.length
          ? sites.map(renderRecommendationCard).join("")
          : '<p class="retention-empty">추천할 사이트를 불러오는 중입니다.</p>'
        }
      </div>
    </section>
  `;
}

function renderRecentSites() {
  const s = storage();
  const allRecentItems = window.ddakpilmo?.retention?.recent?.getRecentItems?.() || [];
  const limit = 5;
  const recentItems = allRecentItems.slice(0, limit);
  const sites = s?.resolveSites?.(recentItems.map((item) => item.key), limit) || [];
  const byKey = new Map(sites.map((site) => [siteKey(site), site]));

  return `
    <section class="retention-card retention-recent-card retention-mini-card">
      <div class="retention-panel-head">
        <h2>최근 열람 사이트</h2>
        ${allRecentItems.length > 5 ? `
          <a class="retention-panel-toggle" href="#/recent-sites">상세 보기</a>
        ` : ""}
      </div>
      <div class="retention-recent-list">
        ${recentItems.length
          ? recentItems.map((item) => {
            const site = byKey.get(item.key);
            if (!site) return "";
            return `
              <a class="retention-recent-item" href="#site=${encodeURIComponent(siteKey(site))}">
                <img class="retention-recent-favicon" src="${faviconFor(site, 64)}" alt="" loading="lazy" />
                <span class="retention-recent-title">${escapeHtml(site.name || item.key)}</span>
                <span class="retention-category-pill">${escapeHtml(getCategoryName(site))}</span>
                <time>${escapeHtml(formatViewedTime(item.viewedAt))}</time>
              </a>
            `;
          }).join("")
          : '<p class="retention-empty">아직 열람한 사이트가 없습니다.</p>'
        }
      </div>
    </section>
  `;
}

function renderSavedSites() {
  const s = storage();
  const keys = window.ddakpilmo?.retention?.bookmarks?.getBookmarkKeys?.() || [];
  const limit = 5;
  const sites = s?.resolveSites?.(keys, limit) || [];

  return `
    <section class="retention-card retention-saved-card retention-mini-card">
      <div class="retention-saved-head">
        <div>
          <h2>저장한 사이트</h2>
          <p>나중에 다시 볼 사이트를 모아둡니다.</p>
        </div>
        <div class="retention-saved-actions">
          <span>${keys.length}</span>
          ${keys.length > 5 ? `
            <a class="retention-panel-toggle" href="#/saved-sites">상세 보기</a>
          ` : ""}
        </div>
      </div>
      <div class="retention-saved-list">
        ${sites.length
          ? sites.map((site) => `
            <a class="retention-saved-item" href="#site=${encodeURIComponent(siteKey(site))}">
              <img class="retention-recent-favicon" src="${faviconFor(site, 64)}" alt="" loading="lazy" />
              <span>${escapeHtml(site.name || siteKey(site))}</span>
              <small>${escapeHtml(getCategoryName(site))}</small>
            </a>
          `).join("")
          : '<p class="retention-empty">아직 저장한 사이트가 없습니다.</p>'
        }
      </div>
    </section>
  `;
}

function renderSupportWidgets() {
  return `
    <aside class="retention-side-column" aria-label="보조 정보">
      ${renderSavedSites()}
      ${renderRecentSites()}
    </aside>
  `;
}

function getSavedCollection() {
  const s = storage();
  const keys = window.ddakpilmo?.retention?.bookmarks?.getBookmarkKeys?.() || [];
  return s?.resolveSites?.(keys, 200) || [];
}

function getRecentCollection() {
  const s = storage();
  const recentItems = window.ddakpilmo?.retention?.recent?.getRecentItems?.() || [];
  const sites = s?.resolveSites?.(recentItems.map((item) => item.key), 200) || [];
  const byKey = new Map(sites.map((site) => [siteKey(site), site]));
  return recentItems
    .map((item) => ({ item, site: byKey.get(item.key) }))
    .filter((entry) => entry.site);
}

function renderCollectionCard(site, viewedAt = "") {
  const key = siteKey(site);
  return `
    <article class="retention-list-card">
      <img class="retention-list-favicon" src="${faviconFor(site, 96)}" alt="" loading="lazy" />
      <div class="retention-list-card-main">
        <h3>${escapeHtml(site?.name || key)}</h3>
        <p>${escapeHtml(site?.desc || "사이트 설명을 확인해보세요.")}</p>
        <div class="retention-list-card-meta">
          <span class="retention-category-pill">${escapeHtml(getCategoryName(site))}</span>
          ${viewedAt ? `<time>${escapeHtml(formatViewedTime(viewedAt))}</time>` : ""}
        </div>
      </div>
      <div class="retention-list-card-actions">
        <a class="retention-secondary-link" href="#site=${encodeURIComponent(key)}">상세 설명</a>
        <a class="retention-primary-link" href="${escapeHtml(site?.url || "#")}" target="_blank" rel="noopener noreferrer" data-retention-visit="${escapeHtml(key)}">바로가기</a>
      </div>
    </article>
  `;
}

function renderCollectionView(type) {
  const view = document.getElementById("retentionView");
  if (!view) return;
  const isRecent = type === "recent";
  const entries = isRecent ? getRecentCollection() : getSavedCollection();
  const title = isRecent ? "최근 열람 사이트" : "저장한 사이트";
  const desc = isRecent
    ? "최근에 상세 설명이나 바로가기로 열어본 사이트를 모았습니다."
    : "저장해둔 사이트를 한곳에서 확인하세요.";
  const empty = isRecent ? "아직 열람한 사이트가 없습니다." : "아직 저장한 사이트가 없습니다.";

  view.innerHTML = `
    <div class="retention-list-header">
      <button type="button" class="detail-back" data-retention-list-back>← 목록</button>
      <div>
        <p class="retention-kicker">딱필모 보관함</p>
        <h2>${escapeHtml(title)}</h2>
        <p>${escapeHtml(desc)}</p>
      </div>
      <span>${entries.length}개</span>
    </div>
    <div class="retention-list-grid">
      ${entries.length
        ? entries.map((entry) => isRecent
          ? renderCollectionCard(entry.site, entry.item.viewedAt)
          : renderCollectionCard(entry)
        ).join("")
        : `<p class="retention-empty">${escapeHtml(empty)}</p>`
      }
    </div>
  `;
}

function renderDashboard() {
  const host = ensureHost();
  const supportHost = ensureSupportHost();
  const s = storage();
  if (!host || !s) return;
  const sites = s.getSites();
  if (!sites.length) {
    host.hidden = true;
    if (supportHost) supportHost.hidden = true;
    return;
  }

  const dailySites = window.ddakpilmo?.retention?.daily?.getDailyRecommendations?.(4) || [];
  const mobileLayout = isMobileHomeLayout();

  host.hidden = false;
  if (supportHost) {
    supportHost.hidden = !mobileLayout;
    supportHost.innerHTML = mobileLayout ? renderSupportWidgets() : "";
  }
  host.innerHTML = `
    <div class="retention-shell ${mobileLayout ? "is-mobile-layout" : ""}">
      <div class="retention-main-column">
        ${renderHero()}
        ${renderDailyRecommendations(dailySites)}
      </div>
      ${mobileLayout ? "" : renderSupportWidgets()}
    </div>
  `;
  syncSiteControls();
}

function handleRetentionAction(action, key) {
  if (action === "bookmark") {
    window.ddakpilmo?.retention?.bookmarks?.toggleBookmark?.(key);
    return true;
  }
  return false;
}

function setupDashboardEvents() {
  if (setupDashboardEvents.__initialized) return;
  setupDashboardEvents.__initialized = true;
  let resizeFrame = 0;

  document.addEventListener("click", (event) => {
    const visit = event.target.closest("[data-retention-visit]");
    if (visit) {
      window.ddakpilmo?.retention?.recent?.recordRecentSite?.(visit.getAttribute("data-retention-visit"));
      return;
    }

    const mypage = event.target.closest("[data-retention-mypage]");
    if (mypage) {
      event.preventDefault();
      window.showToast?.("마이페이지는 준비 중입니다.");
      return;
    }

    const listBack = event.target.closest("[data-retention-list-back]");
    if (listBack) {
      event.preventDefault();
      location.hash = "#/";
    }
  });

  window.addEventListener("ddakpilmo:retention-change", renderDashboard);
  window.addEventListener("resize", () => {
    if (resizeFrame) cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(() => {
      resizeFrame = 0;
      renderDashboard();
    });
  }, { passive: true });
}

export function installRetentionDashboard() {
  window.ddakpilmo = window.ddakpilmo || {};
  window.ddakpilmo.retention = window.ddakpilmo.retention || {};
  window.ddakpilmo.retention.renderDashboard = renderDashboard;
  window.ddakpilmo.retention.renderCollectionView = renderCollectionView;
  window.ddakpilmo.retention.syncSiteControls = syncSiteControls;
  window.ddakpilmo.retention.renderDetailActions = renderDetailActions;
  window.ddakpilmo.retention.handleAction = handleRetentionAction;

  setupDashboardEvents();

  if (window.initRunner?.add) {
    window.initRunner.add(
      "retention:render-dashboard",
      () => renderDashboard(),
      { after: ["ui:request-render"] }
    );
  } else {
    setTimeout(renderDashboard, 0);
  }

  if (window.App?.store?.subscribe) {
    window.App.store.subscribe(() => {
      requestAnimationFrame(() => {
        renderDashboard();
        if (location.hash.startsWith("#/saved-sites")) renderCollectionView("saved");
        if (location.hash.startsWith("#/recent-sites")) renderCollectionView("recent");
      });
    });
  }

  return { renderDashboard, renderCollectionView, syncSiteControls, renderDetailActions };
}
