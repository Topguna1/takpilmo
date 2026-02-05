window.siteDetailMap = window.siteDetailMap || {};
(function () {
  const rIC = window.requestIdleCallback || (cb => setTimeout(() => cb({ timeRemaining: () => 0 }), 1));
  const REGISTRY = new Map();   // name -> step { name, fn, opts }
  const RESULT   = new Map();   // name -> { ok, error, tries, startedAt, endedAt }
  const DEP      = new Map();   // name -> { after:Set, before:Set }
  const CONFIG   = { maxPasses: 20, maxRetries: 1, stepTimeoutMs: 8000 };

  function add(name, fn, opts = {}) {
    if (!name || typeof fn !== 'function') throw new Error('addInitStep invalid');
    if (REGISTRY.has(name)) throw new Error('duplicate init step: ' + name);
    REGISTRY.set(name, { name, fn, opts });
    DEP.set(name, { after: new Set([].concat(opts.after || [])), before: new Set([].concat(opts.before || [])) });
  }

  function depsOK(name) {
    const d = DEP.get(name);
    if (!d) return true;
    for (const a of d.after) { const r = RESULT.get(a); if (REGISTRY.has(a) && (!r || r.ok !== true)) return false; }
    for (const b of d.before){ const r = RESULT.get(b); if (r && r.ok === true) return false; }
    return true;
  }

  async function runStep(step){
    const { name, fn, opts } = step;
    const res = RESULT.get(name) || { ok:null, tries:0 };
    res.startedAt = performance.now(); res.tries += 1; RESULT.set(name, res);
    const timeout = opts.timeoutMs ?? CONFIG.stepTimeoutMs;
    let to;
    try {
      const p = Promise.resolve().then(() => fn());
      const t = new Promise((_, rej) => to = setTimeout(() => rej(new Error('timeout')), timeout));
      await Promise.race([p, t]);
      res.ok = true; res.error = null;
    } catch(e){ res.ok = false; res.error = e; }
    finally { clearTimeout(to); res.endedAt = performance.now(); RESULT.set(name, res); }
    return res.ok;
  }

  async function run() {
    const pending = new Set(REGISTRY.keys());
    let pass = 0;
    while (pending.size && pass < CONFIG.maxPasses) {
      pass++;
      const runnable = [];
      pending.forEach(n => { if (depsOK(n)) runnable.push(n); });
      if (!runnable.length) break;
      for (const n of runnable) {
        const s = REGISTRY.get(n), r = RESULT.get(n) || { tries:0 };
        const left = (s.opts.maxRetries ?? CONFIG.maxRetries) - r.tries;
        const ok = await runStep(s);
        if (ok || left <= 0) pending.delete(n);
        await new Promise(res => rIC(res));
      }
    }
    const done=[], failed=[], skipped=[];
    REGISTRY.forEach((_, n) => { const r = RESULT.get(n); if (!r) skipped.push(n); else (r.ok?done:failed).push(n); });
    window.__initReport = { done, failed, skipped, passes: pass, total: REGISTRY.size };
    return window.__initReport;
  }

  function status(){
    const o={}; RESULT.forEach((r,k)=>o[k]={ok:r.ok, tries:r.tries, ms:r.endedAt&&r.startedAt?+(r.endedAt-r.startedAt).toFixed(1):null, error:r.error?String(r.error):null}); 
    return o;
  }

  window.initRunner = { add, run, status, config: CONFIG };
})();

const GOV_ICON_DATA_URL =
  "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Emblem_of_the_Government_of_the_Republic_of_Korea.svg/250px-Emblem_of_the_Government_of_the_Republic_of_Korea.svg.png";
// ===== DOM 캐싱 =====
const DOM = {
  categoriesContainer: document.getElementById("categoriesContainer"),
  searchInput: document.getElementById("searchInput"),
  autocompleteList: document.getElementById("autocomplete-list"),
  ageButtons: document.querySelectorAll("#ageFilter .filter-btn"),
  subjectFilter: document.getElementById("subjectFilter"),
  itemsPerPage: document.getElementById("itemsPerPage"),
  statsBar: document.getElementById("statsBar"),
  noResults: document.getElementById("noResults")
};

// ==================== 핵심 변수 및 상태 관리 ====================
const ageNames = {
  elem: "초등학생", 
  mid: "중학생", 
  high: "고등학생", 
  adult: "성인"
};

const subjectNames = {
  korean: "국어", math: "수학", english: "영어", science: "과학", 
  social: "사회", history: "역사", art: "예술", music: "음악", 
  pe: "체육", tech: "기술", coding: "코딩", language: "외국어", 
  general: "종합", exam: "시험대비", career: "진로"
};

// 상태 관리 (단일 소스)
let state = {
  sites: [],
  currentAgeFilter: "all",
  currentCategoryFilter: "all",
  currentSubjectFilter: "all",
  currentGovFilter: "all",
  currentSearchQuery: "",
  ITEMS_PER_PAGE: 5,
  currentPageByCategory: {}
};
window.state = state;
let __renderRAF = 0; // 렌더 중복 방지


// NOTE:
// 설명 텍스트는 현재 줄바꿈(\n)을 사용하지 않음.
// 향후 시트에서 문단 구분이 필요해지면
// textContent + CSS white-space: pre-line 방식으로 전환 권장.


// ==================== 상태 변경 중앙화 (필수) ====================
// ✅ 일반 상태 변경 (필요하면 렌더까지)
function setState(patch, opts = {}) {
  Object.assign(state, patch);

  // 필터/검색 변경이면 페이지 상태를 싹 초기화
  if (opts.resetPages) {
    state.currentPageByCategory = {};
  }

  // 혹시 window.state 참조하는 코드가 있으면 동기화
  window.state = state;

  // ✅ 렌더는 1프레임에 1번만 (연속 클릭/연속 setState에서도 중복 렌더 방지)
  if (opts.render !== false) {
    if (__renderRAF) cancelAnimationFrame(__renderRAF);
    __renderRAF = requestAnimationFrame(() => {
      __renderRAF = 0;
      window.renderSites?.();
    });
  }
}

// ✅ 필터/검색 바뀔 때는 무조건 이걸로만 변경
function setFilters(patch) {
  setState(patch, { resetPages: true, render: true });
}


