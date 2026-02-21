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
  if (setupHashRouting.__initialized && window.__route?.parseRoute) {
    return window.__route;
  }
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
    const refs = {
      highlight:
        window.ddakpilmo?.search?.highlightSearchTerms ||
        window.highlightSearchTerms,
      escapeHtml:
        window.ddakpilmo?.utils?.escapeHtml ||
        window.escapeHtml ||
        ((value) => String(value ?? "")),
      ageNames:
        window.ageNames ||
        window.ddakpilmo?.config?.ageNames ||
        {},
      subjectNames:
        window.subjectNames ||
        window.ddakpilmo?.config?.subjectNames ||
        {},
      getCategoryName:
        window.getCategoryName ||
        window.ddakpilmo?.config?.getCategoryName ||
        ((key) => String(key || "")),
    };

    const safeHighlight = (text) => (typeof refs.highlight === "function"
      ? refs.highlight(text, state.currentSearchQuery)
      : refs.escapeHtml(text || ""));

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
        chips.push(`📚 ${site.subjects.map(s => refs.subjectNames[s] || s).join(', ')}`);
    }
    // 연령
    if (Array.isArray(site.ages)) {
        chips.push(`👶 ${site.ages.map(a => refs.ageNames[a] || a).join(', ')}`);
    }
    // 카테고리
    if (site.category) {
        chips.push(`📂 ${refs.getCategoryName(site.category)}`);
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
    const rel = typeof window.getRelatedSites === "function"
      ? window.getRelatedSites(site, all, { limit: 6 })
      : [];

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
      // 항상 메인 목록으로 이동 (이전 상세 히스토리로 되돌아가지 않음)
      const listHash = "#/";
      if (location.hash !== listHash) {
        location.hash = listHash;
        return;
      }
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
  if (window.__routeHashHandler) {
    window.removeEventListener('hashchange', window.__routeHashHandler);
  }
  window.addEventListener('hashchange', parseRoute);
  window.__routeHashHandler = parseRoute;
  
  // 페이지 새로고침 했을 때 현재 해시 확인 (약간의 딜레이를 주어 데이터 로드 대기)
  parseRoute();

  // 외부에서 호출할 수 있게 노출
  setupHashRouting.__initialized = true;
  window.__route = { parseRoute };
}
window.getAllSites = getAllSites;
window.buildSiteIndex = buildSiteIndex;
window.setupHashRouting = setupHashRouting;
