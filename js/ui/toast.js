// ==================== Toast 시스템  ====================
(() => {
  if (window.showToast) return;

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
      align-items: flex-end; /* ✅ stretch 방지: 각 토스트 폭 독립 */
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
      case "error":   return { icon: "⛔", border: "rgba(239,68,68,.55)" };
      case "warn":    return { icon: "⚠️", border: "rgba(234,179,8,.55)" };
      default:        return { icon: "ℹ️", border: "rgba(59,130,246,.55)" };
    }
  }

  // ✅ 접히며 부드럽게 제거 (연쇄 제거도 점프 방지)
  function dismissToast(el) {
    if (!el || el.dataset.closing === "1") return;
    el.dataset.closing = "1";

    // 타이머/리스너 정리
    if (el.__toastTimerId) clearTimeout(el.__toastTimerId);
    if (el.__toastPause) el.removeEventListener("mouseenter", el.__toastPause);
    if (el.__toastResume) el.removeEventListener("mouseleave", el.__toastResume);

    // 현재 높이를 기준으로 접기
    const h = el.getBoundingClientRect().height;
    el.style.height = h + "px";
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

  // ✅ hover pause/resume + reset(중복 병합 시 타이머 완전 리셋)
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
      // hover 중이면 “남은 시간만” 갱신하고, 떠날 때부터 카운트 다운 시작
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
    const toasts = host.children;
    if (toasts.length <= MAX_TOASTS) return;

    // 최신을 위로(prepend) 쌓기 때문에, 오래된 건 맨 아래(마지막)
    while (host.children.length > MAX_TOASTS) {
      const el = host.children[host.children.length - 1];
      dismissToast(el);
    }
  }

  window.showToast = function (message, type = "info", duration = 3000) {
    const host = getToastHost();
    const t = normalizeType(type);
    const s = styleByType(t);

    const msg = String(message ?? "");
    const key = `${t}|${msg}`;
    const ms = Math.max(1200, Number(duration) || 3000);

    // ✅ 중복 병합: 카운트 올리고, 맨 위로 올리고, 타이머 리셋
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

      // 살짝 “업데이트” 피드백(과하지 않게)
      existing.style.transform = "translateY(-2px)";
      requestAnimationFrame(() => {
        if (existing.dataset.closing !== "1") existing.style.transform = "translateY(0)";
      });

      return;
    }

    // ✅ 새 토스트 생성
    const toast = doc.createElement("div");
    toast.dataset.toastKey = key;
    toast.dataset.toastCount = "1";

    toast.style.cssText = `
      pointer-events: auto;
      min-width: 240px;
      max-width: 360px;
      padding: 12px 14px;
      border-radius: 12px;
      background: rgba(30,30,30,0.92);
      color: #fff;
      border: 1px solid ${s.border};
      box-shadow: 0 8px 24px rgba(0,0,0,0.25);
      display: flex;
      gap: 10px;
      align-items: flex-start;

      overflow: hidden; /* ✅ 접힐 때 내용 튀는 거 방지 */
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
    text.style.cssText = "font-size:14px; line-height:1.35; word-break:break-word;";

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
    row.style.cssText = "display:flex; align-items:flex-start; gap:8px;";
    row.append(text, count);

    toast.append(icon, row);

    // ✅ 최신을 항상 위로
    host.prepend(toast);
    enforceToastLimit(host);

    requestAnimationFrame(() => {
      toast.style.opacity = "1";
      toast.style.transform = "translateY(0)";
    });

    attachToastTimer(toast, ms);
  };
})();
