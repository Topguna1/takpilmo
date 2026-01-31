// Tips 라우팅을 위한 parseRoute 패치
(function() {
  // 원본 parseRoute 저장
  const originalParseRoute = window.__route?.parseRoute;
  
  if (!originalParseRoute) {
    console.warn('parseRoute를 찾을 수 없습니다.');
    return;
  }
  
  // parseRoute 오버라이드
  window.__route.parseRoute = function() {
    const hash = location.hash || "";
    
    // Tips 페이지 처리
    if (hash.startsWith("#/tips")) {
      const detailView = document.getElementById("detailView");
      const listWrap = document.querySelector(".ui-scale-wrap");
      const about = document.getElementById("aboutView");
      const tips = document.getElementById("tipsView");
      
      // 다른 뷰들 숨기기
      if (detailView) {
        detailView.style.display = "none";
        detailView.setAttribute("aria-hidden", "true");
      }
      if (listWrap) {
        listWrap.style.display = "none";
      }
      if (about) {
        about.style.display = "none";
        about.setAttribute("aria-hidden", "true");
      }
      
      // Tips 뷰 표시
      if (tips) {
        tips.style.display = "block";
        tips.setAttribute("aria-hidden", "false");
      }
      
      // 상단으로 스크롤
      window.scrollTo({ top: 0, behavior: "auto" });
      return;
    }
    
    // Tips가 아니면 Tips 뷰 숨기기
    const tips = document.getElementById("tipsView");
    if (tips) {
      tips.style.display = "none";
      tips.setAttribute("aria-hidden", "true");
    }
    
    // 원본 함수 실행
    originalParseRoute.call(this);
  };
  
  // 뒤로가기 버튼
  const tipsBackBtn = document.getElementById('tipsBackBtn');
  if (tipsBackBtn) {
    tipsBackBtn.addEventListener('click', function(e) {
      e.preventDefault();
      window.location.hash = '#/';
    });
  }
})();
