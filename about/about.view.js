// about/about.view.js
(function () {
  window.renderAboutView = function renderAboutView() {
    const about = document.getElementById("aboutView");
    if (!about) return;

    about.innerHTML = `
      <div class="about-wrap">

        <header class="about-hero2 reveal">
          <div class="about-hero2__bg"></div>
          <div class="about-hero2__content">
            <div class="about-badge-row">
              <span class="about-badge">학생 전용</span>
              <span class="about-badge">회원가입 불필요</span>
              <span class="about-badge">무료</span>
            </div>

            <h1 class="about-h1">
              필요한 사이트,<br><b>30초</b> 안에 찾으세요
            </h1>
            <p class="about-lead">
              검색하고, 비교하고, 광고 스킵하는 시간은 이제 그만.<br>
              학생에게 딱 맞는 사이트만 모았습니다.
            </p>

            <div class="about-cta2">
              <a class="about-btn2 primary" href="#/">지금 시작하기</a>
            </div>

            <div class="about-stats reveal">
              <div class="about-stat">
                <div class="k">Sites</div>
                <div class="v"><span id="aboutSiteCount">-</span></div>
              </div>
              <div class="about-stat">
                <div class="k">Categories</div>
                <div class="v"><span id="aboutCatCount">-</span></div>
              </div>
            </div>
          </div>
        </header>

        <section class="about-section2 reveal">
          <div class="about-section2__head">
            <h2>학생들이 겪는 문제</h2>
            <p>필요한 사이트를 찾는데 왜 이렇게 오래 걸릴까요?</p>
          </div>

          <div class="about-grid3">
            <article class="about-card2 reveal">
              <div class="ico">⏰</div>
              <h3>검색만 하다 끝남</h3>
              <p>구글에서 검색하고, 결과 클릭하고, 광고 스킵하고... 반복</p>
            </article>
            <article class="about-card2 reveal">
              <div class="ico">🧩</div>
              <h3>정보가 흩어져 있음</h3>
              <p>목적별로 따로 찾아야 해서 흐름이 끊김</p>
            </article>
            <article class="about-card2 reveal">
              <div class="ico">❓</div>
              <h3>맞는지 확신 없음</h3>
              <p>들어가봐야 알 수 있어서 시간 낭비</p>
            </article>
          </div>
        </section>

        <section class="about-section2" id="principles">
          <div class="about-section2__head reveal">
            <h2>딱필모의 원칙</h2>
            <p>모든 사이트는 3가지 기준으로 선별됩니다</p>
          </div>

          <div class="about-grid3">
            <article class="about-card2 accent reveal">
              <div class="ico">✓</div>
              <h3>검증된 사이트만</h3>
              <p>실제로 학생에게 도움되는 사이트만 등록</p>
            </article>
            <article class="about-card2 accent reveal">
              <div class="ico">📂</div>
              <h3>목적별 정리</h3>
              <p>카테고리, 과목, 연령대로 쉽게 찾기</p>
            </article>
            <article class="about-card2 accent reveal">
              <div class="ico">📝</div>
              <h3>명확한 설명</h3>
              <p>클릭 전에 용도를 정확히 파악</p>
            </article>
          </div>
        </section>

        <section class="about-section2 reveal">
          <div class="about-split2">
            <div class="about-panel2">
              <h2>✅ 제공하는 것</h2>
              <ul>
                <li>검증된 사이트 큐레이션</li>
                <li>목적별 필터 & 검색</li>
                <li>상세 설명 + 바로가기</li>
                <li>회원가입 없이 즉시 사용</li>
              </ul>
            </div>
            <div class="about-panel2">
              <h2>❌ 제공하지 않는 것</h2>
              <ul>
                <li>직접 강의나 콘텐츠</li>
                <li>커뮤니티 기능</li>
                <li>로그인 요구</li>
                <li>개인정보 수집</li>
              </ul>
            </div>
          </div>
        </section>

        <section class="about-section2" id="how">
          <div class="about-section2__head reveal">
            <h2>사용 방법</h2>
            <p>3단계로 원하는 사이트를 찾으세요</p>
          </div>

          <ol class="about-steps2">
            <li class="reveal">
              <div class="n">1</div>
              <div>
                <h3>목적 선택</h3>
                <p>학습, 과제, 시험, 진로 등 필요한 카테고리 선택</p>
              </div>
            </li>
            <li class="reveal">
              <div class="n">2</div>
              <div>
                <h3>필터 적용</h3>
                <p>과목, 연령대, 검색어로 정확하게 좁히기</p>
              </div>
            </li>
            <li class="reveal">
              <div class="n">3</div>
              <div>
                <h3>바로 사용</h3>
                <p>설명 확인 후 바로가기 클릭</p>
              </div>
            </li>
          </ol>
        </section>

        <section class="about-final reveal">
          <div class="about-final__box">
            <h2>검색은 줄이고,<br>공부에 집중하세요</h2>
            <p>지금 바로 필요한 사이트를 찾아보세요</p>
            <div class="about-cta2">
              <a class="about-btn2 primary" href="#/">사이트 둘러보기</a>
            </div>
          </div>
        </section>

      </div>
    `;

    // ✅ HTML 렌더링 완료 후 스크롤 (여러 방법 동시 적용)
    // 방법 1: 즉시 스크롤
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;

    // 방법 2: 다음 프레임에 부드럽게 스크롤
    requestAnimationFrame(() => {
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    });

    // 방법 3: 약간의 지연 후 강제 스크롤
    setTimeout(() => {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    }, 50);
  };

  window.fillAboutStats = function fillAboutStats() {
    try {
      const catsObj = (typeof getAllCategories === "function") ? getAllCategories() : null;
      const catCount = catsObj ? Object.keys(catsObj).length : 0;
      const siteCount = Array.isArray(window.state?.sites) ? window.state.sites.length : 0;

      const catEl = document.getElementById("aboutCatCount");
      const siteEl = document.getElementById("aboutSiteCount");
      if (catEl) catEl.textContent = String(catCount || 0);
      if (siteEl) siteEl.textContent = String(siteCount || 0);
    } catch (e) {
      console.warn("fillAboutStats failed:", e);
    }
  };
})();