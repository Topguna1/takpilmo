// ==================== 설정 패널 초기화 (단일 버전) ====================
function setupSettingsPanel() {
  const manager = window.memoryManager?.eventManager;

  const fab = document.getElementById("settingsFab");
  const panel = document.getElementById("settingsPanel");
  const closeBtn = document.getElementById("settingsCloseBtn");
  const resetBtn = document.getElementById("settingsResetBtn");

  if (!fab || !panel) return;

  const add = (el, evt, fn, opt) => {
    if (!el) return;
    if (manager) manager.add(el, evt, fn, opt);
    else el.addEventListener(evt, fn, opt);
  };

  // ✅ 단일 Source of Truth
  if (!window.state) window.state = {};
  if (!window.state.settings) {
    window.state.settings = { theme: "system", font: "normal", anim: "on", radius: "round" };
  }

  // ✅ 저장값 로드: (구버전 키 + siteSettings 둘 다 호환)
  function loadSettings() {
    const base = { theme: "system", font: "normal", anim: "on", radius: "round" };
    try {
      // 1) 묶음 저장(siteSettings) 우선
      const raw = localStorage.getItem("siteSettings");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") Object.assign(base, parsed);
      }
    } catch {}

    try {
      // 2) 구 키들(FOUC 선적용 스크립트가 쓰는 키)도 반영
      const t = localStorage.getItem("siteTheme");
      const f = localStorage.getItem("siteFontSize");
      const a = localStorage.getItem("siteAnim");
      const r = localStorage.getItem("siteRadius");
      if (t) base.theme = t;
      if (f) base.font = f;
      if (a) base.anim = a;
      if (r) base.radius = r;
    } catch {}

    // radius 값 안전화 (sharp 같은 값 들어와도 square로 교정)
    if (base.radius === "sharp") base.radius = "square";

    window.state.settings = { ...window.state.settings, ...base };
  }

  // ✅ 실제 적용
  function applyAll() {
    const s = window.state.settings;

    // FOUC 선적용 스크립트 호환용 저장
    try {
      localStorage.setItem("siteTheme", s.theme);
      localStorage.setItem("siteFontSize", s.font);
      localStorage.setItem("siteAnim", s.anim);
      localStorage.setItem("siteRadius", s.radius);
      localStorage.setItem("siteSettings", JSON.stringify(s));
    } catch {}

    // 기존 apply 함수가 있으면 그걸 우선 사용(테마/클래스 처리 일원화)
    window.applyTheme?.(s.theme);
    window.applyFontSize?.(s.font);
    window.applyAnimation?.(s.anim);
    window.applyRadius?.(s.radius);
  }

  // ✅ 버튼 활성화 표시: CSS가 기대하는 클래스는 settings-active
  function syncUI() {
    const s = window.state.settings;
    panel.querySelectorAll("[data-setting][data-value]").forEach((btn) => {
      const key = btn.dataset.setting;
      const val = btn.dataset.value;
      const on = String(s?.[key]) === String(val);

      btn.classList.toggle("settings-active", on); // ✅ 핵심
      btn.classList.toggle("active", on);          // 혹시 다른 CSS가 active를 쓸 수도 있으니 같이 유지(안전)
    });
  }

  function openPanel() {
    panel.classList.add("open");
    document.body.classList.add("settings-open");
    panel.setAttribute("aria-hidden", "false");
  }
  function closePanel() {
    panel.classList.remove("open");
    document.body.classList.remove("settings-open");
    panel.setAttribute("aria-hidden", "true");
  }

  // 열기/닫기
  add(fab, "click", openPanel);
  add(closeBtn, "click", closePanel);

  // 바깥 클릭 닫기
  add(document, "click", (e) => {
    if (!panel.classList.contains("open")) return;
    const t = e.target;
    if (t === panel || panel.contains(t) || t === fab || fab.contains(t)) return;
    closePanel();
  });

  // ESC 닫기
  add(document, "keydown", (e) => {
    if (e.key === "Escape") closePanel();
  });

  // ✅ (핵심) 클릭 리스너는 “이거 1개만”
  add(panel, "click", (e) => {
    const btn = e.target.closest("[data-setting][data-value]");
    if (!btn) return;

    const key = btn.dataset.setting;
    let val = btn.dataset.value;

    // radius 보정
    if (key === "radius" && val === "sharp") val = "square";

    window.state.settings[key] = val;

    applyAll();
    syncUI();
  });

  // 기본값으로 초기화
  add(resetBtn, "click", () => {
    window.state.settings = { theme: "system", font: "normal", anim: "on", radius: "round" };
    applyAll();
    syncUI();
  });

  // 초기 동기화
  loadSettings();
  applyAll();
  syncUI();
}

// ✅ 전역 노출
window.setupSettingsPanel = setupSettingsPanel;

function applyAllSettingsFromStorage(defaults = { theme: "system", font: "normal", anim: "on", radius: "round" }) {
  const s = { ...defaults };

  try { s.theme = localStorage.getItem("siteTheme") || s.theme; } catch {}
  try { s.font  = localStorage.getItem("siteFontSize") || s.font; } catch {}
  try { s.anim  = localStorage.getItem("siteAnim") || s.anim; } catch {}
  try { s.radius = localStorage.getItem("siteRadius") || s.radius; } catch {}

  // radius 값 보정(예전 sharp 쓰던 흔적 있으면 교정)
  if (s.radius === "sharp") s.radius = "square";

  window.applyTheme?.(s.theme);
  window.applyFontSize?.(s.font);
  window.applyAnimation?.(s.anim);
  window.applyRadius?.(s.radius);

  return s;
}

window.applyAllSettingsFromStorage = applyAllSettingsFromStorage;
