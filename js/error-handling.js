// ==================== 딱필모 오류 처리 강화 시스템 ====================
// 파일명: error-handling.js
// 설명: 전역 오류 처리, Favicon 로딩, 안전한 UI 생성 기능 제공
// 작성일: 2025년

(function() {
  'use strict';
  
  console.log('🛡️ 딱필모 오류 처리 시스템 로딩 시작...');

  // ==================== 1. 전역 오류 관리자 ====================
  class ErrorManager {
    constructor() {
      this.errorLog = [];
      this.maxErrors = 50;
      this.bootAt = Date.now();
      this.maxRetryWindowMs = 15000;
      this.resourceRetryOnce = new Set();
      this.setupGlobalErrorHandlers();
    }

    setupGlobalErrorHandlers() {
      // JavaScript 런타임 오류 처리
      window.addEventListener('error', (event) => {
        if (event.target && event.target !== window) return;
        this.handleError({
          type: 'javascript',
          message: event.message,
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          error: event.error,
          timestamp: Date.now()
        });
      });

      // Promise rejection 오류 처리
      window.addEventListener('unhandledrejection', (event) => {
        this.handleError({
          type: 'promise',
          message: `Unhandled Promise Rejection: ${event.reason}`,
          reason: event.reason,
          timestamp: Date.now()
        });
        event.preventDefault();
      });

      // 리소스 로딩 오류 처리
      window.addEventListener('error', (event) => {
        if (event.target !== window) {
          this.handleError({
            type: 'resource',
            message: `Failed to load resource: ${event.target.src || event.target.href}`,
            element: event.target.tagName,
            src: event.target.src || event.target.href,
            timestamp: Date.now()
          });
        }
      }, true);
    }

    handleError(errorInfo) {
      // ✅ 1.5초 내 동일 에러는 한 번만 처리
      this._dedupe = this._dedupe || new Map();
      const key = `${errorInfo.type}|${errorInfo.message}|${errorInfo.filename || ''}|${errorInfo.src || ''}`;
      const now = Date.now();
      const last = this._dedupe.get(key) || 0;
      if (now - last < 1500) return;
      this._dedupe.set(key, now);
      
      this.errorLog.push(errorInfo);
      
      if (this.errorLog.length > this.maxErrors) {
        this.errorLog = this.errorLog.slice(-this.maxErrors);
      }

      if (this.isDevelopment()) {
        console.group(`🚨 Error [${errorInfo.type}]`);
        console.error('Message:', errorInfo.message);
        console.error('Details:', errorInfo);
        console.trace();
        console.groupEnd();
      }

      this.showUserFriendlyError(errorInfo);
      this.attemptRecovery(errorInfo);
    }

    isDevelopment() {
      return window.location.hostname === 'localhost' || 
             window.location.hostname === '127.0.0.1' ||
             window.location.search.includes('debug=true');
    }

    showUserFriendlyError(errorInfo) {
      let message = '⚠️ 일시적인 오류가 발생했습니다';
      
      switch (errorInfo.type) {
        case 'resource':
          if (errorInfo.src && errorInfo.src.includes('favicon')) {
            return;
          }
          message = '📡 일부 리소스를 불러오는데 실패했습니다';
          break;
        case 'promise':
          message = '🔄 데이터 처리 중 오류가 발생했습니다';
          break;
        case 'javascript':
          message = '⚡ 기능 실행 중 오류가 발생했습니다';
          break;
      }

      if (typeof window.showToast === 'function') {
        window.showToast(message, 'error');
      } else {
        this.fallbackToast(message);
      }
    }

    fallbackToast(message) {
      const toast = document.createElement('div');
      toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #ff4757;
        color: white;
        padding: 12px 16px;
        border-radius: 8px;
        font-size: 14px;
        z-index: 10000;
        transform: translateX(100%);
        transition: transform 0.3s ease;
        max-width: 300px;
        box-shadow: 0 4px 12px rgba(255, 71, 87, 0.3);
      `;
      toast.textContent = message;
      document.body.appendChild(toast);

      requestAnimationFrame(() => {
        toast.style.transform = 'translateX(0)';
      });

      setTimeout(() => {
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => toast.remove(), 300);
      }, 4000);
    }

    attemptRecovery(errorInfo) {
      switch (errorInfo.type) {
        case 'javascript':
          this.validateCriticalFunctions();
          break;
        case 'resource':
          this.retryResourceLoad(errorInfo);
          break;
      }
    }

    validateCriticalFunctions() {
      const criticalFunctions = ['renderSites', 'getFilteredSites', 'updateStats'];
      
      criticalFunctions.forEach(funcName => {
        if (typeof window[funcName] !== 'function') {
          console.warn(`⚠️ Critical function missing: ${funcName}`);
        }
      });
    }

    retryResourceLoad(errorInfo) {
      const src = String(errorInfo?.src || "").trim();
      if (!src) return;

      const isCritical =
        src.includes("fuse.js") ||
        src.includes("categories-data.js") ||
        src.includes("sites-data.js");
      if (!isCritical) return;

      const bootAt = Number.isFinite(this.bootAt) ? this.bootAt : Date.now();
      const retryWindow = Number.isFinite(this.maxRetryWindowMs)
        ? this.maxRetryWindowMs
        : 15000;
      if (Date.now() - bootAt > retryWindow) return;

      if (!(this.resourceRetryOnce instanceof Set)) {
        this.resourceRetryOnce = new Set();
      }
      if (this.resourceRetryOnce.has(src)) return;
      this.resourceRetryOnce.add(src);

      const already = Array.from(document.scripts || []).some(
        (script) => script?.src && script.src.includes(src)
      );
      if (already) return;

      setTimeout(() => {
        console.log("retrying critical resource:", src);
        this.reloadScript(src);
      }, 2000);
    }

    reloadScript(src) {
      const script = document.createElement('script');

      // ✅ 캐시 때문에 재시도해도 같은 실패 반복될 수 있어 cache-bust
      const bust = `retry=${Date.now()}`;
      script.src = src.includes('?') ? `${src}&${bust}` : `${src}?${bust}`;
      script.async = true;

      script.onload = () => {
        console.log(`✅ Retry loaded: ${src}`);
      };

      script.onerror = () => {
        console.error(`❌ Retry failed for: ${src}`);
        this.fallbackToast('💥 필수 리소스 로딩에 실패했습니다. 페이지를 새로고침해주세요.');
      };

      document.head.appendChild(script);
    }

    getErrorSummary() {
      const summary = {
        total: this.errorLog.length,
        types: {},
        recent: this.errorLog.slice(-5)
      };

      this.errorLog.forEach(error => {
        summary.types[error.type] = (summary.types[error.type] || 0) + 1;
      });

      return summary;
    }
  }

  // ==================== 2. 향상된 Favicon 로더 ====================
  class FaviconLoader {
    constructor() {
      this.cache = new Map();
      this.failedUrls = new Set();
      this.retryCount = new Map();
      this.maxRetries = 2;
      this.bootAt = Date.now();               // 앱 시작 타임스탬프
      this.resourceRetryOnce = new Set();     // src별 1회만
      this.maxRetryWindowMs = 15000;          // 15초 안에만 재주입 허용
    }

    async loadFavicon(domain, fallbackText = '?') {
      const url = `https://www.google.com/s2/favicons?sz=64&domain_url=${encodeURIComponent(domain)}`;
      
      if (this.cache.has(url)) {
        return this.cache.get(url);
      }

      if (this.failedUrls.has(url)) {
        return this.createFallbackIcon(fallbackText);
      }

      try {
        const result = await this.loadWithTimeout(url, fallbackText, 3000);
        this.cache.set(url, result);
        return result;
      } catch (error) {
        console.warn(`Favicon load failed for ${domain}:`, error);
        this.handleFaviconError(url, fallbackText);
        return this.createFallbackIcon(fallbackText);
      }
    }

    loadWithTimeout(url, fallbackText, timeout = 3000) {
      return new Promise((resolve, reject) => {
        const img = new Image();
        const timeoutId = setTimeout(() => {
          reject(new Error(`Favicon load timeout: ${url}`));
        }, timeout);

        img.onload = () => {
          clearTimeout(timeoutId);
          resolve({
            type: 'image',
            src: url,
            element: img
          });
        };

        img.onerror = () => {
          clearTimeout(timeoutId);
          reject(new Error(`Favicon load error: ${url}`));
        };

        img.src = url;
      });
    }

    handleFaviconError(url, fallbackText) {
      const retries = this.retryCount.get(url) || 0;
      
      if (retries < this.maxRetries) {
        this.retryCount.set(url, retries + 1);
      } else {
        this.failedUrls.add(url);
        this.retryCount.delete(url);
      }
    }

    createFallbackIcon(text = '?') {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      canvas.width = 64;
      canvas.height = 64;
      
      const gradient = ctx.createLinearGradient(0, 0, 64, 64);
      gradient.addColorStop(0, '#667eea');
      gradient.addColorStop(1, '#764ba2');
      
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 64, 64);
      
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 24px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text.charAt(0).toUpperCase(), 32, 32);
      
      return {
        type: 'canvas',
        src: canvas.toDataURL(),
        element: canvas
      };
    }

    clearCache() {
      this.cache.clear();
      this.failedUrls.clear();
      this.retryCount.clear();
    }
  }

  // ==================== 3. 안전한 유틸리티 함수들 ====================
  
  // HTML 이스케이프 함수
  const escapeHtml =
    window.ddakpilmo?.utils?.escapeHtml ||
    window.escapeHtml ||
    ((value) => String(value ?? ""));

  const getChosungSafe =
    window.ddakpilmo?.utils?.getChosungSafe ||
    window.getChosungSafe ||
    ((value) => String(value ?? ""));