// ✅ 페이지 변경은 무조건 이 함수로만 (직접 state 수정/직접 render 호출 금지)
function setPage(category, page, scrollY = 800) {
  const p = Math.max(1, page | 0);
  const next = { ...state.currentPageByCategory, [category]: p };

  // 페이지 변경은 필터/검색 변경이 아니므로 resetPages=false
  setState({ currentPageByCategory: next }, { resetPages: false, render: true });

  // 렌더 후 스크롤로 통일
  function smoothScrollToElement(target, duration = 900) {
    if (!target) return;
    if (document.body.classList.contains("anim-off")) {
      target.scrollIntoView({ block: "start", behavior: "auto" });
      return;
    }

    const startY = window.scrollY || 0;
    const targetY = target.getBoundingClientRect().top + startY;
    const distance = targetY - startY;
    const startTime = performance.now();
    let cancelled = false;

    function cancelOnUserScroll() {
      cancelled = true;
      removeCancelListeners();
    }

    function addCancelListeners() {
      const manager = window.memoryManager?.eventManager;
      if (manager) {
        manager.add(window, "wheel", cancelOnUserScroll, { passive: true });
        manager.add(window, "touchstart", cancelOnUserScroll, { passive: true });
        manager.add(window, "keydown", cancelOnUserScroll, { passive: true });
      } else {
        window.addEventListener("wheel", cancelOnUserScroll, { passive: true });
        window.addEventListener("touchstart", cancelOnUserScroll, { passive: true });
        window.addEventListener("keydown", cancelOnUserScroll, { passive: true });
      }
    }

    function removeCancelListeners() {
      const manager = window.memoryManager?.eventManager;
      if (manager?.remove) {
        manager.remove(window, "wheel", cancelOnUserScroll);
        manager.remove(window, "touchstart", cancelOnUserScroll);
        manager.remove(window, "keydown", cancelOnUserScroll);
      } else {
        window.removeEventListener("wheel", cancelOnUserScroll);
        window.removeEventListener("touchstart", cancelOnUserScroll);
        window.removeEventListener("keydown", cancelOnUserScroll);
      }
    }

    addCancelListeners();

    function easeInOutCubic(t) {
      return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    function step() {
      if (cancelled) return;
      const now = performance.now();
      const time = Math.min(1, (now - startTime) / duration);
      const eased = easeInOutCubic(time);
      window.scrollTo(0, startY + distance * eased);
      if (time < 1) {
        requestAnimationFrame(step);
      } else {
        removeCancelListeners();
      }
    }

    requestAnimationFrame(step);
  }

  const doScroll = () => {
    const section = document.getElementById(`${category}-section`);
    const header = section?.querySelector?.(".category-header");
    const target = header || section;
    smoothScrollToElement(target, 1100);
  };

  if (typeof afterNextRender === "function") {
    afterNextRender(() => {
      doScroll();
      setTimeout(doScroll, 0);
    });
  } else {
    doScroll();
    setTimeout(doScroll, 0);
  }
}
// 🔧 3. 검색 결과 캐싱 활용
function getFilteredSitesWithCache() {
  const cacheManager = window.memoryManager?.cacheManager;
  
  // 캐시 키 생성
  const cacheKey =
  `filtered_${state.currentSearchQuery}_${state.currentAgeFilter}_${state.currentCategoryFilter}_${state.currentSubjectFilter}_${state.currentGovFilter}`;
  
  // 🧹 캐시에서 먼저 확인
  if (cacheManager) {
    const cached = cacheManager.get(cacheKey);
    if (cached) {
      console.log(`💾 캐시 사용: ${cacheKey}`);
      return cached;
    }
  }
  
  // 캐시 미스, 실제 필터링 수행
  const rawQ = state.currentSearchQuery || "";
  const q = rawQ.trim().toLowerCase();

  let filtered = state.sites.filter(site => {
    if (state.currentAgeFilter !== "all" && !site.ages.includes(state.currentAgeFilter)) return false;
    if (state.currentCategoryFilter !== "all" && site.category !== state.currentCategoryFilter) return false;
    if (state.currentSubjectFilter !== "all" && !site.subjects.includes(state.currentSubjectFilter)) return false;
    if (state.currentGovFilter === "gov" && site.isGov !== true) return false;
    if (!q) return true;

    const searchTarget = (
      site.name + " " + 
      (site.desc || "") + " " + 
      getCategoryName(site.category) + " " +
      site.ages.map(a => ageNames[a]).join(" ") + " " +
      site.subjects.map(sub => subjectNames[sub]).join(" ") + " " +
      (site.chosungFull || "")
    ).toLowerCase();

    const tokens = q.split(/\s+/).filter(t => t.length > 0);

    return tokens.every(token => {
      const tokenChosung = safeGetChosung(token).toLowerCase();
      const siteChosung = (site.chosungFull || "").toLowerCase();

      if (searchTarget.includes(token)) return true;
      if (siteChosung.includes(token)) return true;
      if (siteChosung.includes(tokenChosung)) return true;
      if (safeGetChosung(site.name).toLowerCase().includes(tokenChosung)) return true;

      return false;
    });
  });
  
  // 🧹 결과를 캐시에 저장
  if (cacheManager) {
    cacheManager.set(cacheKey, filtered);
  }
  
  return filtered;
}

function handleDataLoadFailure() {
  const container = document.getElementById("categoriesContainer");
  if (container) {
    container.innerHTML = `
      <div style="text-align:center;padding:60px;color:#666;">
        <h3>📦 데이터를 불러올 수 없습니다</h3>
        <p>사이트 데이터 파일을 확인해주세요.</p>
        <button onclick="location.reload()" style="padding:12px 24px;background:#667eea;color:white;border:none;border-radius:8px;cursor:pointer;margin-top:16px;">🔄 새로고침</button>
      </div>
    `;
  }
  showToast('⚠️ 사이트 데이터를 불러올 수 없습니다', 'error');
}

function handleInitializationFailure(error) {
  const container = document.getElementById("categoriesContainer");
  if (container) {
    container.innerHTML = `
      <div style="text-align:center;padding:60px;color:#666;">
        <h3>💥 초기화 실패</h3>
        <p>브라우저를 새로고침하거나 캐시를 초기화해보세요.</p>
        <div style="margin:20px 0;padding:16px;background:#f8f9fa;border-radius:8px;font-family:monospace;font-size:12px;color:#e74c3c;">
          ${error.message || error}
        </div>
        <button onclick="location.reload()" style="padding:12px 24px;background:#e74c3c;color:white;border:none;border-radius:8px;cursor:pointer;margin:8px;">🔄 새로고침</button>
        <button onclick="localStorage.clear();location.reload()" style="padding:12px 24px;background:#f39c12;color:white;border:none;border-radius:8px;cursor:pointer;margin:8px;">🗑️ 캐시 초기화</button>
      </div>
    `;
  }
}
// ============= id 생성 함수 추가 (유팅) ===============
function makeSiteId(site, index) {
  if (site.id) return site.id;

  const base = String(site.name || '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')          // 공백 → -
    .replace(/[^a-z0-9가-힣\-]/g, ''); // 특수문자 제거

  // name이 비어있거나 중복될 수 있으니 index 보정
  return base ? `${base}-${index}` : `site-${index}`;
}
// ==================== 사이트 ID 보장 (전역) ====================
function ensureSiteIds() {
  const list = Array.isArray(window.state?.sites) ? window.state.sites
            : Array.isArray(window.initialSites) ? window.initialSites
            : [];
  if (list.length === 0) return;

  const used = new Set();

  list.forEach((site, i) => {
    if (site.id) {
      used.add(site.id);
      return;
    }

    const baseId = makeSiteId(site, i);
    if (!baseId) return;

    let finalId = baseId;
    let n = 1;
    while (used.has(finalId)) finalId = `${baseId}-${n++}`;

    site.id = finalId;
    used.add(finalId);
  });
}

// (선택) 콘솔에서 바로 쓰고 싶으면 노출
window.ensureSiteIds = ensureSiteIds;

// ============= id 생성 함수 추가 끝  ===============


// ==================== 검색 하이라이트 기능 ====================
function highlightSearchTerms(text, query) {
  const raw = String(text ?? "");
  const q = String(query ?? "").trim();
  if (!q) return escapeHtml(raw);

  // ---- helpers ----
  const esc = (s) => (typeof escapeHtml === "function" ? escapeHtml(s) : String(s)
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;").replaceAll("'", "&#039;"));

  const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const isChoOnly = (s) => /^[ㄱ-ㅎ]+$/.test(s);
  const isJamoLike = (s) => /[ㄱ-ㅎㅏ-ㅣ]/.test(s); // 자모가 하나라도 포함되면

  // 완성형 → 초성
  const CHO = ["ㄱ","ㄲ","ㄴ","ㄷ","ㄸ","ㄹ","ㅁ","ㅂ","ㅃ","ㅅ","ㅆ","ㅇ","ㅈ","ㅉ","ㅊ","ㅋ","ㅌ","ㅍ","ㅎ"];
  function getInitials(str) {
    let out = "";
    for (let i = 0; i < str.length; i++) {
      const code = str.charCodeAt(i);
      if (code >= 0xac00 && code <= 0xd7a3) out += CHO[Math.floor((code - 0xac00) / 588)] || "";
      else out += " "; // 한글이 아니면 공백 처리(연속 매칭 방해)
    }
    return out;
  }

  // 완성형 → 자모 + (자모 인덱스 ↔ 원문 인덱스) 매핑
  const JUNG = ["ㅏ","ㅐ","ㅑ","ㅒ","ㅓ","ㅔ","ㅕ","ㅖ","ㅗ","ㅘ","ㅙ","ㅚ","ㅛ","ㅜ","ㅝ","ㅞ","ㅟ","ㅠ","ㅡ","ㅢ","ㅣ"];
  const JONG = ["", "ㄱ","ㄲ","ㄳ","ㄴ","ㄵ","ㄶ","ㄷ","ㄹ","ㄺ","ㄻ","ㄼ","ㄽ","ㄾ","ㄿ","ㅀ","ㅁ","ㅂ","ㅄ","ㅅ","ㅆ","ㅇ","ㅈ","ㅊ","ㅋ","ㅌ","ㅍ","ㅎ"];
  function buildJamoMap(str) {
    let jamo = "";
    const map = []; // jamoIndex -> originalCharIndex
    for (let i = 0; i < str.length; i++) {
      const code = str.charCodeAt(i);
      if (code >= 0xac00 && code <= 0xd7a3) {
        const v = code - 0xac00;
        const cho = Math.floor(v / 588);
        const jung = Math.floor((v % 588) / 28);
        const jong = v % 28;
        const parts = [CHO[cho], JUNG[jung]];
        if (JONG[jong]) parts.push(JONG[jong]);
        for (const p of parts) {
          jamo += p;
          map.push(i);
        }
      } else {
        // 비한글은 그대로 한 글자 취급(매핑 유지)
        const ch = str[i];
        jamo += ch;
        map.push(i);
      }
    }
    return { jamo: jamo.toLowerCase(), map };
  }

  // 하이라이트 범위(원문 인덱스 기반) 수집 후 병합
  function mergeRanges(ranges) {
    if (!ranges.length) return [];
    ranges.sort((a,b) => a[0]-b[0] || a[1]-b[1]);
    const out = [ranges[0]];
    for (let i = 1; i < ranges.length; i++) {
      const [s,e] = ranges[i];
      const last = out[out.length-1];
      if (s <= last[1]) last[1] = Math.max(last[1], e);
      else out.push([s,e]);
    }
    return out;
  }

  function applyRanges(str, ranges) {
    if (!ranges.length) return esc(str);
    const merged = mergeRanges(ranges);
    let out = "";
    let idx = 0;
    for (const [s,e] of merged) {
      if (s > idx) out += esc(str.slice(idx, s));
      out += `<span class="search-highlight">${esc(str.slice(s, e))}</span>`;
      idx = e;
    }
    if (idx < str.length) out += esc(str.slice(idx));
    return out;
  }

  // ---- tokenize ----
  const tokens = q.split(/\s+/).filter(Boolean);
  if (!tokens.length) return esc(raw);

  const lowerRaw = raw.toLowerCase();
  const ranges = [];

  // 1) 완성형/일반 토큰은 기존처럼 직접 매칭
  for (const t of tokens) {
    if (!t) continue;
    // 자모/초성 토큰은 아래 전용 로직에서 처리
    if (isChoOnly(t) || isJamoLike(t)) continue;

    const re = new RegExp(escapeRegExp(t), "gi");
    let m;
    while ((m = re.exec(raw)) !== null) {
      ranges.push([m.index, m.index + m[0].length]);
      if (re.lastIndex === m.index) re.lastIndex++;
    }
  }

  // 2) 초성-only 토큰: 연속 음절 범위 하이라이트
  // 예) "ㄴㅇㅂ" -> "네이버" 3글자 범위
  const initials = getInitials(raw).toLowerCase(); // 비한글은 공백
  for (const t of tokens) {
    if (!isChoOnly(t)) continue;
    const needle = t.toLowerCase();
    let start = 0;
    while (true) {
      const idx = initials.indexOf(needle, start);
      if (idx === -1) break;
      // idx는 "문자 인덱스" 기준(초성 문자열 길이 = 원문 길이)
      ranges.push([idx, idx + needle.length]);
      start = idx + 1;
    }
  }

  // 3) 자모 토큰: 자모 문자열에서 매칭 → 원문 인덱스로 역매핑
  // 예) "ㄴㅔㅇ" -> "네이" 범위
  const { jamo, map } = buildJamoMap(raw);
  for (const t of tokens) {
    if (!(isJamoLike(t) && !isChoOnly(t))) continue;
    const needle = t.toLowerCase();
    let start = 0;
    while (true) {
      const jIdx = jamo.indexOf(needle, start);
      if (jIdx === -1) break;

      const from = map[jIdx];
      const to = map[jIdx + needle.length - 1];
      if (from != null && to != null) {
        ranges.push([from, to + 1]); // 원문 slice end는 +1
      }
      start = jIdx + 1;
    }
  }

  // 범위 적용
  return applyRanges(raw, ranges);
}

function makeSearchSnippet(text, query, radius = 36) {
  const raw = String(text ?? "");
  const q = String(query ?? "").trim();
  if (!q || !raw) return escapeHtml(raw);

  const tokens = q.split(/\s+/).filter(Boolean);
  const lower = raw.toLowerCase();

  let hit = -1;
  for (const t of tokens) {
    // 초성/자모 토큰은 원문에 그대로 없을 수 있으니 스니펫 기준 제외
    if (/^[ㄱ-ㅎ]+$/.test(t) || /[ㄱ-ㅎㅏ-ㅣ]/.test(t)) continue;
    hit = lower.indexOf(t.toLowerCase());
    if (hit !== -1) break;
  }

  if (hit === -1) {
    const cut = raw.length > radius * 2 ? raw.slice(0, radius * 2) + "…" : raw;
    return highlightSearchTerms(cut, q);
  }

  const start = Math.max(0, hit - radius);
  const end = Math.min(raw.length, hit + radius);

  let snippet = raw.slice(start, end);
  if (start > 0) snippet = "…" + snippet;
  if (end < raw.length) snippet = snippet + "…";

  return highlightSearchTerms(snippet, q);
}


// ==================== 데이터 접근 함수들 ====================
function getAllCategories() { 
  return typeof defaultCategories !== 'undefined' ? defaultCategories : {}; 
}

function getCategoryName(key) { 
  const c = getAllCategories()[key]; 
  return c ? c.name : key; 
}

function getCategoryIcon(key) { 
  const c = getAllCategories()[key]; 
  return c ? c.icon : "📁"; 
}
// ==================== Hangul Search Utils (자모/초성 매칭 강화) ====================

// 호환 자모(Compatibility Jamo) 테이블
const __CHO = ["ㄱ","ㄲ","ㄴ","ㄷ","ㄸ","ㄹ","ㅁ","ㅂ","ㅃ","ㅅ","ㅆ","ㅇ","ㅈ","ㅉ","ㅊ","ㅋ","ㅌ","ㅍ","ㅎ"];
const __JUNG = ["ㅏ","ㅐ","ㅑ","ㅒ","ㅓ","ㅔ","ㅕ","ㅖ","ㅗ","ㅘ","ㅙ","ㅚ","ㅛ","ㅜ","ㅝ","ㅞ","ㅟ","ㅠ","ㅡ","ㅢ","ㅣ"];
const __JONG = ["", "ㄱ","ㄲ","ㄳ","ㄴ","ㄵ","ㄶ","ㄷ","ㄹ","ㄺ","ㄻ","ㄼ","ㄽ","ㄾ","ㄿ","ㅀ","ㅁ","ㅂ","ㅄ","ㅅ","ㅆ","ㅇ","ㅈ","ㅊ","ㅋ","ㅌ","ㅍ","ㅎ"];

function normalizeTextForSearch(str) {
  return String(str ?? "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

// 완성형 한글(가-힣)을 "ㄱㅏ" 같은 자모 시퀀스로 풀기
function toJamoString(str) {
  str = String(str ?? "");
  let out = "";
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);

    // 완성형 음절
    if (ch >= 0xac00 && ch <= 0xd7a3) {
      const code = ch - 0xac00;
      const cho = Math.floor(code / 588);
      const jung = Math.floor((code % 588) / 28);
      const jong = code % 28;

      out += __CHO[cho] + __JUNG[jung] + (__JONG[jong] || "");
      continue;
    }

    // 이미 호환 자모(ㄱ-ㅎ,ㅏ-ㅣ)는 그대로 포함
    out += str[i];
  }
  return out.toLowerCase();
}

// "ㄱㄴㄷ"처럼 초성만 입력했는지
function isChosungOnly(q) {
  return /^[ㄱ-ㅎ]+$/.test(q);
}

// getChosung이 외부에 없을 수도 있으니 안전 fallback
function safeGetChosung(str) {
  const fn = window.ddakpilmo?.utils?.getChosung || window.getChosung;
  try {
    if (typeof fn === "function") return fn(str);
  } catch {}
  // fallback: 완성형에서 초성(호환 자모) 추출
  const CHO = ["ㄱ","ㄲ","ㄴ","ㄷ","ㄸ","ㄹ","ㅁ","ㅂ","ㅃ","ㅅ","ㅆ","ㅇ","ㅈ","ㅉ","ㅊ","ㅋ","ㅌ","ㅍ","ㅎ"];
  const s = String(str ?? "");
  let out = "";
  for (let i = 0; i < s.length; i++) {
    const ch = s.charCodeAt(i);
    if (ch >= 0xac00 && ch <= 0xd7a3) {
      const code = ch - 0xac00;
      out += CHO[Math.floor(code / 588)] || "";
    } else {
      out += s[i];
    }
  }
  return out;
}

// ==================== 필터링 함수 ====================
function getFilteredSites() {
  const rawQ = state.currentSearchQuery || "";
  const q = rawQ.trim().toLowerCase();
  const tokens = q ? q.split(/\s+/).filter(Boolean) : [];

  return state.sites.filter(site => {
    // ✅ 방어(데이터가 비어도 터지지 않게)
    const ages = Array.isArray(site.ages) ? site.ages : [];
    const subjects = Array.isArray(site.subjects) ? site.subjects : [];

    // 연령대 필터
    if (state.currentAgeFilter !== "all" && !ages.includes(state.currentAgeFilter)) return false;

    // 카테고리 필터
    if (state.currentCategoryFilter !== "all" && site.category !== state.currentCategoryFilter) return false;

    // 과목 필터
    if (state.currentSubjectFilter !== "all" && !subjects.includes(state.currentSubjectFilter)) return false;

    // 정부 필터
    if (state.currentGovFilter === "gov" && site.isGov !== true) return false;

    // 검색어가 없으면 통과
    if (!tokens.length) return true;

    // ✅ 검색 대상 문자열(미리 만든 __searchText가 있으면 그걸 쓰고, 없으면 여기서 만들기)
    const searchTarget = (site.__searchText ? site.__searchText : (
      (site.name || "") + " " +
      (site.desc || "") + " " +
      getCategoryName(site.category) + " " +
      ages.map(a => ageNames[a]).join(" ") + " " +
      subjects.map(sub => subjectNames[sub]).join(" ")
    )).toLowerCase();

    // ✅ 초성 문자열
    const siteChosung =
      (site.chosungFull || (safeGetChosung(site.name) + " " + safeGetChosung(site.desc))).toLowerCase();

    // ✅ 자모 문자열(미리 만든 __jamoText가 있으면 그걸 쓰고, 없으면 여기서 만들기)
    const siteJamo = (site.__jamoText ? site.__jamoText : (
      toJamoString(searchTarget) + " " + siteChosung
    )).toLowerCase();

    // 모든 토큰이 매칭되어야 함
    return tokens.every(token => {
      // 1) 일반 포함 검색
      if (searchTarget.includes(token)) return true;

      // 2) 사용자가 초성만 입력한 경우(ㄷㄱㅍ 같은)
      if (isChosungOnly(token)) {
        if (siteChosung.includes(token)) return true;
        return false;
      }

      // 3) 자모 입력/혼합 입력 대응(ㄱㅏ, ㄷㅏㄱ 등)
      const tokenJamo = toJamoString(token);
      if (tokenJamo && siteJamo.includes(tokenJamo)) return true;

      // 4) 토큰을 초성으로 바꿔 비교(단, 빈 문자열이면 절대 비교하지 않기!)
      const tokenCh = safeGetChosung(token).toLowerCase();
      if (tokenCh) {
        if (siteChosung.includes(tokenCh)) return true;
        if (safeGetChosung(site.name).toLowerCase().includes(tokenCh)) return true;
      }

      return false;
    });
  });
}


// ==================== UI 업데이트 함수들 ====================
function updateStats(totalFiltered) {
  const total = state.sites.length;
  const filtered = totalFiltered ?? getFilteredSites().length;
  document.getElementById("totalCount").textContent = total;
  document.getElementById("filteredCount").textContent = filtered;
  const footerSitesEl = document.getElementById("footerTotalSites");
  const footerCatsEl  = document.getElementById("footerTotalCategories");

  if (footerSitesEl) {
    // state.sites가 실제 렌더 기준 데이터라 이걸 쓰는 게 가장 정확
    footerSitesEl.textContent = Array.isArray(state.sites) ? state.sites.length : 0;
  }

  if (footerCatsEl) {
    // 카테고리 데이터(JSON)가 있으면 그걸 우선 사용
    const catsObj = (typeof getAllCategories === "function") ? getAllCategories() : null;
    let catCount = catsObj && Object.keys(catsObj).length ? Object.keys(catsObj).length : 0;

    // 혹시 categories json이 없을 때도 안전하게(사이트 데이터로부터 유니크 카테고리 계산)
    if (!catCount && Array.isArray(state.sites)) {
      catCount = new Set(state.sites.map(s => s.category).filter(Boolean)).size;
    }

    footerCatsEl.textContent = catCount;
  }


  const paginationInfo = document.getElementById("paginationInfo");
  if (paginationInfo) {
    const totalPages = Math.ceil(filtered / state.ITEMS_PER_PAGE) || 1;
    paginationInfo.textContent = `📄 ${state.ITEMS_PER_PAGE}개씩 보기 · 1/${totalPages} 페이지`;
  }
}

function showSearchStats(query, totalResults) {
  const statsContainer = document.getElementById('statsBar');
  if (!statsContainer) return;
  
  // 기존 검색 통계 제거
  const existingStats = document.querySelector('.search-stats');
  if (existingStats) existingStats.remove();
  
  const searchStats = document.createElement('div');
  searchStats.className = 'search-stats';
  searchStats.innerHTML = `
    🔍 "<strong>${escapeHtml(query)}</strong>"에 대한 검색 결과: 
    <strong>${totalResults}</strong>개 사이트 발견
  `;
  statsContainer.appendChild(searchStats);
  
  // 5초 후 자동 제거
  setTimeout(() => {
    if (searchStats.parentNode) {
      searchStats.remove();
    }
  }, 5000);
}

// ==================== DOM 생성 함수들 ====================
function createCategorySection(categoryKey) {
  const allCategories = getAllCategories();
  const info = allCategories[categoryKey];
  if (!info) return null;

  const section = document.createElement("div");
  section.className = "category-section";
  section.id = `${categoryKey}-section`;
  section.innerHTML = `
    <div class="category-header">
      <div class="category-info">
        <span class="category-icon">${info.icon}</span>
        <div>
          <div class="category-title">${info.name}</div>
          <div class="category-subtitle">${categoryKey}</div>
        </div>
      </div>
      <div class="category-count" id="${categoryKey}-count">0</div>
    </div>
    <div class="category-content" id="${categoryKey}-content"></div>
    <div class="pagination" id="${categoryKey}-pagination"></div> <!-- ✅ 페이지네이션 -->
  `;
  return section;
}


if (window.ddakpilmo && window.ddakpilmo.faviconLoader) {
  const originalLoadFavicon = window.ddakpilmo.faviconLoader.loadFavicon.bind(window.ddakpilmo.faviconLoader);
  
  window.ddakpilmo.faviconLoader.loadFavicon = async function(domain, fallbackText) {
    const cacheManager = window.memoryManager?.cacheManager;
    const cacheKey = `favicon_${domain}`;
    
    // 🧹 캐시 확인
    if (cacheManager) {
      const cached = cacheManager.get(cacheKey);
      if (cached) {
        return cached;
      }
    }
    
    // 원본 함수 호출
    const result = await originalLoadFavicon(domain, fallbackText);
    
    // 🧹 결과 캐싱
    if (cacheManager && result) {
      cacheManager.set(cacheKey, result);
    }
    
    return result;
  };
}

// 페이지네이션
function renderPagination(category, totalItems) {
  const container = document.getElementById(`${category}-pagination`);
  if (!container) return;

  // 🔥 버튼 캐시 저장소 (카테고리별)
  if (!container._btnCache) {
    container._btnCache = {};
  }

  const cache = container._btnCache;
  const totalPages = Math.ceil(totalItems / state.ITEMS_PER_PAGE);
  if (totalPages <= 1) {
    container.replaceChildren();
    if (container._btnCache) container._btnCache = {};
    return;
  }

  const currentPage = state.currentPageByCategory[category] || 1;
  const fragment = document.createDocumentFragment();


  // 버튼 생성 또는 캐싱된 버튼 가져오기
  function getBtn(key, label, onclick) {
    let btn = cache[key];
    if (!btn) {
      btn = document.createElement("button");
      cache[key] = btn;
    }

    // ✅ 매 렌더마다 상태 초기화 (캐시 재사용 버그 방지)
    btn.className = "page-btn";
    btn.removeAttribute("style");
    btn.disabled = false;
    btn.onclick = null;

    btn.textContent = label;
    btn.onclick = onclick;
    return btn;
  }
  function getJumpSelect(key, fromPage, toPage, onJump) {
    // fromPage~toPage 범위가 비었으면 null
    if (toPage < fromPage) return null;

    let wrap = cache[key];
    if (!wrap) {
      wrap = document.createElement("span");
      wrap.className = "page-select-wrapper";

      const select = document.createElement("select");
      select.className = "page-quick-jump";
      select.setAttribute("aria-label", "페이지 건너뛰기");

      wrap.appendChild(select);
      cache[key] = wrap;
    }

    const select = wrap.querySelector("select");
    // 매 렌더마다 초기화 (캐시 재사용 안전)
    select.replaceChildren();

    const defaultOpt = document.createElement("option");
    defaultOpt.textContent = "...";
    defaultOpt.selected = true;
    defaultOpt.disabled = true;
    select.appendChild(defaultOpt);

    for (let p = fromPage; p <= toPage; p++) {
      const opt = document.createElement("option");
      opt.value = String(p);
      opt.textContent = String(p);
      select.appendChild(opt);
    }

    select.onchange = (e) => {
      const v = parseInt(e.target.value, 10);
      if (!Number.isFinite(v)) return;

      onJump(v);

      // 다시 "."로 보이게 초기화
      select.selectedIndex = 0;

      // ✅ 렌더 후 포커스 보정 (키보드/접근성 + "깜빡임" 체감 감소)
      if (typeof afterNextRender === "function") {
        afterNextRender(() => {
          const header = document.querySelector(`#${category}-section .category-header`);
          if (header) {
            header.setAttribute("tabindex", "-1");
            header.focus({ preventScroll: true });
          }
        });
      }
    };
    return wrap;
  }

  // ◀ 이전 버튼
  fragment.appendChild(
    getBtn("prev", "◀", () => {
      if (currentPage > 1) {
        setPage(category, currentPage - 1, 800);
}
    })
  ).disabled = currentPage === 1;

  // 번호 버튼 생성 로직
  let start = Math.max(1, currentPage - 2);
  let end = Math.min(totalPages, currentPage + 2);

  // 1페이지 버튼 + ... 처리
  if (start > 1) {
    fragment.appendChild(
      getBtn("page-1", "1", () => {
        setPage(category, 1, 800);
})
    );
    if (start > 2) {
      const jump = getJumpSelect(
        "jump-start",
        2,
        start - 1,
        (num) => {
          setPage(category, num, 800);
}
      );
      if (jump) fragment.appendChild(jump);
    }
  }

  // start~end 번호 버튼 묶음
  for (let i = start; i <= end; i++) {
    const key = `page-${i}`;
    const btn = getBtn(key, String(i), () => {
      setPage(category, i, 800);
});
    btn.classList.toggle("active", i === currentPage);
    fragment.appendChild(btn);
  }

  // ... + 마지막 페이지
  if (end < totalPages) {
    if (end < totalPages - 1) {
      const jump = getJumpSelect(
        "jump-end",
        end + 1,
        totalPages - 1,
        (num) => {
          setPage(category, num, 800);
}
      );
      if (jump) fragment.appendChild(jump);
    }
    fragment.appendChild(
      getBtn(`page-${totalPages}`, String(totalPages), () => {
        setPage(category, totalPages, 800);
})
    );
  }
  const keep = new Set([
    "prev", "next",
    "ellipsis-start", "ellipsis-end",
    "page-1",
    `page-${totalPages}`,
  ]);

  for (let i = start; i <= end; i++) keep.add(`page-${i}`);

  // ✅ 캐시 정리(prune)
  for (const k in cache) {
    if (!keep.has(k)) delete cache[k];
  }
  // ▶ 다음 버튼
  fragment.appendChild(
    getBtn("next", "▶", () => {
      if (currentPage < totalPages) {
        setPage(category, currentPage + 1, 800);
}
    })
  ).disabled = currentPage === totalPages;

  // 🔥 성능 최적화된 DOM 교체
  container.replaceChildren(fragment);
}

function createSiteCard(site) {
  const card = document.createElement("div");
  card.className = "link-card";
  
  const siteKey = site.key;           // ✅ 불변 키
  const siteId  = site.id;            // (호환용) 기존 id도 남겨둘 수 있음

  if (site.key) card.dataset.key = String(site.key);
  if (siteKey) card.dataset.key = siteKey;  // ✅ 앞으로 라우팅은 key
  if (siteId)  card.dataset.id  = siteId;   // ✅ 과거 호환/디버깅용(선택)

  card.setAttribute("role", "button"); // 접근성 향상
  card.setAttribute("tabindex", "0");  // 키보드 탭 접근 가능

  // favicon
  const faviconUrl = "https://www.google.com/s2/favicons?sz=64&domain_url=" + encodeURIComponent(site.url || "");
  const left = document.createElement("div");
  left.className = "card-left";

  const img = document.createElement("img");
  img.src = faviconUrl;
  img.alt = (site.name || "") + " favicon";
  img.className = "site-favicon";
  img.loading = "lazy"; // 성능 최적화
  img.onerror = function () {
    const fallback = document.createElement("div");
    fallback.className = "fallback-icon";
    fallback.textContent = site.name && site.name.length > 0 ? site.name.charAt(0).toUpperCase() : "?";
    img.replaceWith(fallback);
  };
  left.appendChild(img);

  // 오른쪽
  const right = document.createElement("div");
  right.className = "card-right";

  // 헤더
  const header = document.createElement("div");
  header.className = "link-card-header";

  // 사이트 제목 (링크)
  const a = document.createElement("a");
  a.href = site.url || "#";
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  a.className = "site-title";
  // 검색어 하이라이트 함수가 있으면 사용, 없으면 그냥 텍스트
  const safeHighlight = (text) => typeof highlightSearchTerms === 'function' 
      ? highlightSearchTerms(text, state.currentSearchQuery) 
      : (text || '');
  a.innerHTML = safeHighlight(site.name || "이름 없음");

  // (정부 배지)
  if (site.isGov === true) {
    const govIcon = document.createElement("img");
    govIcon.className = "gov-flag korea-gov";
    govIcon.src = window.GOV_ICON_DATA_URL || "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Emblem_of_the_Government_of_the_Republic_of_Korea.svg/250px-Emblem_of_the_Government_of_the_Republic_of_Korea.svg.png";
    govIcon.alt = "대한민국정부 로고";
    a.appendChild(govIcon);
  }

  // (공유 버튼)
  const shareBtn = document.createElement("button");
  shareBtn.className = "share-btn";
  shareBtn.type = "button";
  shareBtn.textContent = "📤";
  shareBtn.onclick = (e) => {
    e.stopPropagation(); // 카드 클릭 이벤트 전파 중단
    if(typeof shareSite === 'function') shareSite(site.name || "", site.url || "");
  };
  card.appendChild(shareBtn);

  header.appendChild(a);

  // (상세 버튼)
  const detailBtn = document.createElement("button");
  detailBtn.className = "detail-btn";
  detailBtn.type = "button";
  detailBtn.textContent = "상세 설명";
  card.appendChild(detailBtn);

  // 설명
  const desc = document.createElement("p");
  desc.className = "site-desc";
  desc.innerHTML = safeHighlight(site.desc || "설명이 없습니다.");

  // 태그들
  const tags = document.createElement("div");
  tags.className = "link-card-tags";

  const catTag = document.createElement("span");
  catTag.className = "tag category-tag";
  catTag.textContent = getCategoryName(site.category);
  tags.appendChild(catTag);

  (site.ages || []).forEach(age => {
    const t = document.createElement("span");
    t.className = "tag age-tag";
    t.textContent = (typeof ageNames !== 'undefined' ? ageNames[age] : age);
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
    const header = card.querySelector('.link-card-header');
    if (!header) return;

    // (공유 버튼은 그대로)
    let shareBtn = card.querySelector('.share-btn');
    if (!shareBtn) {
      shareBtn = document.createElement('button');
      shareBtn.className = 'share-btn';
      shareBtn.textContent = '📤';
      shareBtn.title = "링크 공유";
      shareBtn.onclick = (e) => {e.stopPropagation(); shareSite(site?.name || '', site?.url || '');};
      card.appendChild(shareBtn);
    }

    // 예전 정부 표시 제거(텍스트/태그/SVG 등)
    card.querySelectorAll('.gov-badge, .gov-tag, .gov-flag').forEach(el => el.remove());

    // 정부 아님 → 종료
    if (!site || site.isGov !== true) return;

    const title = header.querySelector('.site-title');
    if (!title) return;

    // 제목 옆에 업로드 PNG 아이콘 부착
    const govIcon = document.createElement('img');
    govIcon.className = 'gov-flag korea-gov';
    govIcon.src = GOV_ICON_DATA_URL;
    govIcon.alt = '대한민국정부 로고';
    govIcon.title = '대한민국 정부 운영';
    title.appendChild(govIcon);
  } catch (e) {
    console.warn('ensureGovMarkers failed', e);
  }
}

function buildCardsFragment(sitesSlice) {
  const frag = document.createDocumentFragment();

  for (const site of sitesSlice) {
    const make = (window.ddakpilmo?.createSiteCardSafe || window.createSiteCard);
    const card = make(site);

    // ✅ 라우팅용 id 보장
    if (site?.id) card.dataset.id = site.id;

    // ✅ 상세 버튼 강제 생성 (중복 방지)
    if (!card.querySelector(".detail-btn")) {
      const detailBtn = document.createElement("button");
      detailBtn.className = "detail-btn";
      detailBtn.type = "button";
      detailBtn.textContent = "상세";

      card.appendChild(detailBtn);
    }

    // 기존 유지
    try { if (typeof ensureGovMarkers === "function") ensureGovMarkers(card, site); } catch {}
    const img = card.querySelector?.("img");
    if (img && !img.loading) img.loading = "lazy";

    frag.appendChild(card);
  }

  return frag;
}

// ==================== 렌더링 함수들 ====================
function renderCategorySections() {
  const container = DOM.categoriesContainer;
  if (!container.dataset.initialized) {
    container.innerHTML = "";
    const keys = Object.keys(getAllCategories());
    keys.forEach(key => {
      const section = createCategorySection(key);
      if (section) container.appendChild(section);
    });
    container.dataset.initialized = "true";
  }
}
function renderSitesLegacy() {
  try {
    const allKeys = Object.keys(getAllCategories());
    const filtered = getFilteredSites();
    const hasResults = filtered.length > 0;

    allKeys.forEach(category => {
      try {
        const content = document.getElementById(`${category}-content`);
        const section = document.getElementById(`${category}-section`);
        const countEl = document.getElementById(`${category}-count`);
        if (!content || !section) return;

        const sitesInCategory = filtered.filter(s => s.category === category);
        if (countEl) countEl.textContent = sitesInCategory.length;

        if (sitesInCategory.length > 0) {
          section.style.display = "block";

          const total = sitesInCategory.length;
          const totalPages = Math.ceil(total / state.ITEMS_PER_PAGE);
          let currentPage = state.currentPageByCategory[category] || 1;

          if (currentPage > totalPages) {
            currentPage = 1;
            state.currentPageByCategory[category] = 1;
          }

          const start = (currentPage - 1) * state.ITEMS_PER_PAGE;
          const end = start + state.ITEMS_PER_PAGE;
          const pagedSites = sitesInCategory.slice(start, end);

          const frag = buildCardsFragment(pagedSites);
          content.replaceChildren(frag);

          renderPagination(category, total);
        } else {
          section.style.display = "none";
          content.replaceChildren();
        }
      } catch (categoryError) {
        console.warn(`카테고리 ${category} 렌더링 오류:`, categoryError);
      }
    });

    const noResultsEl = document.getElementById("noResults");
    if (noResultsEl) noResultsEl.style.display = hasResults ? "none" : "block";
    updateStats(filtered.length);

  } catch (error) {
    console.error("사이트 렌더링 전체 오류:", error);

  } finally {
  }
}
window.renderSitesLegacy = renderSitesLegacy;
function getVisibleRangeForCategory(list, catKey) {
  const cur = (window.state?.currentCategoryFilter ?? 'all');
  const isAll = (cur === 'all' || cur === '전체');

  if (!isAll && cur === catKey) {
    // ✅ 카테고리 선택 상태: 이 카테고리는 '모두 보기'
    return list; // 슬라이스 없이 전부 반환
  }

  // 기존 페이징 유지
  const perPage = window.state?.ITEMS_PER_PAGE ?? 10;
  const page = (window.state?.currentPageByCategory?.[catKey] ?? 1);
  const start = (page - 1) * perPage;
  const end = start + perPage;
  return list.slice(start, end);
}

function updateCategoryPagingMode() {
  const cur = (window.state?.currentCategoryFilter ?? 'all');
  const isAll = (cur === 'all' || cur === '전체');
  document.body.classList.toggle('category-nopaging', !isAll);
}

// ==================== 이벤트 리스너 설정 ====================
function setupEventListeners() {
  console.log("🔧 메모리 안전 이벤트 리스너 설정 시작...");
  
  const manager = window.memoryManager?.eventManager;
  
  if (!manager) {
    console.warn("⚠️ 메모리 관리자가 없습니다. 기본 방식 사용");
    if (typeof setupEventListenersOriginal === 'function') {
      setupEventListenersOriginal();
    } else {
      const ipt = document.getElementById("searchInput");
      if (ipt && !ipt.__bound) {
        ipt.__bound = true;
      }
    }
    return;
  }
  

  try {
    const searchInput = document.getElementById("searchInput");
    const autocompleteList = document.getElementById("autocomplete-list");
    // ==================== 카드 클릭/상세 버튼 이벤트 위임 ====================
    const cardsContainer = document.getElementById("categoriesContainer");
    if (cardsContainer && !cardsContainer.__delegationBound) {
      const onContainerClick = (e) => {
        const card = e.target.closest(".link-card");
        if (!card) return;

        // 1) 링크(a) 클릭은 원래 동작 유지
        if (e.target.closest("a")) return;

        // 2) 공유 버튼은 shareBtn이 자체 처리(또는 여기서 처리해도 됨)
        if (e.target.closest(".share-btn")) return;

        // 3) 상세 버튼(detail-btn) 또는 카드 빈 영역 클릭 → 상세로 이동
        const isDetailBtn = !!e.target.closest(".detail-btn");

        // 카드 클릭도 상세로 보내고 싶으면 아래 조건을 true로 유지
        const shouldGoDetail = isDetailBtn;

        if (!shouldGoDetail) return;

        const key = card.dataset.key || card.dataset.id; // key 우선, 호환으로 id
        if (!key) return;

        const nextHash = `#site=${encodeURIComponent(key)}`;
        if (location.hash !== nextHash) location.hash = nextHash;
        else window.__route?.parseRoute?.();
      };

      const onContainerKeydown = (e) => {
        // Enter/Space로 카드 상세 진입 (접근성)
        if (e.key !== "Enter" && e.key !== " ") return;

        const card = e.target.closest(".link-card");
        if (!card) return;

        // 버튼/링크에 포커스가 있으면 그쪽 기본 동작을 방해하지 않음
        if (e.target.closest("a") || e.target.closest("button")) return;

        e.preventDefault();
        const key = card.dataset.key || card.dataset.id;
        if (!key) return;

        const nextHash = `#site=${encodeURIComponent(key)}`;
        if (location.hash !== nextHash) location.hash = nextHash;
        else window.__route?.parseRoute?.();
      };

      // ✅ 메모리 매니저 있으면 manager로 등록, 없으면 addEventListener
      try {
        const manager = window.memoryManager?.eventManager;
        if (manager) {
          manager.add(cardsContainer, "click", onContainerClick);
          manager.add(cardsContainer, "keydown", onContainerKeydown);
        } else {
          cardsContainer.addEventListener("click", onContainerClick);
          cardsContainer.addEventListener("keydown", onContainerKeydown);
        }
      } catch {
        // 안전장치
        cardsContainer.addEventListener("click", onContainerClick);
        cardsContainer.addEventListener("keydown", onContainerKeydown);
      }

      cardsContainer.__delegationBound = true; // ✅ 중복 바인딩 방지
    }

    let isComposing = false;

        if (!searchInput || !autocompleteList) {
      throw new Error("필수 검색 요소를 찾을 수 없습니다");
    }
    
    let currentFocus = -1;

    const debouncedSearch = debounce((value) => {
      try {
        setFilters({ currentSearchQuery: value });
      } catch (error) {
        console.error('검색 처리 오류:', error);
      }
    }, 300);
    
    manager.add(searchInput, "input", function() {
      if (isComposing) return;
      const query = this.value.trim();
      autocompleteList.innerHTML = "";
      currentFocus = -1;

      debouncedSearch(query);

      if (!query) return;

      try {
        let matches = [];
        
        if (typeof fuse !== "undefined" && fuse) {
          matches = fuse.search(query).map(r => r.item);
        }

        const jamoRegex = /[\u3131-\u318E]/;
        if (jamoRegex.test(query)) {
          const jamoQuery = query.toLowerCase();
          const jamoMatches = state.sites.filter(s =>
            (s.chosungFull || "").toLowerCase().includes(jamoQuery)
          );
          const map = {};
          matches.concat(jamoMatches).forEach(m => { 
            if (m && m.name) map[m.name] = m; 
          });
          matches = Object.values(map);
        }

        matches.slice(0, 8).forEach(site => {
          if (!site || !site.name) return;
          
          const item = document.createElement("div");
          item.className = "autocomplete-item";
          
          const siteName = typeof highlightSearchTerms === 'function' 
            ? highlightSearchTerms(site.name, query) 
            : escapeHtml(site.name);

          const siteDesc = typeof highlightSearchTerms === 'function' 
            ? highlightSearchTerms(site.desc || "", query) 
            : escapeHtml(site.desc || "");

          item.innerHTML = `
            <strong>${siteName}</strong><br>
            <span class="autocomplete-desc">${siteDesc}</span>
          `;
  
          manager.add(item, "click", function(e) {
            e.preventDefault();
            e.stopPropagation();
    
            searchInput.value = site.name;
            // ✅ UI 정리 먼저
            autocompleteList.innerHTML = "";
            currentFocus = -1;

            // ✅ 상태 변경은 중앙화로
            setFilters({ currentSearchQuery: site.name });
          });
  
          autocompleteList.appendChild(item);
        });
        
      } catch (error) {
        console.error('자동완성 처리 오류:', error);
      }
    });

    manager.add(searchInput, "keydown", function(e) {
      // 리스트에서 "항목"만 정확히 가져오기
      const items = autocompleteList.querySelectorAll(".autocomplete-item, .item, .ac-item, .suggestion");
      const hasItems = items && items.length > 0;

      if ((e.key === "ArrowDown" || e.key === "ArrowUp") && hasItems) {
        e.preventDefault();
        if (e.key === "ArrowDown") {
          currentFocus = (typeof currentFocus === "number" ? currentFocus : -1) + 1;
        } else {
        currentFocus = (typeof currentFocus === "number" ? currentFocus : items.length) - 1;
        }
        currentFocus = (currentFocus + items.length) % items.length;

        // 활성 표시
        removeActive(items);
        items[currentFocus].classList.add("active");
        items[currentFocus].scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });

        // ✅ 제목만 입력창에 즉시 반영 + 검색 실행
        const val = getAutocompleteTitle(items[currentFocus]);
        this.value = val;
        if (typeof debouncedSearch === "function") debouncedSearch(val);

      } else if (e.key === "Enter") {
        if (hasItems && currentFocus > -1 && items[currentFocus]) {
          e.preventDefault();
          const val = getAutocompleteTitle(items[currentFocus]);
          this.value = val;
          if (typeof debouncedSearch === "function") debouncedSearch(val);
          autocompleteList.innerHTML = "";
          currentFocus = -1;
        }
      } else if (e.key === "Escape") {
        autocompleteList.innerHTML = "";
        currentFocus = -1;
        this.blur();
      }
    });

    // ✅ 자동완성 항목에서 "제목만" 뽑아내는 유틸
    function getAutocompleteTitle(el) {
      if (!el) return '';
      // 우선순위: data-value > data-title > 명시적 타이틀 셀렉터 > 설명 제거 후 텍스트
      const byData = el.getAttribute('data-value') || el.getAttribute('data-title');
      if (byData) return byData.trim();

      const titleEl =
        el.querySelector('[data-role="title"]') ||
        el.querySelector('.title') ||
        el.querySelector('.item-title') ||
        el.querySelector('.name') ||
        el.firstElementChild;

      if (titleEl) return titleEl.textContent.trim();

      // 마지막 수단: 복제해서 설명/부가정보 제거 후 텍스트만
      const clone = el.cloneNode(true);
      clone.querySelectorAll('.desc, .description, .meta, .subtitle, .extra, small').forEach(n => n.remove());
      return clone.textContent.trim();
    }

    function addActive(items) {
      if (!items || items.length === 0) return;
      removeActive(items);
      if (currentFocus >= items.length) currentFocus = 0;
      if (currentFocus < 0) currentFocus = items.length - 1;
      const activeItem = items[currentFocus];
      if (activeItem) {
        activeItem.classList.add("active");
        activeItem.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
      }
    }

    function removeActive(items) {
      for (let i = 0; i < items.length; i++) {
        items[i].classList.remove("active");
      }
    }

    manager.add(document, "click", function(e) {
      if (e.target !== searchInput && !autocompleteList.contains(e.target)) {
        autocompleteList.innerHTML = "";
        currentFocus = -1;
      }
    });

    // 🔥 연령대 필터 - 페이지 초기화 추가
    document.querySelectorAll("#ageFilter .filter-btn").forEach(btn => {
      manager.add(btn, "click", (e) => {
        document.querySelectorAll("#ageFilter .filter-btn").forEach(b => {
          b.classList.remove("active");
        });
        e.currentTarget.classList.add("active");
        setFilters({ currentAgeFilter: e.currentTarget.dataset.age });
      });
    });

    // 🔥 과목 필터 - 페이지 초기화 추가
    const subjectFilter = document.getElementById("subjectFilter");
    if (subjectFilter) {
      manager.add(subjectFilter, "change", (e) => {
        setFilters({ currentSubjectFilter: e.target.value });
      });
    }

    // 🔥 정부 필터
    document.querySelectorAll("#govFilter .filter-btn").forEach(btn => {
      manager.add(btn, "click", (e) => {
        document.querySelectorAll("#govFilter .filter-btn").forEach(b => {
          b.classList.remove("active");
        });
        e.currentTarget.classList.add("active");
        setFilters({ currentGovFilter: e.currentTarget.dataset.gov }); // all | gov
      });
    });

    const darkToggle = document.getElementById("darkToggle");
    if (darkToggle) {
      manager.add(darkToggle, "click", () => {
        const willDark = !document.body.classList.contains("dark");
        window.applyTheme?.(willDark ? 'dark' : 'light');
      });
    }

    const resetBtn = document.getElementById("resetBtn");
    const viewAllBtn = document.getElementById("viewAllBtn");
    
    if (resetBtn) {
      manager.add(resetBtn, "click", resetFilters);
    }
    if (viewAllBtn) {
      manager.add(viewAllBtn, "click", resetFilters);
    }

    const itemsPerPage = document.getElementById("itemsPerPage");
    if (itemsPerPage) {
      manager.add(itemsPerPage, "change", (e) => {
        setState(
          { ITEMS_PER_PAGE: parseInt(e.target.value, 10) },
          { resetPages: true, render: true }
        );
      });
    }

    manager.add(document, "keydown", (e) => {
      if (e.ctrlKey && e.key === 'k') {
        e.preventDefault();
        searchInput.focus();
        searchInput.select();
      }
    });

    console.log("✅ 메모리 안전 이벤트 리스너 설정 완료");
    
  } catch (error) {
    console.error("❌ 이벤트 리스너 설정 실패:", error);
    throw error;
  }
}

function resetFilters() {
  // ✅ 상태는 중앙함수로 한 번에
  setState({
    currentAgeFilter: "all",
    currentCategoryFilter: "all",
    currentSubjectFilter: "all",
    currentGovFilter: "all",
    currentSearchQuery: "",
    expandedCategories: {}
  }, { resetPages: true, render: true });

  // UI 초기화
  const searchInput = document.getElementById("searchInput");
  if (searchInput) searchInput.value = "";

  // 연령대 필터 리셋
  document.querySelectorAll("#ageFilter .filter-btn").forEach(b => b.classList.remove("active"));
  const ageAll = document.querySelector("#ageFilter .filter-btn[data-age='all']");
  if (ageAll) ageAll.classList.add("active");

  // 과목 필터 리셋
  const subjectFilter = document.getElementById("subjectFilter");
  if (subjectFilter) subjectFilter.value = "all";

  // 카테고리 탭 리셋(active)
  document.querySelectorAll("#filterTabs .tab-btn").forEach(b => b.classList.remove("active"));
  const allTab = document.querySelector("#filterTabs .tab-btn[data-cat='all']");
  if (allTab) allTab.classList.add("active");

  // ✅ (핵심1) 카테고리 선택 모드 해제에 따른 바디 클래스/모드 원복
  if (typeof updateCategoryPagingMode === "function") updateCategoryPagingMode();

  // ✅ (핵심2) 확장 상태 원복
  document.querySelectorAll(".category-section.expanded-category")
    .forEach(sec => sec.classList.remove("expanded-category"));

  // ✅ (안전장치) pagination이 숨김/세로 상태로 고착되는 것 방지
  document.querySelectorAll("[id$='-pagination']").forEach(pager => {
    pager.removeAttribute("style");
    pager._btnCache = {};
    pager.classList.add("pagination");
  });
  showToast("모든 필터가 초기화되었습니다");
}


// ==================== 공유 기능 ====================
function shareSite(siteName, url) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(url).then(() => {
      showToast("링크가 복사되었습니다!");
    });
  } else {
    // 폴백 방법
    const ta = document.createElement("textarea");
    ta.value = url;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
    showToast("링크가 복사되었습니다!");
  }
  //  선택 카테고리 확장 클래스 원복
  document.querySelectorAll(".category-section.expanded-category")
    .forEach(sec => sec.classList.remove("expanded-category"));
  //  페이지네이션 인라인 style/캐시도 원복(숨김 상태 고착 방지)
  document.querySelectorAll(".pagination").forEach(p => {
    p.style.display = '';
    p._btnCache = {};
  });
}

