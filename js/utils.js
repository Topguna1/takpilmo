// Utility SSOT
(function () {
  function escapeHtml(str) {
    return String(str ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function debounce(func, wait) {
    let timeoutId;
    const timerManager = window.memoryManager?.timerManager;

    return function debounced(...args) {
      const later = () => {
        if (timerManager && timeoutId) timerManager.clearTimeout(timeoutId);
        func(...args);
      };

      if (timerManager && timeoutId) timerManager.clearTimeout(timeoutId);
      else if (timeoutId) clearTimeout(timeoutId);

      timeoutId = timerManager
        ? timerManager.setTimeout(later, wait)
        : setTimeout(later, wait);
    };
  }

  function getChosung(str) {
    const CHO = [
      "\u3131", "\u3132", "\u3134", "\u3137", "\u3138", "\u3139", "\u3141",
      "\u3142", "\u3143", "\u3145", "\u3146", "\u3147", "\u3148", "\u3149",
      "\u314a", "\u314b", "\u314c", "\u314d", "\u314e"
    ];
    const src = String(str ?? "");
    let out = "";

    for (let i = 0; i < src.length; i += 1) {
      const code = src.charCodeAt(i) - 44032;
      if (code >= 0 && code <= 11171) out += CHO[Math.floor(code / 588)] || "";
      else out += src[i];
    }
    return out;
  }

  function getChosungSafe(str) {
    try {
      return getChosung(str);
    } catch (error) {
      console.warn("getChosungSafe error:", error);
      return String(str ?? "");
    }
  }

  window.escapeHtml = window.escapeHtml || escapeHtml;
  window.debounce = window.debounce || debounce;
  window.getChosung = window.getChosung || getChosung;
  window.getChosungSafe = window.getChosungSafe || getChosungSafe;

  window.ddakpilmo = window.ddakpilmo || {};
  window.ddakpilmo.utils = window.ddakpilmo.utils || {};

  window.ddakpilmo.utils.escapeHtml = window.ddakpilmo.utils.escapeHtml || window.escapeHtml;
  window.ddakpilmo.utils.debounce = window.ddakpilmo.utils.debounce || window.debounce;
  window.ddakpilmo.utils.getChosung = window.ddakpilmo.utils.getChosung || window.getChosung;
  window.ddakpilmo.utils.getChosungSafe =
    window.ddakpilmo.utils.getChosungSafe || window.getChosungSafe;

  window.ddakpilmo.escapeHtml = window.ddakpilmo.escapeHtml || window.escapeHtml;
  window.ddakpilmo.getChosung = window.ddakpilmo.getChosung || window.getChosung;
  window.ddakpilmo.getChosungSafe =
    window.ddakpilmo.getChosungSafe || window.getChosungSafe;
})();
