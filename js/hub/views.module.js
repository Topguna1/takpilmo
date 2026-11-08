import { feeLabel } from './fee-label.module.js';
import { homeView } from "./home.module.js";
import { AGES, SUBJECTS, GROUPS, esc, safeUrl, keyOf, urlFor, asList, operatorLabel } from "./model.module.js";
function createViews(ctx) {
  const { detail, categories, saved, sites } = ctx;
  const categoryName = (key) => categories[key]?.name || key || "\uB2E4\uBAA9\uC801";
  const detailUrl = (site) => `#site=${encodeURIComponent(keyOf(site))}`;
  const favicon = (site) => `<img class="favicon" src="https://www.google.com/s2/favicons?sz=64&amp;domain_url=${encodeURIComponent(safeUrl(site.url))}" alt="" loading="lazy" data-fallback="${esc(site.name?.slice(0, 1) || "\xB7")}">`;

  const bookmark = (site) => `<button class="bookmark" data-save="${esc(keyOf(site))}" aria-label="${esc(site.name)} \uC800\uC7A5" aria-pressed="${saved(keyOf(site))}">${saved(keyOf(site)) ? "\uC800\uC7A5\uB428" : "\uC800\uC7A5"}</button>`;
  const visit = (site, primary = false) => safeUrl(site.url) ? `<a class="${primary ? "button primary" : "external"}" href="${esc(safeUrl(site.url))}" target="_blank" rel="noopener noreferrer" data-visit="${esc(keyOf(site))}" aria-label="${esc(site.name)} \uC0C8 \uD0ED\uC5D0\uC11C \uBC29\uBB38">${primary ? "\uC0AC\uC774\uD2B8 \uBC29\uBB38" : "\uBC14\uB85C\uAC00\uAE30"} \u2197</a>` : '<span class="muted">\uC8FC\uC18C \uBBF8\uD655\uC778</span>';
  const highlight = (text, query) => {
    if (!query || !String(text).toLowerCase().includes(query.toLowerCase())) return esc(text);
    const start = String(text).toLowerCase().indexOf(query.toLowerCase());
    return esc(text.slice(0, start)) + "<mark>" + esc(text.slice(start, start + query.length)) + "</mark>" + esc(text.slice(start + query.length));
  };
  function card(site, query = "", reason = "") {
    const d = detail(site), verified = operatorLabel(d);
    const url = safeUrl(site.url);
    const domain = url ? new URL(url).hostname.replace(/^www\./, '') : '주소 미확인';
    const uses = asList(d.mainUses).slice(0, 2);
    const useCase = asList(d.useCases)[0];
    const subjects = (site.subjects || []).map(key => SUBJECTS[key] || key);
    const checked = safeUrl(d.sourceUrl) && /^\d{4}-\d{2}-\d{2}$/.test(d.verifiedAt || '');
    return `<article class="site-card" data-site="${esc(keyOf(site))}">
      ${reason ? `<p class="recommend-reason">${esc(reason)}</p>` : ''}
      <div class="card-category-line"><span>${esc(categoryName(site.category))}</span><span class="operator-pill${verified ? ' is-verified' : ''}">${esc(verified || '운영 주체 미확인')}</span></div>
      <div class="card-top">${favicon(site)}<div class="card-identity"><h3><a data-detail href="${detailUrl(site)}">${highlight(site.name, query)}</a></h3><span class="card-domain">${esc(domain)}</span></div>${bookmark(site)}</div>
      <p class="site-desc">${highlight(String(d.summary || site.desc || '소개 정보 미확인'), query)}</p>
      ${uses.length || useCase ? `<p class="card-use"><span>이럴 때</span> ${esc(uses.length ? uses.join(' · ') : useCase)}</p>` : ''}
      <div class="card-tags"><span class="tag">${esc(site.ages?.length ? site.ages.map(a => AGES[a] || a).join('·') : '대상 미확인')}</span>${subjects.length ? `<span class="tag" title="${esc(subjects.join(' · '))}">${esc(subjects.slice(0,3).join(' · '))}${subjects.length > 3 ? ` 외 ${subjects.length-3}` : ''}</span>` : ''}<span class="tag fee-tag" title="${esc(d.fee || "이용료 정보 미확인")}">${esc(feeLabel(d.fee))}</span></div>
      <div class="card-source"><span>${checked ? `정보 확인 ${esc(d.verifiedAt)}` : '출처·확인일 미등록'}</span>${d.operatorName ? `<span title="${esc(d.operatorName)}">${esc(d.operatorName)}</span>` : ''}</div>
      <div class="card-actions"><a data-detail href="${detailUrl(site)}">상세정보 <span aria-hidden="true">→</span></a>${visit(site)}</div>
    </article>`;
  }
  const empty = (message, link = "#/sites", label = "\uC0AC\uC774\uD2B8 \uBAA8\uC74C \uBCF4\uAE30") => `<div class="empty"><p>${esc(message)}</p><a class="button" href="${esc(link)}">${esc(label)}</a></div>`;
  const options = (map, value, allLabel = "\uC804\uCCB4") => `<option value="all"${value === "all" ? " selected" : ""}>${allLabel}</option>` + Object.entries(map).map(([k, v]) => `<option value="${esc(k)}"${value === k ? " selected" : ""}>${esc(typeof v === "string" ? v : v.name)}</option>`).join("");
  function searchForm(id, value = "", isHome = false) {
    return `<form class="search-form" data-search="${isHome ? "home" : "list"}" role="search"><div class="search-wrap"><input type="search" id="${id}" name="q" value="${esc(value)}" placeholder="\uC0AC\uC774\uD2B8\uBA85\uC774\uB098 \uC6A9\uB3C4 \uAC80\uC0C9" aria-label="\uB4F1\uB85D\uB41C \uC0AC\uC774\uD2B8 \uAC80\uC0C9" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="suggestions" autocomplete="off" maxlength="200"><div id="suggestions" class="suggestions" role="listbox" hidden></div></div><button class="primary" type="submit">\uAC80\uC0C9</button></form>`;
  }
  function home(recent, savedSites = []) {
    const recentHtml = recent.length ? '<section class="home-recent"><div class="section-intro"><h2>최근 본 사이트</h2><a class="button" href="#/recent-sites">최근 본 사이트 전체 보기 →</a></div><div class="card-grid">' + recent.slice(0,3).map(s => card(s)).join('') + '</div></section>' : '';
    const savedHtml = savedSites.length ? '<section class="home-saved" aria-label="저장한 사이트"><div class="section-intro"><h3>저장한 사이트</h3><a href="#/saved-sites">보관함 전체 보기 →</a></div><div class="card-grid">' + savedSites.map(s => card(s)).join('') + '</div></section>' : '';
    return homeView({search:searchForm('homeSearch','',true), recent:recentHtml, saved:savedHtml, count:sites.length});
  }
  function activeFilters(s) {
    const link = (patch) => urlFor("sites", { ...s, ...patch, page: 1 });
    const active = Object.entries({ q: s.q, group: s.group, category: s.category, age: s.age, subject: s.subject, gov: s.gov }).filter(([, v]) => v && v !== "all");
    const labels = { q: s.q, group: GROUPS[s.group]?.name, category: categoryName(s.category), age: AGES[s.age], subject: SUBJECTS[s.subject], gov: "\uACF5\uACF5 \uC6B4\uC601 \uBD84\uB958" };
    return `<div class="active-filters">${active.map(([k]) => `<a href="${esc(link({ ...{ [k]: k === "q" ? "" : "all" }, ...k === "group" ? { category: "all" } : {} }))}" aria-label="${esc(labels[k])} \uC870\uAC74 \uD574\uC81C">${esc(labels[k])} \xD7</a>`).join("")}</div>`;
  }
  function list(s, results) {
    const link = (patch) => urlFor("sites", { ...s, ...patch, page: patch.page || 1 });
    const groupLinks = [["all", "\uC804\uCCB4"], ...Object.entries(GROUPS).map(([k, v]) => [k, v.name])].map(([k, v]) => `<a class="button" href="${esc(link({ group: k, category: "all" }))}"${s.group === k ? ' aria-current="true"' : ""}>${esc(v)}</a>`).join("");
    const subs = s.group !== "all" ? GROUPS[s.group].categories.filter((k) => categories[k]) : [];
    return `<section class="catalog-page"><div class="catalog-heading"><p class="eyebrow">THE RESOURCE LIBRARY</p><h1>필요한 순간, <em>딱 맞는 사이트.</em></h1></div><p class="lead">\uC774\uB984\uC774\uB098 \uC6A9\uB3C4\uB85C \uAC80\uC0C9\uD558\uACE0, \uB098\uC5D0\uAC8C \uB9DE\uB294 \uC0AC\uC774\uD2B8\uB97C \uACE8\uB77C\uBCF4\uC138\uC694.</p><div class="catalog-search">${searchForm("searchInput", s.q)}</div>
      <div class="category-toolbar"><nav class="group-tabs desktop-categories" aria-label="목적별 카테고리">${groupLinks}</nav><button class="mobile-category" data-panel="categories">${esc(GROUPS[s.group]?.name || "전체 카테고리")} ▾</button><button type="button" id="allCategoriesToggle" aria-expanded="false" aria-controls="allCategories">전체 카테고리 보기 <span aria-hidden="true">▾</span></button></div>
      <nav id="allCategories" class="all-categories" aria-label="전체 사이트 카테고리" hidden><a class="button" href="${esc(link({group:'all',category:'all'}))}">전체</a>${Object.entries(categories).map(([key,value])=>`<a class="button" href="${esc(link({group:'all',category:key}))}"${s.category===key?' aria-current="page"':''}>${esc(value.icon || '')} ${esc(value.name)}</a>`).join('')}</nav>
      ${subs.length ? `<nav class="sub-tabs" aria-label="\uC138\uBD80 \uCE74\uD14C\uACE0\uB9AC"><a class="button" href="${esc(link({ category: "all" }))}"${s.category === "all" ? ' aria-current="true"' : ""}>\uC804\uCCB4</a>${subs.map((k) => `<a class="button" href="${esc(link({ category: k }))}"${s.category === k ? ' aria-current="true"' : ""}>${esc(categoryName(k))}</a>`).join("")}</nav>` : ""}
      <div class="filter-row"><label>추천 학교급<select id="ageFilter" data-filter="age">${options(AGES, s.age, "\uC804\uCCB4 \uD559\uAD50\uAE09")}</select></label><label>\uACFC\uBAA9<select id="subjectFilter" data-filter="subject">${options(SUBJECTS, s.subject, "\uC804\uCCB4 \uACFC\uBAA9")}</select></label><label>공공 운영<select id="govFilter" data-filter="gov">${options({gov:"정부·공공기관"}, s.gov, "전체 운영")}</select></label><button type="button" class="extra filter-reset" id="resetFilters" data-reset-filters>↺ 필터 초기화</button></div>
      <p class="muted">학교급은 추천 대상이며 가입 가능 연령과 다를 수 있어요.</p>
      ${activeFilters(s)}
      <div id="listResults">${listResults(s, results)}</div><p class="help-link"><a href="#/info">공부에 도움이 되는 딱필 정보 읽어보기 →</a></p></section>`;
  }
  function listResults(s, results) {
    const page = Math.min(s.page, Math.max(1, Math.ceil(results.length / 12)));
    const max = Math.max(1, Math.ceil(results.length / 12));
    const pages = [.../* @__PURE__ */ new Set([1, page - 1, page, page + 1, max])].filter((p) => p > 0 && p <= max).sort((a, b) => a - b);
    const link = (patch) => urlFor("sites", { ...s, ...patch });
    return `<p class="results-header" role="status">\uC870\uAC74\uC5D0 \uB9DE\uB294 \uC0AC\uC774\uD2B8 <strong id="filteredCount">${results.length}\uAC1C</strong>${results.length ? `<span class="page-position">${page} / ${max} 페이지</span>` : ""}</p>${results.length < 4 && s.age !== "all" ? `<p class="data-source-notice">다른 학교급의 자료도 살펴보세요. <a href="${esc(link({age:"all",page:1}))}">학교급 조건만 해제</a></p>` : ""}${results.length ? `<div class="card-grid">${results.slice((page - 1) * 12, page * 12).map((site) => card(site, s.q)).join("")}</div>` : empty("\uC870\uAC74\uC5D0 \uB9DE\uB294 \uC0AC\uC774\uD2B8\uAC00 \uC5C6\uC5B4\uC694. \uAC80\uC0C9\uC5B4\uB098 \uD544\uD130\uB97C \uD558\uB098\uC529 \uBC14\uAFD4 \uBCF4\uC138\uC694.", "#/info", "과제별 안내 보기")}
      ${max > 1 ? `<nav class="pagination" aria-label="\uBAA9\uB85D \uD398\uC774\uC9C0">${page > 1 ? `<a class="button" href="${esc(link({ page: page - 1 }))}">\uC774\uC804</a>` : ""}${pages.map((p, i) => `${i && p - pages[i - 1] > 1 ? '<span class="pagination-gap" aria-hidden="true">…</span>' : ""}<a class="button" href="${esc(link({ page: p }))}"${page === p ? ' aria-current="page"' : ""}>${p}</a>`).join("")}${page < max ? `<a class="button" href="${esc(link({ page: page + 1 }))}">\uB2E4\uC74C</a>` : ""}</nav>` : ""}`;
  }
  function siteDetail(site, back) {
    const d = detail(site), label = operatorLabel(d);
    const section = (title, items) => asList(items).length ? `<section><h2>${title}</h2><ul>${asList(items).map((v) => `<li>${esc(v)}</li>`).join("")}</ul></section>` : "";
    const meta = {
      "추천 대상": d.recommendedAges?.length ? site.ages?.map(a => AGES[a] || a).join("·") + " (과제 활용 추천)" : d.recommendedFor || site.ages?.map(a => AGES[a] || a).join("·"),
      "주요 용도": asList(d.mainUses).slice(0, 2).join(" · ") || categoryName(site.category),
      "과목": site.subjects?.map(s => SUBJECTS[s] || s).join(", "),
      "이용료": d.fee,
      "회원가입": d.signup,
      "운영기관": d.operatorName,
      "운영 주체": label || "미확인",
      "가입 연령 조건": d.signupAge
    };
    const related = sites.filter((s) => keyOf(s) !== keyOf(site) && s.category === site.category).slice(0, 3);

    return `<div class="breadcrumbs"><a href="#/sites">\uC0AC\uC774\uD2B8 \uBAA8\uC74C</a> / ${esc(site.name)}</div><a class="back" href="${esc(back?.hash || "#/sites")}" data-return>← 이전 화면으로</a>

      <div class="detail-layout"><aside class="summary-card" aria-label="\uC0AC\uC774\uD2B8 \uC694\uC57D"><h2>\uD55C\uB208\uC5D0 \uBCF4\uAE30</h2><dl>${Object.entries(meta).map(([k, v]) => `<dt>${k}</dt><dd>${esc(v || "\uBBF8\uD655\uC778")}</dd>`).join("")}</dl>${visit(site, true)}<div class="card-actions">${bookmark(site)}<button data-copy-url="${esc(safeUrl(site.url))}">사이트 주소 복사</button></div></aside>
      <div class="detail-column"><div class="detail-heading">${favicon(site)}<div><h1>${esc(site.name)}</h1>${label ? `<span class="tag verified">${esc(label)}</span>` : ""}</div></div>${section("이런 때 사용하세요", d.useCases)}<p class="lead detail-lead">${esc(d.summary || site.desc || "\uC18C\uAC1C \uC815\uBCF4 \uBBF8\uD655\uC778")}</p><div class="detail-body">${d.detailDesc ? `<section><h2>\uC0AC\uC774\uD2B8 \uC18C\uAC1C</h2><p class="site-introduction">${esc(d.detailDesc)}</p></section>` : ""}${section("\uC8FC\uC694 \uAE30\uB2A5", d.features)}${section("\uC774\uC6A9 \uC804 \uD655\uC778", [...(d.signupAge ? ["가입 연령 조건: " + d.signupAge] : []), ...(!label && site.isGov ? ["기존 공공 운영 분류가 있으나 공식 운영 주체는 재확인 필요"] : []), ...asList(d.notes)])}
      <section><h2>함께 읽는 딱필 정보</h2><div data-info-related="${esc(keyOf(site))}"><a href="#/info">딱필 정보 읽어보기 →</a></div></section>
      ${related.length ? `<section class="related"><h2>\uD568\uAED8 \uC0B4\uD3B4\uBCFC \uC0AC\uC774\uD2B8</h2><div class="card-grid">${related.map((s) => card(s, "", `${categoryName(site.category)} \uBD84\uC57C\uC758 \uB2E4\uB978 \uC0AC\uC774\uD2B8`)).join("")}</div></section>` : ""}</div></div></div>
      <div class="detail-footer">\uC815\uBCF4 \uD655\uC778\uC77C: ${esc(d.verifiedAt || "\uBBF8\uD655\uC778")} \xB7 ${safeUrl(d.sourceUrl) ? `<a href="${esc(safeUrl(d.sourceUrl))}" target="_blank" rel="noopener noreferrer">\uACF5\uC2DD \uCD9C\uCC98 \u2197</a>` : "\uD655\uC778 \uCD9C\uCC98 \uBBF8\uB4F1\uB85D"} \xB7 <a href="https://discord.gg/USGSqPJ9TE" target="_blank" rel="noopener noreferrer">\uC815\uBCF4 \uC218\uC815 \uBB38\uC758 \u2197</a><p>수정 제보에는 사이트 주소, 잘못된 내용, 확인 날짜를 함께 알려 주세요.</p></div>`;
  }
  function collection(tab, items, q = "") {
    return `<h1>\uBCF4\uAD00\uD568</h1><p class="lead">\uC774 \uBE0C\uB77C\uC6B0\uC800\uC5D0 \uC800\uC7A5\uD55C \uC0AC\uC774\uD2B8\uC640 \uCD5C\uADFC \uBCF8 \uC0AC\uC774\uD2B8\uB97C \uD655\uC778\uD558\uC138\uC694.</p><nav class="group-tabs collection-tabs" aria-label="\uBCF4\uAD00\uD568 \uAD6C\uBD84"><a class="button" href="#/saved-sites"${tab === "saved" ? ' aria-current="page"' : ""}>\uC800\uC7A5\uD55C \uC0AC\uC774\uD2B8</a><a class="button" href="#/recent-sites"${tab === "recent" ? ' aria-current="page"' : ""}>\uCD5C\uADFC \uBCF8 \uC0AC\uC774\uD2B8</a></nav><label class="collection-search">\uBCF4\uAD00\uD568\uC5D0\uC11C \uAC80\uC0C9<input class="topic-input" id="collectionSearch" type="search" value="${esc(q)}" placeholder="\uC0AC\uC774\uD2B8 \uC774\uB984\uC774\uB098 \uC6A9\uB3C4"></label><div id="collectionResults">${collectionResults(items, q)}</div>`;
  }
  function collectionResults(items, q) {
    const filtered = items.filter((s) => `${s.name} ${s.desc}`.toLowerCase().includes(q.toLowerCase()));
    return filtered.length ? `<div class="card-grid">${filtered.map((s) => card(s, q)).join("")}</div>` : empty(q ? "\uAC80\uC0C9 \uACB0\uACFC\uAC00 \uC5C6\uC5B4\uC694. \uB2E4\uB978 \uAC80\uC0C9\uC5B4\uB97C \uC785\uB825\uD574 \uBCF4\uC138\uC694." : "\uC544\uC9C1 \uC0AC\uC774\uD2B8\uAC00 \uC5C6\uC5B4\uC694. \uC0AC\uC774\uD2B8 \uBAA8\uC74C\uC5D0\uC11C \uB9C8\uC74C\uC5D0 \uB4DC\uB294 \uC0AC\uC774\uD2B8\uB97C \uCC3E\uC544\uBCF4\uC138\uC694.");
  }
  return { home, list, activeFilters, listResults, card, siteDetail, collection, collectionResults, empty, options, searchForm };
}
export {
  createViews
};