let fuse;

function initFuse() {
  fuse = new Fuse(state.sites, {
    keys: ["name", "desc", "subjects", "category"],
    threshold: 0.4,
    minMatchCharLength: 1,
    ignoreLocation: true,   // 단어 위치 상관없이 매칭
    findAllMatches: true    // 여러 매칭 찾아줌
  });
}

// ✅ 구글시트(웹앱) JSON API 주소
const DETAILS_API_URL = "https://script.google.com/macros/s/AKfycbxn5IBkNF6mloJZ3WkbY4jzdggOrPnWo9RW7zVLrO6Gawasv2J77x18F-XDB5_plTbfig/exec/s/AKfycbwR4uC3aEqcznGJ7_U9KayDn6TufxJ1-3xGNp5bVYK_ts7qrNB1iy_MqZ8YIKW6HY7_gg/exec";

// ✅ 시트에서 상세설명 로드 (캐시 포함)
async function loadDetailsFromSheet({ cacheMinutes = 60 } = {}) {
  const cacheKey = "detailsSheetCache:v1";
  const now = Date.now();

  // 1) 캐시 우선
  try {
    const cached = JSON.parse(localStorage.getItem(cacheKey) || "null");
    if (cached?.ts && (now - cached.ts) < cacheMinutes * 60 * 1000 && cached?.data?.items) {
      window.siteDetailMap = window.siteDetailMap || {};
      Object.assign(window.siteDetailMap, cached.data.items);
      return;
    }
  } catch {}

  // 2) 네트워크
  const res = await fetch(DETAILS_API_URL, { cache: "no-store" });
  if (!res.ok) throw new Error("details sheet load failed: " + res.status);

  const data = await res.json();

  window.siteDetailMap = window.siteDetailMap || {};
  Object.assign(window.siteDetailMap, data.items || {});

  // 3) 캐시 저장
  try {
    localStorage.setItem(cacheKey, JSON.stringify({ ts: now, data }));
  } catch {}
}

