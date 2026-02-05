// js/render.js
(function () {
  const RAF = window.requestAnimationFrame || function (cb){ return setTimeout(cb,16); };

  // 렌더링 상태 관리 객체
  const renderState = {
    scheduled: false,
    after: [],
    prevKeysByCategory: Object.create(null),
    prevCountByCategory: Object.create(null),
    prevStats: { total: -1, filtered: -1, perPage: -1, totalPages: -1 }
  };

  function siteKeyOf(site) { return site?.url || site?.name || ''; }
  
  // 배열 비교 헬퍼
  function shallowEqualArray(a, b) {
    if (a === b) return true;
    if (!a || !b || a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
    return true;
  }

  // 핵심: 렌더링 실행 함수
  function renderSitesOptimizedCore() {
    try {
      // 1. main.js에서 공유해준 함수로 '현재 보여줄 사이트 목록' 가져오기
      // (만약 함수가 없으면 빈 배열 처리해서 에러 방지)
      const getFiltered = window.getFilteredSites || window.getFilteredSitesWithCache;
      const filtered = (typeof getFiltered === 'function') ? getFiltered() : [];

      // 2. 카테고리 정보 가져오기
      const getAllCats = window.getAllCategories;
      const allCats = (typeof getAllCats === 'function') ? getAllCats() : {};
      
      // 카테고리 키 목록 추출
      const categories = Object.keys(allCats).length > 0 
        ? Object.keys(allCats) 
        : Array.from(new Set(filtered.map(s => s.category)));

      const hasResults = filtered.length > 0;

      // ============================================================
      // [버그 수정] 검색 시 결과 카테고리가 적으면 카드 크기 키우기 (3열 -> 2열)
      // ============================================================
      try {
        const container = document.getElementById("categoriesContainer");
        if (container) {
          const q = (window.state?.currentSearchQuery || window.state?.searchQuery || "").trim();
          const curCat = (window.state?.currentCategoryFilter ?? "all");

          // 초기화
          container.classList.remove("results-cols-1", "results-cols-2");

          // 전체 보기 + 검색어 있을 때만
          if (q && (curCat === "all" || curCat === "전체")) {
            const resultCats = new Set();
            for (const s of filtered) if (s?.category) resultCats.add(s.category);

            if (resultCats.size === 1) container.classList.add("results-cols-1");
            else if (resultCats.size === 2) container.classList.add("results-cols-2");
          }
        }
      } catch (e) {
        console.warn("Layout resize logic failed:", e);
      }

      // ============================================================

      // 3. 각 카테고리 섹션 그리기
      for (const category of categories) {
        const section = document.getElementById(`${category}-section`);
        const content = document.getElementById(`${category}-content`);
        const countEl = document.getElementById(`${category}-count`);
        
        if (!section || !content) continue;

        const list = filtered.filter(s => s.category === category);
        const totalCount = list.length;

        // 숫자 뱃지 업데이트
        if (countEl && renderState.prevCountByCategory[category] !== totalCount) {
          countEl.textContent = totalCount;
          renderState.prevCountByCategory[category] = totalCount;
        }

        // 결과 없으면 섹션 숨김
        if (totalCount === 0) {
          section.style.display = "none";
          renderState.prevKeysByCategory[category] = [];
          // 페이지네이션도 숨김
          const pager = document.getElementById(`${category}-pagination`);
          if (pager) pager.innerHTML = "";
          continue;
        }

        section.style.display = "block";

        // 페이징 처리 로직
        const cur = window.state?.currentCategoryFilter ?? 'all';
        const isAllView = (cur === 'all' || cur === '전체');
        const isSelectedCategory = (!isAllView && cur === category);

        let slice;
        if (isSelectedCategory) {
          // 단일 카테고리 선택 시: 전체 출력
          slice = list; 
        } else {
          // 전체 보기 모드: 페이징 적용 (ITEMS_PER_PAGE 사용)
          const currentPage = (window.state?.currentPageByCategory?.[category]) || 1;
          const perPage = window.state?.ITEMS_PER_PAGE || 20;
          const start = (currentPage - 1) * perPage;
          slice = list.slice(start, start + perPage);
        }

        const visibleKeys = slice.map(siteKeyOf);
        const prevKeys = renderState.prevKeysByCategory[category] || [];

        // 페이지네이션 버튼 그리기 (main.js에 있는 renderPagination 호출)
        const pager = document.getElementById(`${category}-pagination`);
        if (pager) {
          if (isSelectedCategory) {
            pager.innerHTML = "";
            pager.style.display = 'none';
          } else {
            pager.style.display = '';
            if (typeof window.renderPagination === 'function') {
                window.renderPagination(category, totalCount);
            }
          }
        }

        // 내용이 바뀌었을 때만 카드 다시 그리기 (DOM 조작 최소화)
        if (!shallowEqualArray(prevKeys, visibleKeys)) {
          // buildCardsFragment 함수가 있으면 사용 (없으면 for문 등 사용 필요)
          if (typeof window.buildCardsFragment === 'function') {
             const frag = window.buildCardsFragment(slice);
             content.replaceChildren(frag);
          } else {
             // 비상용 (buildCardsFragment가 없을 때)
             content.innerHTML = ""; 
             // createSiteCard가 전역에 있다면 사용
             if (typeof window.createSiteCard === 'function') {
                 slice.forEach(site => content.appendChild(window.createSiteCard(site)));
             }
          }
          renderState.prevKeysByCategory[category] = visibleKeys;
        }
      }

      // 4. '결과 없음' 메시지 처리
      const noResults = document.getElementById("noResults");
      if (noResults) noResults.style.display = hasResults ? "none" : "block";

      // 5. 하단 통계 바 업데이트
      const total = window.state?.sites?.length ?? 0;
      const filteredLen = filtered.length;
      const perPage = window.state?.ITEMS_PER_PAGE || 20;
      const totalPages = Math.ceil(filteredLen / perPage) || 1;

      // 값이 변했을 때만 DOM 업데이트
      if (
        renderState.prevStats.total !== total ||
        renderState.prevStats.filtered !== filteredLen ||
        renderState.prevStats.totalPages !== totalPages
      ) {
        const totalCountEl = document.getElementById("totalCount");
        const filteredCountEl = document.getElementById("filteredCount");
        const paginationInfo = document.getElementById("paginationInfo");

        if (totalCountEl) totalCountEl.textContent = total;
        if (filteredCountEl) filteredCountEl.textContent = filteredLen;
        if (paginationInfo) paginationInfo.textContent = `📄 ${perPage}개씩 보기 · 1/${totalPages} 페이지`;
        
        renderState.prevStats = { total, filtered: filteredLen, perPage, totalPages };
      }

      // 6. 검색어 하이라이트 (ddakHighlight 라이브러리 연동)
      try {
        const q = (window.state?.currentSearchQuery || '').trim();
        const scope = document.getElementById('categoriesContainer');
        if (window.ddakHighlight && scope) {
           if (q) window.ddakHighlight.apply(q, scope);
           else if (window.ddakHighlight.clear) window.ddakHighlight.clear(scope);
        }
      } catch (e) {}

      // 7. 후처리 작업 실행 (UI 트랜지션 종료 등)
      if (renderState.after.length) {
        const jobs = renderState.after.splice(0);
        jobs.forEach(job => { try { job(); } catch(e){} });
      }

    } catch (err) {
      console.error('renderSitesOptimizedCore Critical Error:', err);
    } finally {
      renderState.scheduled = false;
    }
  }

  // 요청 예약 함수
  function requestRenderSites() {
    if (renderState.scheduled) return;
    renderState.scheduled = true;
    RAF(renderSitesOptimizedCore);
  }

  // 렌더링 후 실행할 콜백 등록 (깜빡임 방지 트랜지션 종료용)
  function afterNextRender(fn) {
    if (typeof fn !== "function") return;
    renderState.after.push(fn);
    requestRenderSites();
  }
  
  // 전역 노출
  window.afterNextRender = afterNextRender;
  window.renderSites = requestRenderSites; // 외부에서는 이걸 호출

})();