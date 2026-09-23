import { homeView } from "./home.module.js";
import { AGES, SUBJECTS, GROUPS, esc, safeUrl, keyOf, urlFor, asList, operatorLabel } from "./model.module.js";
function createViews(ctx) {
  const { detail, categories, saved, sites } = ctx;
  const categoryName = (key) => categories[key]?.name || key || "\uB2E4\uBAA9\uC801";
  const detailUrl = (site) => `#site=${encodeURIComponent(keyOf(site))}`;
  const favicon = (site) => `<img class="favicon" src="https://www.google.com/s2/favicons?sz=64&amp;domain_url=${encodeURIComponent(safeUrl(site.url))}" alt="" loading="lazy" data-fallback="${esc(site.name?.slice(0, 1) || "\xB7")}">`;
  const governmentMark = site => site.isGov === true ? '<img class="gov-flag korea-gov" src="https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Emblem_of_the_Government_of_the_Republic_of_Korea.svg/250px-Emblem_of_the_Government_of_the_Republic_of_Korea.svg.png" alt="정부 운영" title="정부 운영" width="22" height="22">' : '';
  const bookmark = (site) => `<button class="bookmark" data-save="${esc(keyOf(site))}" aria-label="${esc(site.name)} \uC800\uC7A5" aria-pressed="${saved(keyOf(site))}">${saved(keyOf(site)) ? "\uC800\uC7A5\uB428" : "\uC800\uC7A5"}</button>`;
  const visit = (site, primary = false) => safeUrl(site.url) ? `<a class="${primary ? "button primary" : "external"}" href="${esc(safeUrl(site.url))}" target="_blank" rel="noopener noreferrer" data-visit="${esc(keyOf(site))}" aria-label="${esc(site.name)} \uC0C8 \uD0ED\uC5D0\uC11C \uBC29\uBB38">${primary ? "\uC0AC\uC774\uD2B8 \uBC29\uBB38" : "\uBC14\uB85C\uAC00\uAE30"} \u2197</a>` : '<span class="muted">\uC8FC\uC18C \uBBF8\uD655\uC778</span>';
  const highlight = (text, query) => {
    if (!query || !String(text).toLowerCase().includes(query.toLowerCase())) return esc(text);
    const start = String(text).toLowerCase().indexOf(query.toLowerCase());
    return esc(text.slice(0, start)) + "<mark>" + esc(text.slice(start, start + query.length)) + "</mark>" + esc(text.slice(start + query.length));
  };
  function card(site, query = "", reason = "") {
    const d = detail(site), verified = operatorLabel(d);
    return `<article class="site-card" data-site="${esc(keyOf(site))}">${reason ? `<p class="recommend-reason">${esc(reason)}</p>` : ""}<div class="card-top">${favicon(site)}<h3><a data-detail href="${detailUrl(site)}">${highlight(site.name, query)}${governmentMark(site)}</a></h3>${bookmark(site)}</div>
      <p class="site-desc">${highlight(String(d.summary || site.desc || "\uC18C\uAC1C \uC815\uBCF4 \uBBF8\uD655\uC778"), query)}</p>
      <div class="card-tags"><span class="tag">${esc(site.ages?.length ? site.ages.map((a) => AGES[a] || a).join("\xB7") : "\uB300\uC0C1 \uBBF8\uD655\uC778")}</span><span class="tag">${esc(categoryName(site.category))}</span>${verified ? `<span class="tag verified">${esc(verified)}</span>` : ""}${d.fee ? `<span class="tag">${esc(d.fee)}</span>` : ""}</div>
      <div class="card-actions"><a data-detail href="${detailUrl(site)}">\uC0C1\uC138\uC815\uBCF4 \u2192</a>${visit(site)}</div></article>`;
  }
  const empty = (message, link = "#/sites", label = "\uC0AC\uC774\uD2B8 \uBAA8\uC74C \uBCF4\uAE30") => `<div class="empty"><p>${esc(message)}</p><a class="button" href="${esc(link)}">${esc(label)}</a></div>`;
  const options = (map, value, allLabel = "\uC804\uCCB4") => `<option value="all"${value === "all" ? " selected" : ""}>${allLabel}</option>` + Object.entries(map).map(([k, v]) => `<option value="${esc(k)}"${value === k ? " selected" : ""}>${esc(typeof v === "string" ? v : v.name)}</option>`).join("");
  function searchForm(id, value = "", isHome = false) {
    return `<form class="search-form" data-search="${isHome ? "home" : "list"}" role="search"><div class="search-wrap"><input type="search" id="${id}" name="q" value="${esc(value)}" placeholder="\uC0AC\uC774\uD2B8\uBA85\uC774\uB098 \uC6A9\uB3C4 \uAC80\uC0C9" aria-label="\uB4F1\uB85D\uB41C \uC0AC\uC774\uD2B8 \uAC80\uC0C9" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="suggestions" autocomplete="off" maxlength="200"><div id="suggestions" class="suggestions" role="listbox" hidden></div></div><button class="primary" type="submit">\uAC80\uC0C9</button></form>`;
  }
  function home(recent) {
    const recentHtml = recent.length ? '<section class="home-recent"><div class="section-intro"><h2>최근 본 사이트</h2><a class="button" href="#/recent-sites">최근 본 사이트 전체 보기 →</a></div><div class="card-grid">' + recent.slice(0,3).map(s => card(s)).join('') + '</div></section>' : '';
    return homeView({search:searchForm('homeSearch','',true), recent:recentHtml, count:sites.length});
  }
  function activeFilters(s) {
    const link = (patch) => urlFor("sites", { ...s, ...patch, page: 1 });
    const active = Object.entries({ q: s.q, group: s.group, category: s.category, age: s.age, subject: s.subject, gov: s.gov }).filter(([, v]) => v && v !== "all");
    const labels = { q: s.q, group: GROUPS[s.group]?.name, category: categoryName(s.category), age: AGES[s.age], subject: SUBJECTS[s.subject], gov: "\uACF5\uACF5 \uC6B4\uC601 \uBD84\uB958" };
    return `<div class="active-filters">${active.map(([k]) => `<a href="${esc(link({ ...{ [k]: k === "q" ? "" : "all" }, ...k === "group" ? { category: "all" } : {} }))}" aria-label="${esc(labels[k])} \uC870\uAC74 \uD574\uC81C">${esc(labels[k])} \xD7</a>`).join("")}${active.length ? '<a href="#/sites">\uC804\uCCB4 \uCD08\uAE30\uD654</a>' : ""}</div>`;
  }
  function list(s, results) {
    const link = (patch) => urlFor("sites", { ...s, ...patch, page: patch.page || 1 });
    const groupLinks = [["all", "\uC804\uCCB4"], ...Object.entries(GROUPS).map(([k, v]) => [k, v.name])].map(([k, v]) => `<a class="button" href="${esc(link({ group: k, category: "all" }))}"${s.group === k ? ' aria-current="true"' : ""}>${esc(v)}</a>`).join("");
    const subs = s.group !== "all" ? GROUPS[s.group].categories.filter((k) => categories[k]) : [];
    return `<section><p class="eyebrow">\uC9C1\uC811 \uCC3E\uC544\uBCF4\uAE30</p><h1>\uC0AC\uC774\uD2B8 \uBAA8\uC74C</h1><p class="lead">\uC774\uB984\uC774\uB098 \uC6A9\uB3C4\uB85C \uAC80\uC0C9\uD558\uACE0, \uB098\uC5D0\uAC8C \uB9DE\uB294 \uC0AC\uC774\uD2B8\uB97C \uACE8\uB77C\uBCF4\uC138\uC694.</p><div class="catalog-search">${searchForm("searchInput", s.q)}</div>
      <nav class="group-tabs desktop-categories" aria-label="\uBAA9\uC801\uBCC4 \uCE74\uD14C\uACE0\uB9AC">${groupLinks}</nav><button class="mobile-category" data-panel="categories">${esc(GROUPS[s.group]?.name || "\uC804\uCCB4 \uCE74\uD14C\uACE0\uB9AC")} \u25BE</button>
      ${subs.length ? `<nav class="sub-tabs" aria-label="\uC138\uBD80 \uCE74\uD14C\uACE0\uB9AC"><a class="button" href="${esc(link({ category: "all" }))}"${s.category === "all" ? ' aria-current="true"' : ""}>\uC804\uCCB4</a>${subs.map((k) => `<a class="button" href="${esc(link({ category: k }))}"${s.category === k ? ' aria-current="true"' : ""}>${esc(categoryName(k))}</a>`).join("")}</nav>` : ""}
      <div class="filter-row"><label>\uD559\uAD50\uAE09<select id="ageFilter" data-filter="age">${options(AGES, s.age, "\uC804\uCCB4 \uD559\uAD50\uAE09")}</select></label><label>\uACFC\uBAA9<select id="subjectFilter" data-filter="subject">${options(SUBJECTS, s.subject, "\uC804\uCCB4 \uACFC\uBAA9")}</select></label><button class="extra" data-panel="filters">\uCD94\uAC00 \uD544\uD130${s.gov === "gov" ? " 1" : ""}</button></div>
      ${activeFilters(s)}
      <div id="listResults">${listResults(s, results)}</div><p class="help-link"><a href="#/info">공부에 도움이 되는 딱필 정보 읽어보기 →</a></p></section>`;
  }
  function listResults(s, results) {
    const page = Math.min(s.page, Math.max(1, Math.ceil(results.length / 12)));
    const max = Math.max(1, Math.ceil(results.length / 12));
    const pages = [.../* @__PURE__ */ new Set([1, page - 1, page, page + 1, max])].filter((p) => p > 0 && p <= max).sort((a, b) => a - b);
    const link = (patch) => urlFor("sites", { ...s, ...patch });
    return `<p class="results-header" role="status">\uC870\uAC74\uC5D0 \uB9DE\uB294 \uC0AC\uC774\uD2B8 <strong id="filteredCount">${results.length}\uAC1C</strong>${results.length ? `<span class="page-position">${page} / ${max} 페이지</span>` : ""}</p>${results.length ? `<div class="card-grid">${results.slice((page - 1) * 12, page * 12).map((site) => card(site, s.q)).join("")}</div>` : empty("\uC870\uAC74\uC5D0 \uB9DE\uB294 \uC0AC\uC774\uD2B8\uAC00 \uC5C6\uC5B4\uC694. \uAC80\uC0C9\uC5B4\uB098 \uD544\uD130\uB97C \uD558\uB098\uC529 \uBC14\uAFD4 \uBCF4\uC138\uC694.", "#/sites", "\uC870\uAC74 \uCD08\uAE30\uD654")}
      ${max > 1 ? `<nav class="pagination" aria-label="\uBAA9\uB85D \uD398\uC774\uC9C0">${page > 1 ? `<a class="button" href="${esc(link({ page: page - 1 }))}">\uC774\uC804</a>` : ""}${pages.map((p, i) => `${i && p - pages[i - 1] > 1 ? '<span class="pagination-gap" aria-hidden="true">…</span>' : ""}<a class="button" href="${esc(link({ page: p }))}"${page === p ? ' aria-current="page"' : ""}>${p}</a>`).join("")}${page < max ? `<a class="button" href="${esc(link({ page: page + 1 }))}">\uB2E4\uC74C</a>` : ""}</nav>` : ""}`;
  }
  function siteDetail(site, back) {
    const d = detail(site), label = operatorLabel(d);
    const section = (title, items) => asList(items).length ? `<section><h2>${title}</h2><ul>${asList(items).map((v) => `<li>${esc(v)}</li>`).join("")}</ul></section>` : "";
    const meta = {
      "추천 대상": d.recommendedFor || site.ages?.map(a => AGES[a] || a).join("·"),
      "주요 용도": asList(d.mainUses).slice(0, 2).join(" · ") || categoryName(site.category),
      "과목": site.subjects?.map(s => SUBJECTS[s] || s).join(", "),
      "이용료": d.fee,
      "회원가입": d.signup,
      "운영기관": d.operatorName,
      ...(label ? { "운영 주체": label } : {})
    };
    const related = sites.filter((s) => keyOf(s) !== keyOf(site) && s.category === site.category).slice(0, 3);

    return `<div class="breadcrumbs"><a href="#/sites">\uC0AC\uC774\uD2B8 \uBAA8\uC74C</a> / ${esc(site.name)}</div><a class="back" href="${esc(back?.hash || "#/sites")}" data-return>← 이전 화면으로</a>

      <div class="detail-layout"><aside class="summary-card" aria-label="\uC0AC\uC774\uD2B8 \uC694\uC57D"><h2>\uD55C\uB208\uC5D0 \uBCF4\uAE30</h2><dl>${Object.entries(meta).map(([k, v]) => `<dt>${k}</dt><dd>${esc(v || "\uBBF8\uD655\uC778")}</dd>`).join("")}</dl>${visit(site, true)}<div class="card-actions">${bookmark(site)}<button data-share="${esc(detailUrl(site))}">\uACF5\uC720</button></div></aside>
      <div class="detail-column"><div class="detail-heading">${favicon(site)}<div><h1>${esc(site.name)}${governmentMark(site)}</h1>${label ? `<span class="tag verified">${esc(label)}</span>` : ""}</div></div><p class="lead detail-lead">${esc(d.summary || site.desc || "\uC18C\uAC1C \uC815\uBCF4 \uBBF8\uD655\uC778")}</p><div class="detail-body">${d.detailDesc ? `<section><h2>\uC0AC\uC774\uD2B8 \uC18C\uAC1C</h2><p class="site-introduction">${esc(d.detailDesc)}</p></section>` : ""}${section("\uC774\uB7F0 \uB54C \uC0AC\uC6A9\uD558\uC138\uC694", d.useCases)}${section("\uC8FC\uC694 \uAE30\uB2A5", d.features)}${section("\uC774\uC6A9 \uC804 \uD655\uC778", [...(d.signupAge ? ["가입 연령 조건: " + d.signupAge] : []), ...(!label && site.isGov ? ["기존 공공 운영 분류가 있으나 공식 운영 주체는 재확인 필요"] : []), ...asList(d.notes)])}
      <section><h2>함께 읽는 딱필 정보</h2><div data-info-related="${esc(keyOf(site))}"><a href="#/info">딱필 정보 읽어보기 →</a></div></section>
      ${related.length ? `<section class="related"><h2>\uD568\uAED8 \uC0B4\uD3B4\uBCFC \uC0AC\uC774\uD2B8</h2><div class="card-grid">${related.map((s) => card(s, "", `${categoryName(site.category)} \uBD84\uC57C\uC758 \uB2E4\uB978 \uC0AC\uC774\uD2B8`)).join("")}</div></section>` : ""}</div></div></div>
      <div class="detail-footer">\uC815\uBCF4 \uD655\uC778\uC77C: ${esc(d.verifiedAt || "\uBBF8\uD655\uC778")} \xB7 ${safeUrl(d.sourceUrl) ? `<a href="${esc(safeUrl(d.sourceUrl))}" target="_blank" rel="noopener noreferrer">\uACF5\uC2DD \uCD9C\uCC98 \u2197</a>` : "\uD655\uC778 \uCD9C\uCC98 \uBBF8\uB4F1\uB85D"} \xB7 <a href="https://discord.gg/USGSqPJ9TE" target="_blank" rel="noopener noreferrer">\uC815\uBCF4 \uC218\uC815 \uBB38\uC758 \u2197</a></div>`;
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