// ==================== JSON 데이터 로드 ====================
async function loadJSONData() {
  try {
    const [categoriesRes, sitesRes] = await Promise.all([
      fetch("data/categories.json"),
      fetch("data/sites.json")
    ]);

    if (!categoriesRes.ok || !sitesRes.ok) {
      throw new Error("JSON fetch 실패");
    }

    window.defaultCategories = await categoriesRes.json();

    const sitesData = await sitesRes.json();

    window.initialSites = Array.isArray(sitesData) ? sitesData : [];

    console.log("✅ JSON 데이터 로드 완료", {
      categories: Object.keys(window.defaultCategories).length,
      sites: window.initialSites.length
    });


  } catch (err) {
    console.error("❌ JSON 로딩 에러:", err);
    handleDataLoadFailure();
    throw err;
  }
}


// ==================== json 데이터 로드 끝 ====================

// ==================== Settings: 단일 Source of Truth ====================
state.settings = state.settings || { theme: "system", font: "normal", anim: "on", radius: "round" };

function loadSettingsFromStorage() {
  try {
    const raw = localStorage.getItem("siteSettings");
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      state.settings = { ...state.settings, ...parsed };
    }
  } catch {}
  window.state = state;
}

function applyAllSettings() {
  const s = state.settings || {};
  window.applyTheme?.(s.theme);
  window.applyFontSize?.(s.font);
  window.applyAnimation?.(s.anim);
  window.applyRadius?.(s.radius);
}

