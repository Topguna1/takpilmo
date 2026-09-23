// Settings panel state management.
function setupSettingsPanel() {
  if (setupSettingsPanel.__initialized) {
    return;
  }

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

  const store = window.App?.store;
  const DEFAULT_SETTINGS = {
    theme: "dark",
    font: "normal",
    anim: "on",
    radius: "round",
  };

  const getSettings = () => ({
    ...DEFAULT_SETTINGS,
    ...((store?.getState?.().settings) || window.state?.settings || {}),
  });

  const setSettings = (nextSettings) => {
    if (store?.setState) {
      store.setState({ settings: nextSettings }, { render: false });
    } else {
      window.state = window.state || {};
      window.state.settings = { ...DEFAULT_SETTINGS, ...nextSettings };
    }
  };

  function loadSettings() {
    const base = { ...DEFAULT_SETTINGS };

    try {
      const raw = localStorage.getItem("siteSettings");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") Object.assign(base, parsed);
      }
    } catch {}

    try {
      const theme = localStorage.getItem("siteTheme");
      const font = localStorage.getItem("siteFontSize");
      const anim = localStorage.getItem("siteAnim");
      const radius = localStorage.getItem("siteRadius");
      if (theme) base.theme = theme;
      if (font) base.font = font;
      if (anim) base.anim = anim;
      if (radius) base.radius = radius;
    } catch {}

    if (base.radius === "sharp") base.radius = "square";
    setSettings(base);
  }

  function applyAll() {
    const settings = getSettings();

    try {
      localStorage.setItem("siteTheme", settings.theme);
      localStorage.setItem("siteFontSize", settings.font);
      localStorage.setItem("siteAnim", settings.anim);
      localStorage.setItem("siteRadius", settings.radius);
      localStorage.setItem("siteSettings", JSON.stringify(settings));
    } catch {}

    window.applyTheme?.(settings.theme);
    window.applyFontSize?.(settings.font);
    window.applyAnimation?.(settings.anim);
    window.applyRadius?.(settings.radius);
  }

  function syncUI() {
    const settings = getSettings();
    panel.querySelectorAll("[data-setting][data-value]").forEach((btn) => {
      const key = btn.dataset.setting;
      const val = btn.dataset.value;
      const active = String(settings?.[key]) === String(val);
      btn.classList.toggle("settings-active", active);
      btn.classList.toggle("active", active);
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

  add(fab, "click", openPanel);
  add(closeBtn, "click", closePanel);

  add(document, "click", (e) => {
    if (!panel.classList.contains("open")) return;
    const target = e.target;
    if (target === panel || panel.contains(target) || target === fab || fab.contains(target)) return;
    closePanel();
  });

  add(document, "keydown", (e) => {
    if (e.key === "Escape") closePanel();
  });

  add(panel, "click", (e) => {
    const btn = e.target.closest("[data-setting][data-value]");
    if (!btn) return;

    const key = btn.dataset.setting;
    let value = btn.dataset.value;
    if (key === "radius" && value === "sharp") value = "square";

    setSettings({
      ...getSettings(),
      [key]: value,
    });
    applyAll();
    syncUI();
  });

  add(resetBtn, "click", () => {
    setSettings({ ...DEFAULT_SETTINGS });
    applyAll();
    syncUI();
  });

  loadSettings();
  applyAll();
  syncUI();
  setupSettingsPanel.__initialized = true;
}

window.setupSettingsPanel = setupSettingsPanel;
