// Card rendering helpers extracted from main.js
(function () {
  function getConfigRefs() {
    const cfg = window.ddakpilmo?.config || {};
    return {
      ageNames:
        window.ageNames ||
        cfg.ageNames ||
        {},
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

  function createSiteCard(site) {
    const refs = getConfigRefs();
    const card = document.createElement("div");
    card.className = "link-card";

    const siteKey = site.key;
    const siteId = site.id;

    if (site.key) card.dataset.key = String(site.key);
    if (siteKey) card.dataset.key = siteKey;
    if (siteId) card.dataset.id = siteId;

    card.setAttribute("role", "button");
    card.setAttribute("tabindex", "0");

    const faviconUrl = "https://www.google.com/s2/favicons?sz=64&domain_url=" + encodeURIComponent(site.url || "");
    const left = document.createElement("div");
    left.className = "card-left";

    const img = document.createElement("img");
    img.src = faviconUrl;
    img.alt = (site.name || "") + " favicon";
    img.className = "site-favicon";
    img.loading = "lazy";
    img.onerror = function () {
      const fallback = document.createElement("div");
      fallback.className = "fallback-icon";
      fallback.textContent = site.name && site.name.length > 0 ? site.name.charAt(0).toUpperCase() : "?";
      img.replaceWith(fallback);
    };
    left.appendChild(img);

    const right = document.createElement("div");
    right.className = "card-right";

    const header = document.createElement("div");
    header.className = "link-card-header";

    const a = document.createElement("a");
    a.href = site.url || "#";
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.className = "site-title";
    const safeHighlight = (text) => {
      if (typeof refs.highlightSearchTerms === "function") {
        return refs.highlightSearchTerms(text, window.state?.currentSearchQuery);
      }
      return refs.escapeHtml(text || "");
    };
    a.innerHTML = safeHighlight(site.name || "이름 없음");

    if (site.isGov === true) {
      const govIcon = document.createElement("img");
      govIcon.className = "gov-flag korea-gov";
      govIcon.src = window.GOV_ICON_DATA_URL || "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Emblem_of_the_Government_of_the_Republic_of_Korea.svg/250px-Emblem_of_the_Government_of_the_Republic_of_Korea.svg.png";
      govIcon.alt = "대한민국 정부 로고";
      a.appendChild(govIcon);
    }

    const shareBtn = document.createElement("button");
    shareBtn.className = "share-btn";
    shareBtn.type = "button";
    shareBtn.textContent = "공유";
    shareBtn.onclick = (e) => {
      e.stopPropagation();
      if (typeof shareSite === "function") shareSite(site.name || "", site.url || "");
    };
    card.appendChild(shareBtn);

    header.appendChild(a);

    const detailBtn = document.createElement("button");
    detailBtn.className = "detail-btn";
    detailBtn.type = "button";
    detailBtn.textContent = "상세 설명";
    card.appendChild(detailBtn);

    const desc = document.createElement("p");
    desc.className = "site-desc";
    desc.innerHTML = safeHighlight(site.desc || "설명이 없습니다.");

    const tags = document.createElement("div");
    tags.className = "link-card-tags";

    const catTag = document.createElement("span");
    catTag.className = "tag category-tag";
    catTag.textContent = refs.getCategoryName(site.category);
    tags.appendChild(catTag);

    (site.ages || []).forEach((age) => {
      const t = document.createElement("span");
      t.className = "tag age-tag";
      t.textContent = refs.ageNames[age] || age;
      tags.appendChild(t);
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
      if (!header) return;

      let shareBtn = card.querySelector(".share-btn");
      if (!shareBtn) {
        shareBtn = document.createElement("button");
        shareBtn.className = "share-btn";
        shareBtn.textContent = "공유";
        shareBtn.title = "링크 공유";
        shareBtn.onclick = (e) => {
          e.stopPropagation();
          shareSite(site?.name || "", site?.url || "");
        };
        card.appendChild(shareBtn);
      }

      card.querySelectorAll(".gov-badge, .gov-tag, .gov-flag").forEach((el) => el.remove());
      if (!site || site.isGov !== true) return;

      const title = header.querySelector(".site-title");
      if (!title) return;

      const govIcon = document.createElement("img");
      govIcon.className = "gov-flag korea-gov";
      govIcon.src = typeof GOV_ICON_DATA_URL !== "undefined" ? GOV_ICON_DATA_URL : (window.GOV_ICON_DATA_URL || "");
      govIcon.alt = "대한민국 정부 로고";
      govIcon.title = "대한민국 정부 운영";
      title.appendChild(govIcon);
    } catch (e) {
      console.warn("ensureGovMarkers failed", e);
    }
  }

  function buildCardsFragment(sitesSlice) {
    const frag = document.createDocumentFragment();

    for (const site of sitesSlice) {
      const card = createSiteCard(site);

      if (site?.id) card.dataset.id = site.id;

      if (!card.querySelector(".detail-btn")) {
        const detailBtn = document.createElement("button");
        detailBtn.className = "detail-btn";
        detailBtn.type = "button";
        detailBtn.textContent = "상세";
        card.appendChild(detailBtn);
      }

      try {
        if (typeof ensureGovMarkers === "function") ensureGovMarkers(card, site);
      } catch {}

      const img = card.querySelector?.("img");
      if (img && !img.loading) img.loading = "lazy";
      frag.appendChild(card);
    }

    return frag;
  }

  window.createSiteCard = createSiteCard;
  window.ensureGovMarkers = ensureGovMarkers;
  window.buildCardsFragment = buildCardsFragment;
})();