// ==================== 초기화 함수 ====================
function init() {
  console.log("🌟 딱필모 안전 초기화 시작...");
  window.buildCategoryTabs?.();
  loadSettingsFromStorage();
  applyAllSettings();
  applyAllSettingsFromStorage();

  
  try {
    // 오류 처리 시스템 확인
    if (!window.ddakpilmo || !window.ddakpilmo.errorManager) {
      console.warn("⚠️ 오류 처리 시스템이 로드되지 않았습니다");
    }

    // 외부 데이터 확인 및 안전한 초기화
    if (typeof initialSites !== 'undefined' && Array.isArray(initialSites)) {
      state.sites = initialSites.map(site => {
        const nameCh = safeGetChosung(site.name || "");
        const descCh = safeGetChosung(site.desc || "");
        try {
          const url = site.url || "";
          // 🔎 정부 도메인 자동 감지 (.go.kr, gov.kr)
          let isGovAuto = false;
          try {
            const host = new URL(url).hostname || "";
            isGovAuto = /(^|\.)gov\.kr$/i.test(host) || /(^|\.)[a-z0-9-]+\.go\.kr$/i.test(host);
          } catch (e) {
            // URL 파싱이 안 되면 단순 패턴으로 백업
            isGovAuto = /(\.go\.kr|gov\.kr)(\/|$)/i.test(url);
          }

          const searchText = normalizeTextForSearch(
            site.name + " " +
            (site.desc || "") + " " +
            getCategoryName(site.category) + " " +
            (site.ages || []).map(a => ageNames[a]).join(" ") + " " +
            (site.subjects || []).map(sub => subjectNames[sub]).join(" ")
          );

          const jamoText =
            toJamoString(searchText) +
            " " +
            (nameCh + " " + descCh).toLowerCase();

          return {
            ...site,
            isGov: typeof site.isGov === "boolean" ? site.isGov : isGovAuto,
            chosungName: nameCh,
            chosungDesc: descCh,
            chosungFull: nameCh + " " + descCh,
            __searchText: normalizeTextForSearch(
              (site.name || "") + " " +
              (site.desc || "") + " " +
              getCategoryName(site.category) + " " +
              (Array.isArray(site.ages) ? site.ages : []).map(a => ageNames[a]).join(" ") + " " +
              (Array.isArray(site.subjects) ? site.subjects : []).map(sub => subjectNames[sub]).join(" ")
            ),
            __jamoText: toJamoString(
              normalizeTextForSearch(
                (site.name || "") + " " +
                (site.desc || "") + " " +
                getCategoryName(site.category) + " " +
                (Array.isArray(site.ages) ? site.ages : []).map(a => ageNames[a]).join(" ") + " " +
                (Array.isArray(site.subjects) ? site.subjects : []).map(sub => subjectNames[sub]).join(" ")
              )
            ) + " " + (nameCh + " " + descCh).toLowerCase()
          };
        } catch (error) {
          console.warn('사이트 데이터 처리 오류:', site, error);
          return {
            name: site.name || "알 수 없는 사이트",
            url: site.url || "#",
            desc: site.desc || "설명 없음",
            category: site.category || "general",
            ages: Array.isArray(site.ages) ? site.ages : ["adult"],
            subjects: Array.isArray(site.subjects) ? site.subjects : ["general"],
            isGov: false,
            chosungName: safeGetChosung(site.name || ""),
            chosungDesc: safeGetChosung(site.desc || ""),
            chosungFull: safeGetChosung(site.name || "") + " " + safeGetChosung(site.desc || "")
          };
        }
      });
      console.log(`✅ ${state.sites.length}개 사이트 안전 로드 완료`);
    } else {
      console.error("❌ initialSites 데이터를 찾을 수 없습니다");
      handleDataLoadFailure();
      return;
    }
    
    // UI 초기화 (단계별 안전 처리)
    const initSteps = [
      { name: '테마 초기화', func: () => window.initializeTheme?.() },
      { name: '카테고리 섹션', func: () => window.renderCategorySections?.() },
      { name: '카테고리 탭', func: () => window.buildCategoryTabs?.() },
      { name: '이벤트 리스너', func: () => window.setupEventListeners?.() },
      { name: '설정 패널', func: () => window.setupSettingsPanel?.() },
      { name: '스크롤 버튼', func: () => window.setupScrollFabs?.() },
      { name: 'ID 보장', func: () => window.ensureSiteIds?.() },
      { name: '사이트 렌더링', func: () => window.renderSites?.() },
      { name: '해시 라우팅', func: () => window.setupHashRouting?.() },
      { name: '검색 엔진', func: () => window.initFuse?.() }
    ];

    let successCount = 0;
    initSteps.forEach(step => {
      try {
        step.func();
        console.log(`✅ ${step.name} 완료`);
        successCount++;
      } catch (error) {
        console.error(`❌ ${step.name} 실패:`, error);
        if (typeof showToast === 'function') {
          showToast(`⚠️ ${step.name}에 문제가 발생했습니다`, 'warning');
        }
      }
    });

    console.log(`🎯 초기화 완료: ${successCount}/${initSteps.length} 성공`);
    
    if (successCount >= 4 && state.sites.length > 0) {
      setTimeout(() => {
        showToast("🌟 딱필모에 오신 것을 환영합니다!", 'success');
      }, 1000);
    }
    
  } catch (error) {
    console.error("❌ 초기화 중 심각한 오류:", error);
    handleInitializationFailure(error);
  }
  updateStats();
}

