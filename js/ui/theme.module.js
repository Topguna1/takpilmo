function initializeTheme() {
  if (!document.documentElement.dataset.userTheme) {
    applyTheme("dark");
  }
}

function applyTheme(mode) {
  const html = document.documentElement;
  const body = document.body;
  if (!body) return;

  const setDarkUI = (isDark) => {
    body.classList.toggle("dark", !!isDark);
    const darkToggle = document.getElementById("darkToggle");
    if (darkToggle) darkToggle.textContent = isDark ? "Light mode" : "Dark mode";
  };

  if (mode === "system") {
    delete html.dataset.userTheme;

    if (!window.matchMedia) {
      setDarkUI(false);
      try { localStorage.removeItem("siteTheme"); } catch {}
      return;
    }

    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    setDarkUI(mq.matches);

    if (!window.__themeMqBound) {
      window.__themeMqBound = true;
      mq.addEventListener?.("change", (e) => {
        if (html.dataset.userTheme) return;
        setDarkUI(e.matches);
      });
    }

    try { localStorage.removeItem("siteTheme"); } catch {}
    return;
  }

  html.dataset.userTheme = mode;
  setDarkUI(mode === "dark");

  try { localStorage.setItem("siteTheme", mode); } catch {}
}

function applyFontSize(size) {
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
  const body = document.body;
  if (!body) return;

  const isOff = mode === "off";
  body.classList.toggle("anim-off", isOff);

  try { localStorage.setItem("siteAnim", isOff ? "off" : "on"); } catch {}
}

function applyRadius(mode) {
  const body = document.body;
  if (!body) return;

  const normalized = mode === "square" ? "square" : "round";

  body.classList.remove("radius-round", "radius-square");
  body.classList.add(`radius-${normalized}`);

  try { localStorage.setItem("siteRadius", normalized); } catch {}
}

export function installTheme() {
  if (typeof window.applyTheme === "function" && typeof window.initializeTheme === "function") {
    return {
      applyTheme: window.applyTheme,
      applyFontSize: window.applyFontSize,
      applyAnimation: window.applyAnimation,
      applyRadius: window.applyRadius,
      initializeTheme: window.initializeTheme,
    };
  }

  window.applyTheme = applyTheme;
  window.applyFontSize = applyFontSize;
  window.applyAnimation = applyAnimation;
  window.applyRadius = applyRadius;
  window.initializeTheme = initializeTheme;
  return { applyTheme, applyFontSize, applyAnimation, applyRadius, initializeTheme };
}

