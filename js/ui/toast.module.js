function installToastInternal() {
  const doc = document;
  const MAX_TOASTS = 5;

  function getToastHost() {
    let host = doc.getElementById("toastHost");
    if (host) return host;

    host = doc.createElement("div");
    host.id = "toastHost";
    host.style.cssText = `
      position: fixed;
      right: 16px;
      top: 16px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      z-index: 99999;
      pointer-events: none;
      align-items: flex-end;
    `;
    (doc.body || doc.documentElement).appendChild(host);
    return host;
  }

  function normalizeType(type) {
    const t = String(type || "info").toLowerCase();
    if (t === "success" || t === "ok") return "success";
    if (t === "error" || t === "danger") return "error";
    if (t === "warn" || t === "warning") return "warn";
    return "info";
  }

  function styleByType(type) {
    switch (type) {
      case "success": return { icon: "✅", border: "rgba(34,197,94,.55)" };
      case "error": return { icon: "⛔", border: "rgba(239,68,68,.55)" };
      case "warn": return { icon: "⚠️", border: "rgba(234,179,8,.55)" };
      default: return { icon: "ℹ️", border: "rgba(59,130,246,.55)" };
    }
  }

  function dismissToast(el) {
    if (!el || el.dataset.closing === "1") return;
    el.dataset.closing = "1";

    if (el.__toastTimerId) clearTimeout(el.__toastTimerId);
    if (el.__toastPause) el.removeEventListener("mouseenter", el.__toastPause);
    if (el.__toastResume) el.removeEventListener("mouseleave", el.__toastResume);

    const h = el.getBoundingClientRect().height;
    el.style.height = `${h}px`;
    el.style.overflow = "hidden";

    requestAnimationFrame(() => {
      el.style.opacity = "0";
      el.style.transform = "translateY(6px)";
      el.style.height = "0px";
      el.style.paddingTop = "0px";
      el.style.paddingBottom = "0px";
      el.style.marginTop = "0px";
      el.style.marginBottom = "0px";
    });

    setTimeout(() => el.remove(), 260);
  }

  function attachToastTimer(toastEl, totalMs) {
    toastEl.__toastTotalMs = totalMs;
    toastEl.__toastRemaining = totalMs;
    toastEl.__toastStartedAt = 0;
    toastEl.__toastTimerId = null;

    function start(ms) {
      toastEl.__toastRemaining = Math.max(0, ms);
      toastEl.__toastStartedAt = Date.now();
      clearTimeout(toastEl.__toastTimerId);
      toastEl.__toastTimerId = setTimeout(() => dismissToast(toastEl), toastEl.__toastRemaining);
    }

    toastEl.__toastPause = () => {
      if (toastEl.dataset.closing === "1") return;
      clearTimeout(toastEl.__toastTimerId);
      const elapsed = Date.now() - toastEl.__toastStartedAt;
      toastEl.__toastRemaining = Math.max(0, toastEl.__toastRemaining - elapsed);
    };

    toastEl.__toastResume = () => {
      if (toastEl.dataset.closing === "1") return;
      start(toastEl.__toastRemaining);
    };

    toastEl.__toastReset = (ms = totalMs) => {
      if (toastEl.dataset.closing === "1") return;
      if (toastEl.matches(":hover")) {
        clearTimeout(toastEl.__toastTimerId);
        toastEl.__toastRemaining = Math.max(0, ms);
        toastEl.__toastStartedAt = Date.now();
        return;
      }
      start(ms);
    };

    toastEl.addEventListener("mouseenter", toastEl.__toastPause);
    toastEl.addEventListener("mouseleave", toastEl.__toastResume);

    start(totalMs);
  }

  function findExistingToast(host, key) {
    const kids = host.children;
    for (let i = kids.length - 1; i >= 0; i--) {
      const el = kids[i];
      if (el?.dataset?.toastKey === key && el.dataset.closing !== "1") return el;
    }
    return null;
  }

  function enforceToastLimit(host) {
    while (host.children.length > MAX_TOASTS) {
      const el = host.children[host.children.length - 1];
      dismissToast(el);
    }
  }

  return function showToast(message, type = "info", duration = 3000) {
    const host = getToastHost();
    const t = normalizeType(type);
    const s = styleByType(t);
    const msg = String(message ?? "");
    const key = `${t}|${msg}`;
    const ms = Math.max(1200, Number(duration) || 3000);

    const existing = findExistingToast(host, key);
    if (existing) {
      const next = (Number(existing.dataset.toastCount) || 1) + 1;
      existing.dataset.toastCount = String(next);

      const countEl = existing.querySelector(".toast-count");
      if (countEl) {
        countEl.textContent = `x${next}`;
        countEl.style.display = "inline-flex";
      }

      host.prepend(existing);
      existing.__toastReset?.(ms);
      existing.style.transform = "translateY(-2px)";
      requestAnimationFrame(() => {
        if (existing.dataset.closing !== "1") existing.style.transform = "translateY(0)";
      });
      return;
    }

    const toast = doc.createElement("div");
    toast.dataset.toastKey = key;
    toast.dataset.toastCount = "1";
    toast.style.cssText = `
      pointer-events: auto;
      width: fit-content;
      min-width: 0;
      max-width: min(360px, calc(100vw - 24px));
      padding: 12px 14px;
      border-radius: 12px;
      background: rgba(30,30,30,0.92);
      color: #fff;
      border: 1px solid ${s.border};
      box-shadow: 0 8px 24px rgba(0,0,0,0.25);
      display: inline-flex;
      gap: 10px;
      align-items: flex-start;
      align-self: flex-end;
      overflow: hidden;
      opacity: 0;
      transform: translateY(10px);
      transition:
        opacity .18s ease,
        transform .18s ease,
        height .22s ease,
        padding .22s ease,
        margin .22s ease;
    `;

    const icon = doc.createElement("div");
    icon.textContent = s.icon;
    icon.style.cssText = "font-size:18px; line-height:1; margin-top:2px;";

    const text = doc.createElement("div");
    text.textContent = msg;
    text.style.cssText = "font-size:14px; line-height:1.35; word-break:break-word; max-width: min(52vw, 280px);";

    const count = doc.createElement("span");
    count.className = "toast-count";
    count.textContent = "x1";
    count.style.cssText = `
      display: none;
      font-size: 12px;
      line-height: 1;
      padding: 3px 6px;
      border-radius: 999px;
      background: rgba(255,255,255,0.12);
      border: 1px solid rgba(255,255,255,0.18);
      margin-top: 1px;
      flex: 0 0 auto;
    `;

    const row = doc.createElement("div");
    row.style.cssText = "display:inline-flex; align-items:flex-start; gap:8px; min-width:0;";
    row.append(text, count);

    toast.append(icon, row);
    host.prepend(toast);
    enforceToastLimit(host);

    requestAnimationFrame(() => {
      toast.style.opacity = "1";
      toast.style.transform = "translateY(0)";
    });

    attachToastTimer(toast, ms);
  };
}

export function installToast() {
  if (typeof window.showToast === "function") {
    return { showToast: window.showToast };
  }
  window.showToast = installToastInternal();
  return { showToast: window.showToast };
}