// ==================== 전역 함수 노출 ====================

window.shareSite = shareSite;

// 🔁 DOMContentLoaded 시, 단계적 러너로 실행
document.addEventListener('DOMContentLoaded', () => {

  // 0) JSON 데이터 먼저 로드
  initRunner.add('data:load-json', async () => {
    await loadJSONData();
  });
  initRunner.add('data:load-details-sheet', async () => {
    await loadDetailsFromSheet({ cacheMinutes: 60 });
    if (location.hash.includes('#site=')) window.__route?.parseRoute?.();
  }, { after: ['data:load-json'] });

  initRunner.add('data:ensure-site-ids', () => {
    if (!window.state) window.state = { sites: [] };
    if (!Array.isArray(window.state.sites) || window.state.sites.length === 0) {
      window.state.sites = Array.isArray(window.initialSites) ? window.initialSites : [];
    }
    window.ensureSiteIds?.();
  }, { after: ['data:load-json'] });
  // 1) 레거시 init 함수 실행
  initRunner.add('legacy:init', () => {
    try { if (typeof init === 'function') init(); }
    catch(e){ console.warn('[init] legacy/init error:', e); }
  }, { after: ['data:load-json'] });
  // 2) 검색어 하이라이트 적용
  initRunner.add('ui:highlight', () => {
    try {
      const q = (window.state?.currentSearchQuery || document.getElementById('searchInput')?.value || '').trim();
      if (q && window.ddakHighlight) {
        const scope = document.getElementById('categoriesContainer') || document;
        window.ddakHighlight.apply(q, scope);
      }
    } catch(e){ console.debug('highlight skipped', e); }
  }, { after: ['legacy:init'] });

  // 3) 통계 동기화
  initRunner.add('ui:sync-stats', () => {
    if (typeof updateGlobalStats === 'function') updateGlobalStats();
  }, { after: ['legacy:init'] });

  // 4) 실행
  initRunner.run().then(rep => {
    console.log('[init] report:', rep, initRunner.status());
  });
});


