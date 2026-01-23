// ==================== 다크 모드 자동 감지 ====================
function initializeTheme() {
  if (!document.documentElement.dataset.userTheme) {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    // 초기 설정
    if (mediaQuery.matches) {
      document.body.classList.add("dark");
      const darkToggle = document.getElementById("darkToggle");
      if (darkToggle) darkToggle.textContent = "☀️ 라이트 모드";
    }

    // 시스템 설정 변경 감지
    mediaQuery.addEventListener("change", (e) => {
      // 사용자가 직접 테마를 선택했으면 시스템 변경 무시
      if (document.documentElement.dataset.userTheme) return;

      const darkToggle = document.getElementById("darkToggle");
      if (e.matches) {
        document.body.classList.add("dark");
        if (darkToggle) darkToggle.textContent = "☀️ 라이트 모드";
      } else {
        document.body.classList.remove("dark");
        if (darkToggle) darkToggle.textContent = "🌙 다크 모드";
      }
    });
  }
}

// ==================== 테마 적용 (light / dark / system) ====================
function applyTheme(mode) {
  // mode: 'light' | 'dark' | 'system'
  const html = document.documentElement;
  const body = document.body;
  if (!body) return;

  const setDarkUI = (isDark) => {
    body.classList.toggle("dark", !!isDark);
    const darkToggle = document.getElementById("darkToggle");
    if (darkToggle) darkToggle.textContent = isDark ? "☀️ 라이트 모드" : "🌙 다크 모드";
  };

  if (mode === "system") {
    // 사용자 지정 해제 → 시스템 따라감
    delete html.dataset.userTheme;

    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    setDarkUI(mq.matches);

    // 시스템 변경 감지(중복 등록 방지)
    if (!window.__themeMqBound) {
      window.__themeMqBound = true;
      mq.addEventListener("change", (e) => {
        if (html.dataset.userTheme) return; // 사용자가 직접 선택했으면 무시
        setDarkUI(e.matches);
      });
    }

    try { localStorage.removeItem("siteTheme"); } catch {}
    return;
  }

  // 사용자 지정 테마
  html.dataset.userTheme = mode;
  setDarkUI(mode === "dark");

  try { localStorage.setItem("siteTheme", mode); } catch {}
}

function applyFontSize(size) {
  // size: 'small' | 'normal' | 'large'
  const body = document.body;
  if (!body) return;

  const normalized = (size === "small" || size === "large" || size === "normal")
    ? size
    : "normal";

  body.classList.remove("font-small", "font-normal", "font-large");
  body.classList.add(`font-${normalized}`);

  try { localStorage.setItem("siteFontSize", normalized); } catch {}
}

function applyAnimation(mode) {
  // mode: 'on' | 'off'
  const body = document.body;
  if (!body) return;

  const isOff = (mode === "off");
  body.classList.toggle("anim-off", isOff);

  try { localStorage.setItem("siteAnim", isOff ? "off" : "on"); } catch {}
}

function applyRadius(mode) {
  // mode: 'round' | 'square'
  const body = document.body;
  if (!body) return;

  const normalized = (mode === "square") ? "square" : "round";

  body.classList.remove("radius-round", "radius-square");
  body.classList.add(`radius-${normalized}`);

  try { localStorage.setItem("siteRadius", normalized); } catch {}
}

// 전역 노출(다른 파일에서 window.applyX로 호출하니까 유지)
window.applyTheme = applyTheme;
window.applyFontSize = applyFontSize;
window.applyAnimation = applyAnimation;
window.applyRadius = applyRadius;

window.initializeTheme = initializeTheme;
