import { installStore } from "../app/store.module.js";
import { installSheetCatalog } from "../data/sheet-catalog.module.js";
import { installSearchEngine } from "../search/filter-engine.module.js";
import { installRetentionStorage } from "../retention/storage.module.js";
import { installBookmarks } from "../retention/bookmarks.module.js";
import { installRecentSites } from "../retention/recent.module.js";
import Fuse from "../vendor/fuse.min.mjs";
import { AGES, SUBJECTS, GROUPS, esc, keyOf, urlFor, listState, mergedDetail, filterSites, consolidateSites } from "./model.module.js";
import { createViews } from "./views.module.js";
import { infoShell, installInfo } from '../info/view.module.js';
const main = document.getElementById("main"), panel = document.getElementById("panel");
const store = installStore();
window.ageNames = AGES;
window.subjectNames = SUBJECTS;
window.Fuse = Fuse;
const search = installSearchEngine();
const storage = installRetentionStorage(), bookmarks = installBookmarks(), recent = installRecentSites();
installSheetCatalog();

let sites = [], categories = {}, localDetails = {}, views, fuse;
let state, currentHash = "", collectionItems = [], composing = false, suggestionIndex = -1;
let loading = true, loadFailed = false, starting = false, restoreNext = null;
const snapshots = /* @__PURE__ */ new Map();
let noticeTimer;
function notify(message) {
  const node = (panel.open && panel.querySelector("[data-panel-notice]")) || document.getElementById("notice");
  node.textContent = message;
  clearTimeout(noticeTimer);
  noticeTimer = setTimeout(() => node.textContent = "", 5e3);
}
window.showToast = notify;
function pref(key, fallback) {
  try {
    return localStorage.getItem(key) || fallback;
  } catch {
    return fallback;
  }
}
function applyPreferences() {
  const mode = pref("siteTheme", "light");
  document.body.classList.toggle("dark", mode === "dark" || mode === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.body.classList.remove("font-small", "font-normal", "font-large", "radius-square", "radius-round");
  const font = pref("siteFontSize", "normal"), radius = pref("siteRadius", "round");
  document.body.classList.add(`font-${["small", "normal", "large"].includes(font) ? font : "normal"}`, `radius-${radius === "square" ? "square" : "round"}`);
  document.body.classList.toggle("anim-off", pref("siteAnim", "on") === "off");
}
applyPreferences();
matchMedia("(prefers-color-scheme: dark)").addEventListener("change", applyPreferences);
const detail = (site) => mergedDetail(localDetails[keyOf(site)], window.siteDetailMap?.[keyOf(site)]);
function rebuildViews() {
  views = createViews({ sites, categories, detail, saved: bookmarks.isBookmarked });
}
function results(s = state) {
  return filterSites(sites, s, search.getFilteredSites, s.q && fuse ? fuse.search(s.q).map((r) => r.item) : []);
}
function snapshot() {
  if (!currentHash) return;
  const active = document.activeElement;
  snapshots.set(currentHash, { hash: currentHash, y: scrollY, focus: active?.id || "", href: active?.getAttribute("href") || "", text: active?.textContent || "", save: active?.dataset?.save || "" });
  if (snapshots.size > 50) snapshots.delete(snapshots.keys().next().value);
}
function navigate(hash, replace = false) {
  snapshot();
  if (replace) {
    history.replaceState(history.state, "", hash);
    render();
  } else if (location.hash === hash) {
    render();
  } else location.hash = hash;
}
function backContext() {
  return history.state?.detailOrigin || null;
}
function rememberDetail(hash) {
  snapshot();
  const origin = currentHash.startsWith("#site=") ? backContext() : snapshots.get(currentHash);
  history.pushState({ detailOrigin: origin }, "", hash);
  render();
}
function routeFocus(restore) {
  requestAnimationFrame(() => {
    if (restore) {
      const el = restore.focus ? document.getElementById(restore.focus) : Array.from(main.querySelectorAll("a,button")).find((n) => restore.href && n.getAttribute("href") === restore.href && n.textContent === restore.text || restore.save && n.dataset.save === restore.save);
      (el || main).focus({ preventScroll: true });
      window.scrollTo(0, restore.y || 0);
    } else {
      main.focus({ preventScroll: true });
      window.scrollTo(0, 0);
    }
  });
}
const hydrateInformation = installInfo(() => sites, () => render());
function render({ preserve = false } = {}) {
  if (preserve && ['#/info', '#/admin/info'].includes(location.hash.split('?')[0]) && document.querySelector('#infoSurface[data-mounted]')) return;
  if (!views) return;
  const active = document.activeElement;
  const retained = preserve && active?.id && main.contains(active) ? { id: active.id, value: active.value, start: active.selectionStart, end: active.selectionEnd, y: scrollY } : null;
  if (/^#\/(guide|tips|practice)(\/|\?|$)/.test(location.hash)) {
    history.replaceState(null, '', '#/info?moved=1');
  }
  const hash = location.hash || "#/";
  const [path, query = ""] = hash.split("?");
  const params = new URLSearchParams(query);
  const changed = hash !== currentHash;
  currentHash = hash;
  let nav = "", title = "\uB531\uD544\uBAA8";
  if (path === "#/" || path === "#") {
    main.innerHTML = views.home(storage.resolveSites(recent.getRecentKeys(), 3));
  } else if (path === '#/info' || path.startsWith('#/info/') || path === '#/admin/info') {
    nav = 'info';
    title = '딱필 정보';
    main.innerHTML = infoShell();
  } else if (path === "#/sites") {
    nav = "sites";
    title = "\uC0AC\uC774\uD2B8 \uBAA8\uC74C";
    state = listState(params, categories);
    const found = results();
    state.page = Math.min(state.page, Math.max(1, Math.ceil(found.length / 12)));
    main.innerHTML = views.list(state, found);
  } else if (path.startsWith("#site=")) {
    nav = "sites";
    let key = "";
    try {
      key = decodeURIComponent(path.slice(6).split("&")[0]);
    } catch {
    }
    const site = sites.find((s) => [s.key, s.id, s.slug, s.name].some((v) => v && String(v).toLowerCase() === key.toLowerCase()));
    if (site) {
      title = site.name;
      recent.recordRecentSite(site);
      main.innerHTML = views.siteDetail(site, backContext());
    } else main.innerHTML = views.empty(loading ? "\uC0AC\uC774\uD2B8 \uC815\uBCF4\uB97C \uBD88\uB7EC\uC624\uACE0 \uC788\uC5B4\uC694." : "\uD574\uB2F9 \uC0AC\uC774\uD2B8\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4. \uC8FC\uC18C\uB97C \uD655\uC778\uD558\uAC70\uB098 \uC0AC\uC774\uD2B8 \uBAA8\uC74C\uC73C\uB85C \uC774\uB3D9\uD574 \uC8FC\uC138\uC694.");
  } else if (path === "#/saved-sites" || path === "#/recent-sites") {
    nav = "collection";
    title = "\uBCF4\uAD00\uD568";
    collectionItems = storage.resolveSites(path === "#/saved-sites" ? bookmarks.getBookmarkKeys() : recent.getRecentKeys(), 200);
    main.innerHTML = views.collection(path === "#/saved-sites" ? "saved" : "recent", collectionItems, params.get("q") || "");
  } else if (path === "#/about") {
    title = "\uB531\uD544\uBAA8 \uC18C\uAC1C";
    main.innerHTML = '<article class="about-copy"><h1>딱 필요한 사이트와 정보</h1><p class="lead">학생·학부모·교사를 위한 교육 사이트 모음과 읽을거리입니다.</p><h2>사이트 모음</h2><p>목적과 과목에 맞는 사이트를 찾아 이용 조건을 확인하세요.</p><a href="#/sites">사이트 찾아보기 →</a><h2>딱필 정보</h2><p>공부와 과제에 도움이 되는 지식과 사이트 활용 이야기를 읽어보세요.</p><a href="#/info">딱필 정보 읽어보기 →</a><h2>보관함</h2><p>저장한 사이트와 최근 기록은 현재 브라우저에 보관됩니다.</p></article>';
  } else {
    main.innerHTML = views.empty("\uC874\uC7AC\uD558\uC9C0 \uC54A\uB294 \uD398\uC774\uC9C0\uC785\uB2C8\uB2E4. \uC0AC\uC774\uD2B8 \uBAA8\uC74C\uC5D0\uC11C \uB2E4\uC2DC \uC2DC\uC791\uD574 \uC8FC\uC138\uC694.");
  }
  const catalogPage = path === "#/sites" || path.startsWith("#site=") || ["#/saved-sites", "#/recent-sites"].includes(path);
  if (catalogPage && (loading || loadFailed)) {
    main.innerHTML = loading
      ? '<div class="empty"><h1>사이트 정보를 불러오고 있어요</h1><p role="status">잠시만 기다려 주세요. 연결이 늦어지면 저장된 백업을 확인합니다.</p></div>'
      : '<div class="empty"><h1>사이트 정보를 불러오지 못했어요</h1><p>연결을 확인하고 다시 시도해 주세요. 저장한 사이트 기록은 그대로 유지됩니다.</p><button id="retryLoad" class="primary">다시 불러오기</button><a class="button quiet" href="#/">홈으로</a></div>';
  }
  if (!catalogPage && loadFailed) {
    main.insertAdjacentHTML('afterbegin', '<div class="data-source-notice" role="status">사이트 정보를 불러오지 못해 사이트 추천을 표시할 수 없어요.<button id="retryLoad">다시 불러오기</button></div>');
  }
  document.title = `${title} — 필요한 사이트와 학습 정보`;
  main.setAttribute("aria-busy", String(catalogPage && loading));
  const hydration = hydrateInformation();
  if (!loading && !loadFailed && window.sheetWarnings?.length) {
    main.insertAdjacentHTML('afterbegin', `<p class="data-source-notice" role="status">입력 정보 확인이 필요한 ${window.sheetWarnings.length}개 항목을 제외한 사이트를 표시하고 있어요.</p>`);
  }
  if (!loading && !loadFailed && window.siteDataSource === 'snapshot') {
    main.insertAdjacentHTML('afterbegin','<div class="data-source-notice" role="status">실시간 시트에 연결하지 못해 저장된 시트 백업을 표시하고 있어요.<button data-refresh>다시 연결</button></div>');
  }
  document.querySelectorAll("[data-nav]").forEach((a) => {
    if (a.dataset.nav === nav) a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  });
  if (changed && !preserve) {
    const target = restoreNext;
    restoreNext = null;
    const focusHash=location.hash;
    if(focusHash.startsWith('#/info'))void hydration.then(()=>{if(location.hash===focusHash)routeFocus(target);});
    else routeFocus(target);
  }
  if (retained) {
    const input = document.getElementById(retained.id);
    if (input) {
      input.value = retained.value;
      input.focus({ preventScroll: true });
      if (retained.start != null && input.type !== "search") input.setSelectionRange?.(retained.start, retained.end);
      window.scrollTo(0, retained.y);
    }
  }
}
function updateListQuery(value) {
  state = { ...state, q: value, page: 1 };
  const hash = urlFor("sites", state);
  history.replaceState(history.state, "", hash);
  currentHash = hash;
  const found = results();
  document.getElementById("listResults").innerHTML = views.listResults(state, found);
  const active = document.querySelector(".active-filters");
  const temp = document.createElement("template");
  temp.innerHTML = views.activeFilters(state);
  active.replaceWith(temp.content.querySelector(".active-filters"));
}
function hideSuggestions() {
  const box = document.getElementById("suggestions"), input = main.querySelector("[role=combobox]");
  if (box) box.hidden = true;
  if (input) {
    input.setAttribute("aria-expanded", "false");
    input.removeAttribute("aria-activedescendant");
  }
  suggestionIndex = -1;
}
function suggestions(input) {
  const box = document.getElementById("suggestions");
  if (!box) return;
  const q = input.value.trim();
  if (!q) {
    hideSuggestions();
    return;
  }
  const matches = filterSites(sites, { q, group: "all", category: "all", age: "all", subject: "all", gov: "all" }, search.getFilteredSites, fuse ? fuse.search(q).map((r) => r.item) : []).slice(0, 5);
  box.innerHTML = matches.map((s, i) => `<button type="button" role="option" aria-selected="false" tabindex="-1" id="suggestion-${i}" data-suggestion="${esc(s.name)}">${esc(s.name)}</button>`).join("");
  box.hidden = !matches.length;
  input.setAttribute("aria-expanded", String(!!matches.length));
  input.removeAttribute("aria-activedescendant");
  suggestionIndex = -1;
}
const settingsDefaults = { siteTheme: "light", siteFontSize: "normal", siteAnim: "on", siteRadius: "round" };
function settingsContent() {
  const groups = [
    ["siteTheme", "테마", { light: "☀ 라이트", dark: "☾ 다크", system: "▣ 기기 설정" }],
    ["siteFontSize", "글자 크기", { small: "A-", normal: "A", large: "A+" }],
    ["siteAnim", "애니메이션", { on: "✨ 켜짐", off: "꺼짐" }],
    ["siteRadius", "카드 모서리", { square: "□ 각지게", round: "○ 둥글게" }]
  ];
  return `<div class="dialog-head"><h2 id="panelTitle">⚙ 설정</h2><button type="button" data-close aria-label="닫기">×</button></div>${groups.map(([key, title, options]) => `<fieldset><legend>${title}</legend><div class="settings-options">${Object.entries(options).map(([value, label]) => `<button type="button" data-pref="${key}" data-value="${value}" aria-pressed="${pref(key, settingsDefaults[key]) === value}">${label}<span class="setting-check" aria-hidden="true">✓</span></button>`).join("")}</div></fieldset>`).join("")}<button type="button" class="settings-reset" data-reset-settings>↺ 기본값으로 초기화</button><p data-panel-notice role="status" aria-live="polite"></p>`;
}
function panelOpen(kind) {
  panel.classList.toggle("settings-panel", kind === "settings");
  if (kind === "settings") {
    panel.innerHTML = settingsContent();
    document.getElementById("settingsOpen").setAttribute("aria-expanded", "true");
    panel.showModal();
    return;
  }
  let form = "";
  if (kind === "categories") form = `<label>\uBAA9\uC801\uBCC4 \uCE74\uD14C\uACE0\uB9AC<select name="group">${views.options(GROUPS, state.group, "\uC804\uCCB4 \uCE74\uD14C\uACE0\uB9AC")}</select></label>`;
  else form = `<label>\uD559\uAD50\uAE09<select name="age">${views.options(AGES, state.age, "\uC804\uCCB4 \uD559\uAD50\uAE09")}</select></label><label>\uACFC\uBAA9<select name="subject">${views.options(SUBJECTS, state.subject, "\uC804\uCCB4 \uACFC\uBAA9")}</select></label><label>\uACF5\uACF5 \uC6B4\uC601 \uBD84\uB958<select name="gov">${views.options({ gov: "\uAE30\uC874 \uACF5\uACF5 \uC6B4\uC601 \uBD84\uB958 \uD3EC\uD568" }, state.gov, "\uC804\uCCB4")}</select></label><p class="muted">\uAE30\uC874 \uBD84\uB958\uC5D0\uB294 \uC7AC\uD655\uC778\uC774 \uD544\uC694\uD55C \uC0AC\uC774\uD2B8\uAC00 \uD3EC\uD568\uB429\uB2C8\uB2E4. \uD655\uC778\uB41C \uC6B4\uC601 \uC8FC\uCCB4\uB294 \uC0C1\uC138\uC815\uBCF4\uC5D0\uC11C \uD655\uC778\uD558\uC138\uC694.</p>`;
  panel.innerHTML = `<form id="panelForm" data-kind="${kind}"><div class="dialog-head"><h2 id="panelTitle">${{ settings: "\uD654\uBA74 \uC124\uC815", categories: "\uCE74\uD14C\uACE0\uB9AC \uC120\uD0DD", filters: "\uCD94\uAC00 \uD544\uD130" }[kind]}</h2><button type="button" data-close aria-label="\uB2EB\uAE30">\xD7</button></div>${form}<div class="dialog-actions"><button type="button" data-close>\uCDE8\uC18C</button><button class="primary" type="submit">\uC801\uC6A9</button></div></form>`;
  panel.showModal();
}
document.getElementById("settingsOpen").addEventListener("click", () => panelOpen("settings"));
panel.addEventListener("close", () => {
  document.getElementById("settingsOpen").setAttribute("aria-expanded", "false");
});
panel.addEventListener("click", (e) => {
  if (e.target === panel) {
    const rect = panel.getBoundingClientRect();
    if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) panel.close();
  }
  if (e.target.closest("[data-close],a")) panel.close();
  const choice = e.target.closest("[data-pref]");
  if (choice || e.target.closest("[data-reset-settings]")) {
    try {
      const updates = choice ? { [choice.dataset.pref]: choice.dataset.value } : settingsDefaults;
      Object.entries(updates).forEach(([key, value]) => localStorage.setItem(key, value));
      applyPreferences();
      panel.querySelectorAll("[data-pref]").forEach(button => button.setAttribute("aria-pressed", String(pref(button.dataset.pref, settingsDefaults[button.dataset.pref]) === button.dataset.value)));
    } catch {
      notify("설정을 저장하지 못했습니다. 브라우저 저장 권한을 확인해 주세요.");
    }
  }
});
panel.addEventListener("submit", (e) => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e.target)), kind = e.target.dataset.kind;
  navigate(urlFor("sites", { ...state, ...data, ...kind === "categories" ? { category: "all" } : {}, page: 1 }));
  panel.close();
});
main.addEventListener("error", (e) => {
  const img = e.target;
  if (img.matches("img[data-fallback]")) {
    const fallback = document.createElement("span");
    fallback.className = "favicon fallback-icon";
    fallback.setAttribute("aria-hidden", "true");
    fallback.textContent = img.dataset.fallback;
    img.replaceWith(fallback);
  }
}, true);
main.addEventListener("compositionstart", () => composing = true);
main.addEventListener("compositionend", (e) => {
  composing = false;
  if (e.target.id === "searchInput") updateListQuery(e.target.value);
  if (e.target.matches("[role=combobox]")) suggestions(e.target);
});
main.addEventListener("input", (e) => {
  if (composing || e.isComposing) return;
  if (e.target.id === "searchInput") updateListQuery(e.target.value);
  if (e.target.matches("[role=combobox]")) suggestions(e.target);
  if (e.target.id === "collectionSearch") {
    const q = e.target.value;
    document.getElementById("collectionResults").innerHTML = views.collectionResults(collectionItems, q);
    const hash = urlFor(currentHash.startsWith("#/saved") ? "saved-sites" : "recent-sites", { q });
    history.replaceState(history.state, "", hash);
    currentHash = hash;
  }
});
main.addEventListener("change", (e) => {
  if (e.target.dataset.filter) {
    restoreNext = { focus: e.target.id, y: scrollY };
    navigate(urlFor("sites", { ...state, [e.target.dataset.filter]: e.target.value, page: 1 }));
  }
});
main.addEventListener("keydown", (e) => {
  if (!e.target.matches("[role=combobox]") || composing || e.isComposing) return;
  const box = document.getElementById("suggestions"), opts = Array.from(box?.querySelectorAll("[role=option]") || []);
  if (e.key === "Escape") {
    hideSuggestions();
    return;
  }
  if (!opts.length || box.hidden) return;
  if (["ArrowDown", "ArrowUp"].includes(e.key)) {
    e.preventDefault();
    suggestionIndex = (suggestionIndex + (e.key === "ArrowDown" ? 1 : -1) + opts.length) % opts.length;
    opts.forEach((o, i) => o.setAttribute("aria-selected", String(i === suggestionIndex)));
    e.target.setAttribute("aria-activedescendant", opts[suggestionIndex].id);
  }
  if (e.key === "Enter" && suggestionIndex >= 0) {
    e.preventDefault();
    opts[suggestionIndex].click();
  }
});
document.addEventListener("click", (e) => {
  if (!e.target.closest(".search-wrap")) hideSuggestions();
});
main.addEventListener("focusout", () => {
  queueMicrotask(() => {
    if (!document.activeElement?.closest(".search-wrap")) hideSuggestions();
  });
});
main.addEventListener("submit", (e) => {
  if (e.target.matches("[data-search]")) {
    e.preventDefault();
    if (composing) return;
    const q = new FormData(e.target).get("q").trim();
    if (e.target.dataset.search === "home") navigate(urlFor("sites", { q }));
    else {
      updateListQuery(q);
      hideSuggestions();
    }
  }
});
main.addEventListener("click", async (e) => {
  const button = e.target.closest("button"), anchor = e.target.closest("a");
  if (button?.dataset.panel) panelOpen(button.dataset.panel);

  if (button?.dataset.suggestion) {
    const input = main.querySelector("[role=combobox]");
    input.value = button.dataset.suggestion;
    if (input.id === "homeSearch") navigate(urlFor("sites", { q: input.value }));
    else {
      updateListQuery(input.value);
      hideSuggestions();
      input.focus();
    }
  }
  if (button?.dataset.save) {
    const key = button.dataset.save;
    const before = bookmarks.isBookmarked(key);
    bookmarks.toggleBookmark(key);
    if (bookmarks.isBookmarked(key) === before) {
      notify("\uC800\uC7A5\uD558\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4. \uBE0C\uB77C\uC6B0\uC800 \uC800\uC7A5 \uACF5\uAC04\uC744 \uD655\uC778\uD574 \uC8FC\uC138\uC694.");
      return;
    }
    main.querySelectorAll("[data-save]").forEach((b) => {
      const active = bookmarks.isBookmarked(b.dataset.save);
      b.setAttribute("aria-pressed", String(active));
      b.textContent = active ? "\uC800\uC7A5\uB428" : "\uC800\uC7A5";
    });
    if (currentHash.startsWith("#/saved-sites")) {
      collectionItems = storage.resolveSites(bookmarks.getBookmarkKeys(), 200);
      document.getElementById("collectionResults").innerHTML = views.collectionResults(collectionItems, document.getElementById("collectionSearch").value);
      document.getElementById("collectionSearch").focus({ preventScroll: true });
    }
    notify(before ? "\uC800\uC7A5\uC744 \uD574\uC81C\uD588\uC2B5\uB2C8\uB2E4." : "\uC0AC\uC774\uD2B8\uB97C \uC800\uC7A5\uD588\uC2B5\uB2C8\uB2E4.");
  }
  if (button?.dataset.copy || button?.dataset.share) {
    let input = button.dataset.copy ? document.getElementById(button.dataset.copy) : null;
    const text = input ? input.value : new URL(button.dataset.share, location.href).href;
    try {
      await navigator.clipboard.writeText(text);
      notify("\uBCF5\uC0AC\uD588\uC2B5\uB2C8\uB2E4.");
    } catch {
      if (!input) {
        input = button.parentElement.querySelector(".share-fallback") || document.createElement("textarea");
        input.className = "share-fallback";
        input.value = text;
        input.readOnly = true;
        input.setAttribute("aria-label", "\uACF5\uC720\uD560 \uC0AC\uC774\uD2B8 \uC8FC\uC18C");
        button.after(input);
      }
      input.focus();
      input.select();
      notify("\uC790\uB3D9 \uBCF5\uC0AC\uB97C \uC0AC\uC6A9\uD560 \uC218 \uC5C6\uC5B4\uC694. \uC120\uD0DD\uB41C \uB0B4\uC6A9\uC744 \uC9C1\uC811 \uBCF5\uC0AC\uD574 \uC8FC\uC138\uC694.");
    }
  }
  if (anchor?.dataset.visit) {
    const before = recent.getRecentKeys();
    recent.recordRecentSite(anchor.dataset.visit);
    if (!recent.getRecentKeys().includes(anchor.dataset.visit) && !before.includes(anchor.dataset.visit)) notify("\uCD5C\uADFC \uAE30\uB85D\uC744 \uC800\uC7A5\uD558\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.");
  }
  if (anchor?.hasAttribute("data-detail") && !e.ctrlKey && !e.metaKey && !e.shiftKey && e.button === 0) {
    e.preventDefault();
    rememberDetail(anchor.getAttribute("href"));
  }
  if (anchor?.hasAttribute("data-return")) {
    e.preventDefault();
    restoreNext = backContext();
    navigate(anchor.getAttribute("href"));
  }
});
document.addEventListener("click", (e) => {
  const a = e.target.closest("a");
  if (a?.getAttribute("href")?.startsWith("#site=") && !a.hasAttribute("data-detail") && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
    e.preventDefault();
    rememberDetail(a.getAttribute("href"));
  } else if (a?.getAttribute("href")?.startsWith("#/")) snapshot();
});
window.addEventListener("hashchange", () => {
  if (currentHash === location.hash) return;
  if (currentHash.startsWith("#site=") && snapshots.has(location.hash) && !restoreNext) restoreNext = snapshots.get(location.hash);
  render();
});
window.addEventListener("popstate", () => {
  if (currentHash === location.hash) return;
  restoreNext = restoreNext || snapshots.get(location.hash) || null;
  render();
});
window.addEventListener("storage", () => {
  applyPreferences();
  snapshot();
  restoreNext = snapshots.get(currentHash);
  render({ preserve: true });
});
window.addEventListener("offline", () => notify("\uC778\uD130\uB137 \uC5F0\uACB0\uC774 \uB04A\uC5B4\uC84C\uC2B5\uB2C8\uB2E4. \uC678\uBD80 \uC0AC\uC774\uD2B8 \uBC29\uBB38\uC5D0\uB294 \uC5F0\uACB0\uC774 \uD544\uC694\uD569\uB2C8\uB2E4."));
async function loadOptional(path, fallback) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3000);
  try {
    const response = await fetch(path, { signal: controller.signal });
    if (!response.ok) throw new Error(path);
    return await response.json();
  } catch {
    return fallback;
  } finally {
    clearTimeout(timer);
  }
}
async function start() {
  if (starting) return;
  starting = true;
  loading = true;
  loadFailed = false;
  rebuildViews();
  render({ preserve: true });
  // Start independent requests together; optional content must not extend the API timeout.
  const catalogRequest = window.loadJSONData().then(() => null, error => error);
  try {
    localDetails = await loadOptional("data/site-details.json", {});
    rebuildViews();
    render({ preserve: true });
    const error = await catalogRequest;
    if (error) throw error;
    sites = consolidateSites(window.initialSites || []);
    categories = Object.fromEntries(Object.entries(window.defaultCategories || {}).filter(([, v]) => v.enabled !== false));
    window.getCategoryName = (k) => categories[k]?.name || k;
    window.getAllCategories = () => categories;
    window.getAllSites = () => sites;
    store.setState({ sites }, { render: false });
    fuse = new Fuse(sites, { keys: ["name", "desc", "subjects", "category"], threshold: 0.4, ignoreLocation: true });
    window.ddakpilmo.hub = { render, detail, results };
  } catch (error) {
    loadFailed = true;
    console.error(error);
  } finally {
    loading = false;
    starting = false;
    rebuildViews();
    render({ preserve: true });
  }
}

start();
main.addEventListener('click',event=>{if(event.target.closest('[data-refresh]'))location.reload();if(event.target.closest('#retryLoad'))start();});
document.querySelector(".skip-link").addEventListener("click", (e) => {
  e.preventDefault();
  main.focus();
});