// ==================== 4. 강화된 사이트 카드 생성 함수 ====================

  // ==================== 5. 공유 기능 ====================
  function fallbackShare(site) {
    const url = site.url || "";
    const title = site.name || "";
    
    if (navigator.share) {
      navigator.share({ title, url }).catch(err => {
        console.log('Share cancelled:', err);
      });
    } else if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(() => {
        if (typeof window.showToast === 'function') {
          window.showToast('📋 링크가 복사되었습니다!', 'success');
        }
      }).catch(err => {
        console.error('Clipboard copy failed:', err);
        fallbackCopyToClipboard(url);
      });
    } else {
      fallbackCopyToClipboard(url);
    }
  }

  function fallbackCopyToClipboard(text) {
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.cssText = 'position: fixed; left: -9999px; top: -9999px; opacity: 0;';
      
      document.body.appendChild(textarea);
      textarea.select();
      textarea.setSelectionRange(0, 99999);
      
      const successful = document.execCommand('copy');
      document.body.removeChild(textarea);
      
      if (successful && typeof window.showToast === 'function') {
        window.showToast('📋 링크가 복사되었습니다!', 'success');
      }
    } catch (error) {
      console.error('Fallback copy failed:', error);
    }
  }

  // ==================== 6. CSS 추가 ====================
  const errorHandlingCSS = `
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .error-card {
      border: 1px solid #f8d7da;
      background-color: #f8d7da;
      color: #721c24;
    }

    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    }

    .icon-container {
      transition: all 0.3s ease;
    }

    .icon-container:hover {
      transform: scale(1.05);
    }
  `;

  // ==================== 7. 초기화 함수 ====================
  function initializeErrorHandling() {
    console.log('🛡️ 오류 처리 시스템 초기화 시작...');
    
    try {
      // 네임스페이스 생성
      window.ddakpilmo = window.ddakpilmo || {};
      
      // 전역 오류 관리자 초기화
      window.ddakpilmo.errorManager = new ErrorManager();
      
      // Favicon 로더 초기화
      window.ddakpilmo.faviconLoader = new FaviconLoader();
      
      // CSS 추가
      const styleSheet = document.createElement('style');
      styleSheet.textContent = errorHandlingCSS;
      document.head.appendChild(styleSheet);
      
      // 유틸리티 함수들 등록
      window.ddakpilmo.escapeHtml = escapeHtml;
      window.ddakpilmo.getChosungSafe = getChosungSafe;
      window.ddakpilmo.fallbackShare = fallbackShare;
      window.ddakpilmo.fallbackCopyToClipboard = fallbackCopyToClipboard;
      
      // 기존 함수 백업 및 대체 (안전하게)
      
      console.log('✅ 오류 처리 시스템 초기화 완료!');
      
      // 개발 환경에서만 디버깅 함수 제공
      if (window.location.hostname === 'localhost' || window.location.search.includes('debug=true')) {
        window.getErrorSummary = () => window.ddakpilmo.errorManager.getErrorSummary();
        window.clearFaviconCache = () => window.ddakpilmo.faviconLoader.clearCache();
        console.log('🔧 Debug functions: getErrorSummary(), clearFaviconCache()');
      }
      
    } catch (error) {
      console.error('❌ 오류 처리 시스템 초기화 실패:', error);
      // 최소한의 폴백
      window.addEventListener('error', (e) => {
        console.error('Fallback error handler:', e.error);
      });
    }
  }

  // ==================== 8. 자동 초기화 ====================
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeErrorHandling);
  } else {
    initializeErrorHandling();
  }

  console.log('🛡️ 딱필모 오류 처리 시스템 로딩 완료!');

})();
