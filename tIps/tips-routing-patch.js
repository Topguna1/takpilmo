// Tips 라우팅을 위한 parseRoute 패치 (defer 로드 순서 안전)
(function() {
  const MAX_TRIES = 120; // 약 2초(60fps 기준)
  let tries = 0;

  function applyPatch() {
    const originalParseRoute = window.__route?.parseRoute;

    if (!originalParseRoute) {
      if (tries++ < MAX_TRIES) {
        requestAnimationFrame(applyPatch);
      } else {
        console.warn('parseRoute를 찾을 수 없습니다. (timeout)');
      }
      return;
    }

    // ✅ 한 번만 패치되게 가드
    if (window.__route.parseRoute.__tipsPatched) return;

    window.__route.parseRoute = function() {
      const hash = location.hash || "";

      if (hash.startsWith("#/tips")) {
        const detailView = document.getElementById("detailView");
        const listWrap = document.querySelector(".ui-scale-wrap");
        const about = document.getElementById("aboutView");
        const tips = document.getElementById("tipsView");

        if (detailView) {
          detailView.style.display = "none";
          detailView.setAttribute("aria-hidden", "true");
        }
        if (listWrap) listWrap.style.display = "none";
        if (about) {
          about.style.display = "none";
          about.setAttribute("aria-hidden", "true");
        }

        if (tips) {
          tips.style.display = "block";
          tips.setAttribute("aria-hidden", "false");
        }

        window.scrollTo({ top: 0, behavior: "auto" });
        return;
      }

      // tips가 아니면 tips 숨김
      const tips = document.getElementById("tipsView");
      if (tips) {
        tips.style.display = "none";
        tips.setAttribute("aria-hidden", "true");
      }

      return originalParseRoute.call(this);
    };

    // 패치 마커
    window.__route.parseRoute.__tipsPatched = true;

    // 뒤로가기 버튼(있을 때만)
    const tipsBackBtn = document.getElementById('tipsBackBtn');
    if (tipsBackBtn && !tipsBackBtn.__tipsBound) {
      tipsBackBtn.addEventListener('click', function(e) {
        e.preventDefault();
        window.location.hash = '#/';
      });
      tipsBackBtn.__tipsBound = true;
    }
  }

  applyPatch();
})();
