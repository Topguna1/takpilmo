function getConfigRefs() {
  const cfg = window.ddakpilmo?.config || {};
  return {
    ageNames: window.ageNames || cfg.ageNames || {},
    getCategoryName:
      window.getCategoryName ||
      cfg.getCategoryName ||
      ((key) => String(key || "")),
    highlightSearchTerms:
      window.ddakpilmo?.search?.highlightSearchTerms ||
      window.highlightSearchTerms ||
      null,
    escapeHtml:
      window.ddakpilmo?.utils?.escapeHtml ||
      window.escapeHtml ||
      ((value) => String(value ?? "")),
  };
}

function getCurrentQuery() {
  return window.App?.store?.getState?.().currentSearchQuery || window.state?.currentSearchQuery || "";
}

function createRetentionAction(action, site) {
  const key = String(site?.key || site?.id || site?.url || site?.name || "").trim();
  const active = action === "bookmark"
    ? !!window.ddakpilmo?.retention?.bookmarks?.isBookmarked?.(key)
    : false;
  const button = document.createElement("button");
  button.className = `retention-card-action retention-${action}-btn`;
  button.classList.toggle("is-active", active);
  button.type = "button";
  button.dataset.retentionAction = action;
  button.dataset.siteKey = key;
  button.setAttribute("aria-pressed", active ? "true" : "false");
  button.textContent = active ? "저장됨" : "저장";
  return button;
}

function createSiteCard(site) {
  const refs = getConfigRefs();
  const card = document.createElement("article");
  card.className = "link-card";

  if (site?.key) card.dataset.key = String(site.key);
  if (site?.id) card.dataset.id = String(site.id);

  const faviconUrl = `https://www.google.com/s2/favicons?sz=64&domain_url=${encodeURIComponent(site?.url || "")}`;
  const left = document.createElement("div");
  left.className = "card-left";

  const img = document.createElement("img");
  img.src = faviconUrl;
  img.alt = `${site?.name || ""} favicon`;
  img.className = "site-favicon";
  img.loading = "lazy";
  img.onerror = function () {
    const fallback = document.createElement("div");
    fallback.className = "fallback-icon";
    fallback.textContent = site?.name?.length ? site.name.charAt(0).toUpperCase() : "?";
    img.replaceWith(fallback);
  };
  left.appendChild(img);

  const right = document.createElement("div");
  right.className = "card-right";

  const header = document.createElement("div");
  header.className = "link-card-header";

  const titleLink = document.createElement("a");
  titleLink.href = site?.url || "#";
  titleLink.target = "_blank";
  titleLink.rel = "noopener noreferrer";
  titleLink.className = "site-title";
  titleLink.dataset.retentionVisit = String(site?.key || site?.id || site?.url || site?.name || "").trim();
  titleLink.innerHTML =
    typeof refs.highlightSearchTerms === "function"
      ? refs.highlightSearchTerms(site?.name || "이름 없음", getCurrentQuery())
      : refs.escapeHtml(site?.name || "이름 없음");

  if (site?.isGov === true) {
    const govIcon = document.createElement("img");
    govIcon.className = "gov-flag korea-gov";
    govIcon.src =
      window.GOV_ICON_DATA_URL ||
      "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Emblem_of_the_Government_of_the_Republic_of_Korea.svg/250px-Emblem_of_the_Government_of_the_Republic_of_Korea.svg.png";
    govIcon.alt = "정부 운영";
    titleLink.appendChild(govIcon);
  }

  const actions = document.createElement("div");
  actions.className = "link-card-actions";

  const detailBtn = document.createElement("button");
  detailBtn.className = "detail-btn";
  detailBtn.type = "button";
  detailBtn.textContent = "상세 설명";

  const shareBtn = document.createElement("button");
  shareBtn.className = "share-btn";
  shareBtn.type = "button";
  shareBtn.textContent = "공유";

  actions.appendChild(detailBtn);
  actions.appendChild(shareBtn);
  actions.appendChild(createRetentionAction("bookmark", site));
  header.appendChild(titleLink);
  header.appendChild(actions);

  const desc = document.createElement("p");
  desc.className = "site-desc";
  desc.innerHTML =
    typeof refs.highlightSearchTerms === "function"
      ? refs.highlightSearchTerms(site?.desc || "설명이 없습니다.", getCurrentQuery())
      : refs.escapeHtml(site?.desc || "설명이 없습니다.");

  const tags = document.createElement("div");
  tags.className = "link-card-tags";

  const catTag = document.createElement("span");
  catTag.className = "tag category-tag";
  catTag.textContent = refs.getCategoryName(site?.category);
  tags.appendChild(catTag);

  (site?.ages || []).forEach((age) => {
    const tag = document.createElement("span");
    tag.className = "tag age-tag";
    tag.textContent = refs.ageNames[age] || age;
    tags.appendChild(tag);
  });

  right.appendChild(header);
  right.appendChild(desc);
  right.appendChild(tags);

  card.appendChild(left);
  card.appendChild(right);
  return card;
}

function ensureGovMarkers(card, site) {
  try {
    const header = card.querySelector(".link-card-header");
    const title = header?.querySelector(".site-title");
    if (!title) return;

    card.querySelectorAll(".gov-badge, .gov-tag, .gov-flag").forEach((el) => el.remove());
    if (!site || site.isGov !== true) return;

    const govIcon = document.createElement("img");
    govIcon.className = "gov-flag korea-gov";
    govIcon.src = window.GOV_ICON_DATA_URL || "";
    govIcon.alt = "정부 운영";
    govIcon.title = "정부 운영";
    title.appendChild(govIcon);
  } catch (error) {
    console.warn("ensureGovMarkers failed", error);
  }
}

function buildCardsFragment(sitesSlice) {
  const frag = document.createDocumentFragment();
  for (const site of sitesSlice) {
    const card = createSiteCard(site);
    try {
      ensureGovMarkers(card, site);
    } catch {}
    const img = card.querySelector("img");
    if (img && !img.loading) img.loading = "lazy";
    frag.appendChild(card);
  }
  return frag;
}

export function installCards() {
  if (typeof window.createSiteCard === "function" && typeof window.buildCardsFragment === "function") {
    return {
      createSiteCard: window.createSiteCard,
      ensureGovMarkers: window.ensureGovMarkers,
      buildCardsFragment: window.buildCardsFragment,
    };
  }

  window.createSiteCard = createSiteCard;
  window.ensureGovMarkers = ensureGovMarkers;
  window.buildCardsFragment = buildCardsFragment;
  return { createSiteCard, ensureGovMarkers, buildCardsFragment };
}
