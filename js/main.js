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

// init re-entry guard (state/actions moved to js/app/store.js)
let __legacyInitStarted = false;
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
window.handleDataLoadFailure = handleDataLoadFailure;


// ==================== 검색 하이라이트 기능 ====================



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
// ==================== Settings: 단일 Source of Truth ====================



// ==================== 초기화 함수 ====================
function init() {
  if (__legacyInitStarted) {
    console.log("[init] already started; skip duplicate call");
    return;
  }
  __legacyInitStarted = true;
  console.log("🌟 딱필모 안전 초기화 시작...");
  window.buildCategoryTabs?.();
  
  try {
    // 오류 처리 시스템 확인
    if (!window.ddakpilmo || !window.ddakpilmo.errorManager) {
      console.warn("⚠️ 오류 처리 시스템이 로드되지 않았습니다");
    }

    // 외부 데이터 확인 및 안전한 초기화
    if (typeof initialSites !== 'undefined' && Array.isArray(initialSites)) {
      state.sites = (window.normalizeSitesForState?.(initialSites, {
        ageNames,
        subjectNames,
        getCategoryName,
        normalizeTextForSearch,
        toJamoString,
        safeGetChosung
      }) || initialSites).slice();
      console.log(`✅ ${state.sites.length}개 사이트 안전 로드 완료`);
    } else {
      console.error("❌ initialSites 데이터를 찾을 수 없습니다");
      handleDataLoadFailure();
      return;
    }
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