// 온라인/오프라인 감지
window.addEventListener('online', () => showToast('🌐 인터넷이 연결되었습니다'));
window.addEventListener('offline', () => showToast('📴 인터넷 연결이 끊어졌습니다'));

console.log("🎉 딱필모 스크립트 로드 완료!");

// 페이지 로드 완료 후 자동으로 WARN 레벨 설정
document.addEventListener('DOMContentLoaded', function() {
  // 메모리 관리자가 초기화된 후 실행
  setTimeout(() => {
    if (window.memoryManager && window.memoryManager.setLogLevel && window.LogLevel) {
      window.memoryManager.setLogLevel(LogLevel.WARN);
      console.log('✅ 로그 레벨이 WARN으로 설정되었습니다');
    }
  }, 1000);
});

(function(){
  const HL_TAG = 'span';
  const HL_CLASS = 'search-highlight';

  function escapeRegExp(s){ return s.replace(/[.*+?^${}()|[\]\\]/g, '\\'); }

  function buildPattern(query){
    const q = (query || '').trim();
    if (!q) return null;

    const letters = q.split(/\s+/);
    const allSingle = letters.length > 1 && letters.every(x => x.length === 1);
    if (allSingle) {
      return new RegExp(letters.map(ch => escapeRegExp(ch)).join('\\s*'), 'gi');
    }

    const tokens = q.split(/\s+/).map(escapeRegExp).filter(Boolean);
    if (!tokens.length) return null;
    return new RegExp('(' + tokens.join('|') + ')', 'gi');
  }

  function clearHighlights(root){
    const marks = root.querySelectorAll(`${HL_TAG}.${HL_CLASS}`);
    marks.forEach(mark => {
      const parent = mark.parentNode;
      while (mark.firstChild) parent.insertBefore(mark.firstChild, mark);
      parent.removeChild(mark);
      parent.normalize();
    });
  }

  function highlightInTextNode(node, regex){
    const text = node.nodeValue;
    regex.lastIndex = 0;
    const match = regex.exec(text);
    if (!match) return;

    const frag = document.createDocumentFragment();
    let lastIndex = 0;
    regex.lastIndex = 0;

    let m;
    while ((m = regex.exec(text)) !== null) {
      const start = m.index;
      const end = start + m[0].length;
      if (start > lastIndex) frag.appendChild(document.createTextNode(text.slice(lastIndex, start)));

      const mark = document.createElement(HL_TAG);
      mark.className = HL_CLASS;
      mark.textContent = text.slice(start, end);
      frag.appendChild(mark);

      lastIndex = end;
      if (regex.lastIndex === start) regex.lastIndex++;
    }
    if (lastIndex < text.length) frag.appendChild(document.createTextNode(text.slice(lastIndex)));

    node.parentNode.replaceChild(frag, node);
  }

  function highlightInNode(root, query){
    const regex = buildPattern(query);
    if (!regex) { clearHighlights(root); return; }

    clearHighlights(root);

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(n){
        if (!n.nodeValue || !n.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        let parent = n.parentNode;
        while (parent && parent !== root) {
          if (parent.classList && parent.classList.contains('share-btn')) {
            return NodeFilter.FILTER_REJECT;
          }
          parent = parent.parentNode;
        }
        
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    const targets = [];
    while (walker.nextNode()) targets.push(walker.currentNode);
    targets.forEach(tn => highlightInTextNode(tn, regex));
  }

  window.ddakHighlight = {
    apply(query, scope=document) { highlightInNode(scope, query || ''); },
    clear(scope=document) { clearHighlights(scope); }
  };
})();

function getAllSites(){
  if (window.state && Array.isArray(window.state.sites) && window.state.sites.length) {
    return window.state.sites;
  }
  // 로딩 전/백업
  if (Array.isArray(window.initialSites) && window.initialSites.length) return window.initialSites;
  return window.sitesData || window.allSites || [];
}


function buildSiteIndex(){
  const map = new Map();

  const put = (k, s) => {
    const v = String(k || "").trim();
    if (!v) return;
    map.set(v, s);
    map.set(v.toLowerCase(), s); // ✅ 대소문자 무시용
  };

  for (const s of getAllSites()){
    if (!s) continue;

    // ✅ 영구키 우선
    put(s.key, s);
    put(s.id, s);
    put(s.slug, s);
    put(s.name, s);
  }

  return map;
}


function setupHashRouting() {
  // 1. 제어할 요소들 선택
  const iconEl = document.getElementById('detailFavicon');
  const detailView = document.getElementById('detailView');
  const mainContainer = document.querySelector('.container'); // 제목, 검색창 등을 포함한 전체 래퍼
  let savedScrollY = 0;  // 스크롤 저장
  // 상세 뷰 내부 요소들
  const backBtn = document.getElementById('detailBackBtn');
  const titleEl = document.getElementById('detailTitle');
  const descEl = document.getElementById('detailDesc');
  const metaEl = document.getElementById('detailMeta');
  const relatedEl = document.getElementById('detailRelated');
  const goBtn = document.getElementById('detailGoBtn');
  const copyBtn = document.getElementById('detailCopyBtn');

  // 요소가 없으면 중단 (에러 방지)
  if (!detailView || !mainContainer) {
    console.error("필수 요소를 찾을 수 없습니다. (detailView or container missing)");
    return;
  }

  // 데이터 인덱스 생성
  // Prevent browser auto scroll restoration from overriding our saved position
  try {
    if ("scrollRestoration" in history) {
      history.scrollRestoration = "manual";
    }
  } catch {}

  let siteIndex = buildSiteIndex();
  // ✅ siteIndex는 매 라우팅마다 재생성하지 말고, 데이터가 바뀌었을 때만 갱신
  let _siteIndexSitesRef = getAllSites();
  let _siteIndexSitesLen = Array.isArray(_siteIndexSitesRef) ? _siteIndexSitesRef.length : -1;

  function ensureSiteIndexUpToDate() {
    const list = getAllSites();
    const len = Array.isArray(list) ? list.length : -1;

    // 참조가 바뀌었거나 길이가 바뀌었거나(로드 완료 시점) 아직 없으면 재생성
    if (!siteIndex || _siteIndexSitesRef !== list || _siteIndexSitesLen !== len) {
      siteIndex = buildSiteIndex();
      _siteIndexSitesRef = list;
      _siteIndexSitesLen = len;
    }
  }


  // === 화면 전환 함수 ===
  
  // 1) 목록 보기 (상세 뷰 숨김)
  function restoreListScroll() {
    const y = Number.isFinite(savedScrollY) ? savedScrollY : 0;
    const restore = () => window.scrollTo({ top: y, behavior: "auto" });
    requestAnimationFrame(() => {
      restore();
      setTimeout(restore, 0);
      setTimeout(restore, 50);
    });
  }

  function showList() {
    detailView.style.display = 'none'; // 상세 숨김
    detailView.setAttribute('aria-hidden', 'true');

    mainContainer.style.display = '';
    
    // 스크롤 위치 초기화는 필요 시 주석 해제
    // window.scrollTo({ top: 0, behavior: 'auto' });
    // display 복구 직후, 한 프레임 뒤 복원 (레이아웃 복구 후 스크롤)
    restoreListScroll();
    if (typeof afterNextRender === "function") {
      afterNextRender(restoreListScroll);
    }
  }

  // 2) 상세 보기 (목록 숨김)
  function showDetail(site) {
    savedScrollY = window.scrollY || 0; // 현재 스크롤 위치 저장
    window.__currentSite = site;
    // 검색창, 필터 등을 포함한 메인 컨테이너 전체를 숨김
    mainContainer.style.display = 'none';

    // 상세 뷰 보이기
    detailView.style.display = "block";
    detailView.setAttribute('aria-hidden', 'false');

    // --- 데이터 채우기 ---
    
    // 제목 & 설명 (검색어 하이라이트 적용)
    // highlightSearchTerms 함수가 없으면 그냥 텍스트 넣도록 폴백 처리
    const safeHighlight = (text) => typeof highlightSearchTerms === 'function' 
      ? highlightSearchTerms(text, state.currentSearchQuery) 
      : (text || '');

    // ✅ 제목 (하이라이트 유지) + 정부 로고 붙이기 위한 래핑
    titleEl.innerHTML = `<span class="detail-title-text">${safeHighlight(site.name || "이름 없음")}</span>`;

    // ✅ 중복 방지: 기존 정부 아이콘 제거
    titleEl.querySelectorAll(".gov-flag, .detail-gov-flag").forEach(el => el.remove());

    // ✅ 정부 운영이면 제목 옆에 로고 추가
    if (site?.isGov === true && typeof GOV_ICON_DATA_URL !== "undefined") {
      const govIcon = document.createElement("img");
      govIcon.className = "gov-flag korea-gov detail-gov-flag";
      govIcon.src = GOV_ICON_DATA_URL;
      govIcon.alt = "대한민국정부 로고";
      govIcon.title = "대한민국 정부 운영";
      titleEl.appendChild(govIcon);
    }

    const detail = window.siteDetailMap?.[site.key] || window.siteDetailMap?.[site.id] || null;
    const detailText = detail?.detailDesc || detail?.description || detail?.desc || "";

    const rawDesc = detailText || site.description || site.desc || '';
    descEl.textContent = String(rawDesc ?? '').trim();
    // 파비콘
    if (iconEl) {
      const faviconUrl = "https://www.google.com/s2/favicons?sz=128&domain_url=" + encodeURIComponent(site.url || '');
      iconEl.src = faviconUrl;
      iconEl.alt = (site.name || '') + ' favicon';
      iconEl.style.display = site.url ? '' : 'none';
    }

    // 바로가기 버튼 링크 설정
    const url = site.url || site.link || '#';
    goBtn.href = url;

    // 메타 정보 (태그 등)
    metaEl.innerHTML = '';
    const chips = [];

    // ✅ 정부 운영 태그(칩)
    if (site?.isGov === true) {
      chips.push("🏛️ 정부 운영");
    }

    // 과목 (subjects가 배열인지 확인)
    if (Array.isArray(site.subjects)) {
        chips.push(`📚 ${site.subjects.map(s => subjectNames[s] || s).join(', ')}`);
    }
    // 연령
    if (Array.isArray(site.ages)) {
        chips.push(`👶 ${site.ages.map(a => ageNames[a] || a).join(', ')}`);
    }
    // 카테고리
    if (site.category) {
        chips.push(`📂 ${getCategoryName(site.category)}`);
    }

    chips.forEach(text => {
      const span = document.createElement('span');
      span.className = 'detail-chip';
      span.textContent = text;
      metaEl.appendChild(span);
    });

    // 🔧 상세 태그를 제목 바로 아래로 이동
    const titleWrap = document.querySelector('.detail-title-wrap');
    const meta = document.getElementById('detailMeta');
    const desc = document.getElementById('detailDesc');

    if (titleWrap && meta && desc) {
      // 설명(p) 바로 앞에 태그 삽입
      titleWrap.insertBefore(meta, desc);
    }

    // --- 관련 추천 사이트 로직 ---
    relatedEl.innerHTML = '';
    const all = getAllSites();
    
    // 추천 알고리즘: 같은 과목 > 같은 카테고리 순으로 점수 부여
    const rel = all
      .filter(x => x && (x.id || x.name) && x.id !== site.id) // 자기 자신 제외
      .map(x => {
        let score = 0;
        // 카테고리 일치 시 1점
        if (site.category && x.category === site.category) score += 1;
        
        // 과목 일치 시 2점 (배열 교집합 확인)
        const siteSubs = Array.isArray(site.subjects) ? site.subjects : [];
        const xSubs = Array.isArray(x.subjects) ? x.subjects : [];
        const hasCommon = siteSubs.some(s => xSubs.includes(s));
        if (hasCommon) score += 2;

        return { item: x, score: score };
      })
      .filter(o => o.score > 0) // 연관성 있는 것만
      .sort((a, b) => b.score - a.score) // 점수 높은 순 정렬
      .slice(0, 6) // 최대 n개만 노출
      .map(o => o.item);

    if (rel.length === 0) {
        relatedEl.innerHTML = '<p style="color:#999; font-size:14px;">관련된 추천 사이트가 없습니다.</p>';
    } else {
        rel.forEach(s => {
          const a = document.createElement('a');
          a.className = 'detail-go'; // 기존 버튼 스타일 재활용하거나 새로 만드셔도 됩니다
          a.style.display = 'block';
          a.style.textAlign = 'center';
          a.style.marginTop = '8px';
          const k = s.key || s.id; // ✅ key 우선, 호환
          a.href = `#site=${encodeURIComponent(k)}`;
          a.textContent = s.name;
          relatedEl.appendChild(a);
        });
    }

    // 상세 페이지 진입 시 스크롤 맨 위로
    window.scrollTo({ top: 0, behavior: 'auto' });
  }
  
  // === 라우팅 로직 (주소창의 # 변화 감지) ===
  function parseRoute() {
    ensureSiteIndexUpToDate();
    const hash = location.hash || "";

    // ✅ 1) 소개 페이지 먼저 처리
    if (hash.startsWith("#/about")) {
      // 기존 뷰 숨기기
      detailView.style.display = "none";
      detailView.setAttribute("aria-hidden", "true");

      const listWrap = document.querySelector(".ui-scale-wrap");
      if (listWrap) listWrap.style.display = "none";

      // tipsView 숨기기
      const tips = document.getElementById("tipsView");
      if (tips) {
        tips.style.display = "none";
        tips.setAttribute("aria-hidden", "true");
      }

      // aboutView 표시
      const about = document.getElementById("aboutView");
      if (about) {
        about.style.display = "block";
        about.setAttribute("aria-hidden", "false");
      }

      // 🔴 🔴 🔴 여기다 (이게 핵심)
      window.renderAboutView?.();
      window.fillAboutStats?.();
      window.initScrollReveal?.(about);

      // 소개 진입 시 상단 고정
      window.scrollTo({ top: 0, behavior: "auto" });
      return;
    }

    // ✅ 1-2) Tips 페이지 처리
    if (hash.startsWith("#/tips")) {
      // 기존 뷰 숨기기
      detailView.style.display = "none";
      detailView.setAttribute("aria-hidden", "true");

      const listWrap = document.querySelector(".ui-scale-wrap");
      if (listWrap) listWrap.style.display = "none";

      const about = document.getElementById("aboutView");
      if (about) {
        about.style.display = "none";
        about.setAttribute("aria-hidden", "true");
      }

      // tipsView 표시
      const tips = document.getElementById("tipsView");
      if (tips) {
        tips.style.display = "block";
        tips.setAttribute("aria-hidden", "false");
      }

      // Tips 컨텐츠 렌더링 (tips.view.js에서 정의)
      window.renderTipsView?.();

      // Tips 진입 시 상단 고정
      window.scrollTo({ top: 0, behavior: "auto" });
      return;
    }


    // ✅ 소개/팁이 아니면 해당 뷰들은 무조건 닫기
    const about = document.getElementById("aboutView");
    if (about) {
      about.style.display = "none";
      about.setAttribute("aria-hidden", "true");
    }
    const tips = document.getElementById("tipsView");
    if (tips) {
      tips.style.display = "none";
      tips.setAttribute("aria-hidden", "true");
    }
    const listWrap = document.querySelector(".ui-scale-wrap");
    if (listWrap) listWrap.style.display = "";

    // ✅ 2) 상세 페이지(#site=) 처리
    const m = hash.match(/#site=([^&]+)/);
    if (!m) {
      showList();
      return;
    }

    const routeParamRaw = decodeURIComponent(m[1] || "");
    const routeParam = routeParamRaw.trim();
    const routeParamLower = routeParam.toLowerCase();

    const site = siteIndex.get(routeParam) || siteIndex.get(routeParamLower);

    if (site) {
      const canonicalKey = String(site.key || "").trim();
      if (canonicalKey) {
        const canonicalHash = `#site=${encodeURIComponent(canonicalKey)}`;
        if (location.hash !== canonicalHash) {
          history.replaceState(null, "", canonicalHash);
        }
      }
      showDetail(site);
    } else {
      console.warn("해당 사이트를 찾을 수 없습니다:", routeParamRaw);
      showList();
    }
  }

  function setView(mode) {
    const listWrap = document.querySelector(".ui-scale-wrap");  // 목록 전체 래퍼
    const detail = document.getElementById("detailView");
    const about = document.getElementById("aboutView");

    // 기본: 다 숨김/표시
    if (listWrap) listWrap.style.display = (mode === "list") ? "" : "none";
    if (detail) detail.style.display = (mode === "detail") ? "" : "none";
    if (about) about.style.display = (mode === "about") ? "" : "none";

    if (detail) detail.setAttribute("aria-hidden", mode === "detail" ? "false" : "true");
    if (about) about.setAttribute("aria-hidden", mode === "about" ? "false" : "true");
  }

  function routeHash() {
    const hash = location.hash || "#/";

    // 소개 페이지
    if (hash.startsWith("#/about")) {
      setView("about");
      // 스크롤 UX: 소개 페이지로 들어오면 상단
      window.scrollTo({ top: 0, behavior: document.body.classList.contains("anim-off") ? "auto" : "smooth" });
      return;
    }

    // 상세 페이지 (너 기존 로직이 있다면 그거 유지)
    // 예: #/site/xxx 또는 #detail-xxx 등
    // 여기서는 'about'가 아닌 경우는 일단 기존 흐름으로
    // 상세 조건은 네 프로젝트 기준에 맞춰서 if(hash...){ setView("detail"); ... } 유지하면 됨.

    // 기본: 목록
    setView("list");
  }

  // 뒤로가기 버튼 클릭 이벤트
  if (backBtn) {
    backBtn.onclick = (e) => {
      e.preventDefault();

      // 해시가 있는 상세 상태에서 왔다면 진짜 뒤로가기
      if (location.hash && location.hash.includes("#site=")) {
        history.back();
        return;
      }

      // 혹시나 해시가 이미 없는 상태면 그냥 목록 보여주기
      showList();
    };
  }

  // URL 복사 버튼 이벤트 (상세 페이지: '사이트 주소' 복사)
  if (copyBtn) {
    copyBtn.onclick = async () => {
      try {
        const s = window.__currentSite || null;
        const targetUrl = (s?.url || s?.link || "").trim();

        // 사이트 주소가 없으면(예외) 현재 주소를 폴백으로 복사
        const textToCopy = targetUrl || location.href;

        await navigator.clipboard.writeText(textToCopy);

        const originalText = copyBtn.textContent;
        copyBtn.textContent = "✅ 복사완료";
        setTimeout(() => (copyBtn.textContent = originalText), 1500);

        // 토스트가 있으면 토스트로도 알려주기(선택)
        if (typeof showToast === "function") {
          showToast(targetUrl ? "사이트 주소가 복사되었습니다!" : "현재 페이지 주소가 복사되었습니다!");
        }
      } catch (err) {
        alert("주소 복사에 실패했습니다.");
      }
    };
  }


  // 브라우저 뒤로가기/앞으로가기 감지
  window.addEventListener('hashchange', parseRoute);
  
  // 페이지 새로고침 했을 때 현재 해시 확인 (약간의 딜레이를 주어 데이터 로드 대기)
  parseRoute();

  // 외부에서 호출할 수 있게 노출
  window.__route = { parseRoute };
}
