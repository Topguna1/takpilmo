// ==================== 유틸리티 함수들 ====================

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function debounce(func, wait) {
  let timeoutId;
  const timerManager = window.memoryManager?.timerManager;

  return function executedFunction(...args) {
    const later = () => {
      // 🧹 메모리 관리자를 통한 타이머 정리
      if (timerManager && timeoutId) {
        timerManager.clearTimeout(timeoutId);
      }
      func(...args);
    };

    // 🧹 기존 타이머 정리
    if (timerManager && timeoutId) {
      timerManager.clearTimeout(timeoutId);
    } else if (timeoutId) {
      clearTimeout(timeoutId);
    }

    // 🧹 메모리 관리자를 통한 새 타이머 설정
    if (timerManager) {
      timeoutId = timerManager.setTimeout(later, wait);
    } else {
      timeoutId = setTimeout(later, wait);
    }
  };
}

function getChosung(str) {
  const CHOSUNG_LIST = [
    "ㄱ","ㄲ","ㄴ","ㄷ","ㄸ","ㄹ","ㅁ","ㅂ","ㅃ","ㅅ","ㅆ",
    "ㅇ","ㅈ","ㅉ","ㅊ","ㅋ","ㅌ","ㅍ","ㅎ"
  ];
  let result = "";
  str = String(str ?? "");
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i) - 44032;
    if (code >= 0 && code <= 11171) {
      result += CHOSUNG_LIST[Math.floor(code / 588)];
    } else {
      result += str[i];
    }
  }
  return result;
}

// ✅ 전역 노출(기존 코드 호환)
window.escapeHtml = escapeHtml;
window.debounce = debounce;
window.getChosung = getChosung;
