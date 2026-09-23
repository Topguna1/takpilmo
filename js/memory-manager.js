
// ==================== 딱필모 메모리 누수 방지 시스템 ====================
// 파일명: memory-manager.js
// 설명: 이벤트 리스너, 타이머, 캐시 등의 메모리 누수 방지

(function() {
  'use strict';
  
  // ==================== 로그 레벨 설정 ====================
  const LogLevel = {
    SILENT: 0,   // 아무것도 표시 안 함
    ERROR: 1,    // 오류만 표시
    WARN: 2,     // 경고 + 오류
    INFO: 3,     // 정보 + 경고 + 오류
    DEBUG: 4,    // 모든 것 표시 (개발용)
    VERBOSE: 5   // 매우 상세한 로그 (디버깅용)
  };

  // ==================== 로거 클래스 ====================
  class Logger {
    constructor(prefix = '', level = LogLevel.INFO) {
      this.prefix = prefix;
      this.level = level;
      this.autoDetectLevel();
    }

    // 자동으로 환경 감지
    autoDetectLevel() {
      const hostname = window.location.hostname;
      const isDebug = window.location.search.includes('debug=true');
      const isVerbose = window.location.search.includes('verbose=true');
      
      if (isVerbose) {
        this.level = LogLevel.VERBOSE;
      } else if (isDebug) {
        this.level = LogLevel.DEBUG;
      } else if (hostname === 'localhost' || hostname === '127.0.0.1') {
        this.level = LogLevel.INFO; // 로컬에서는 INFO
      } else {
        this.level = LogLevel.WARN; // 프로덕션에서는 WARN만
      }
    }

    // 로그 출력 여부 체크
    shouldLog(level) {
      return this.level >= level;
    }

    // 포맷팅된 메시지 생성
    format(message, _level) {
      const timestamp = new Date().toLocaleTimeString();
      const prefix = this.prefix ? `[${this.prefix}] ` : '';
      return `${timestamp} ${prefix}${message}`;
    }

    // 에러 로그
    error(message, ...args) {
      if (this.shouldLog(LogLevel.ERROR)) {
        console.error(this.format(`❌ ${message}`, LogLevel.ERROR), ...args);
      }
    }

    // 경고 로그
    warn(message, ...args) {
      if (this.shouldLog(LogLevel.WARN)) {
        console.warn(this.format(`⚠️ ${message}`, LogLevel.WARN), ...args);
      }
    }

    // 정보 로그
    info(message, ...args) {
      if (this.shouldLog(LogLevel.INFO)) {
        console.log(this.format(`ℹ️ ${message}`, LogLevel.INFO), ...args);
      }
    }

    // 디버그 로그
    debug(message, ...args) {
      if (this.shouldLog(LogLevel.DEBUG)) {
        console.log(this.format(`🔍 ${message}`, LogLevel.DEBUG), ...args);
      }
    }

    // 상세 로그
    verbose(message, ...args) {
      if (this.shouldLog(LogLevel.VERBOSE)) {
        console.log(this.format(`📝 ${message}`, LogLevel.VERBOSE), ...args);
      }
    }

    // 그룹 시작
    group(title) {
      if (this.shouldLog(LogLevel.DEBUG)) {
        console.group(this.format(title));
      }
    }

    groupEnd() {
      if (this.shouldLog(LogLevel.DEBUG)) {
        console.groupEnd();
      }
    }

    // 로그 레벨 변경
    setLevel(level) {
      this.level = level;
      this.info(`로그 레벨 변경: ${this.getLevelName(level)}`);
    }

    getLevelName(level) {
      const names = {
        [LogLevel.SILENT]: 'SILENT',
        [LogLevel.ERROR]: 'ERROR',
        [LogLevel.WARN]: 'WARN',
        [LogLevel.INFO]: 'INFO',
        [LogLevel.DEBUG]: 'DEBUG',
        [LogLevel.VERBOSE]: 'VERBOSE'
      };
      return names[level] || 'UNKNOWN';
    }

    getCurrentLevel() {
      return {
        level: this.level,
        name: this.getLevelName(this.level)
      };
    }
  }

  // ==================== 수정된 이벤트 관리자 (로그 레벨 적용) ====================
  class EventManager {
    constructor() {
      this.listeners = new Map();
      this.listenerCount = 0;
      this.logger = new Logger('EventManager');
    }

    add(element, event, handler, options = {}) {
      if (!element || typeof event !== 'string' || typeof handler !== 'function') {
        this.logger.warn('잘못된 이벤트 리스너 매개변수:', { element, event, handler });
        return null;
      }

      try {
        element.addEventListener(event, handler, options);
        
        if (!this.listeners.has(element)) {
          this.listeners.set(element, []);
        }
        
        const listenerInfo = { event, handler, options, addedAt: Date.now() };
        this.listeners.get(element).push(listenerInfo);
        this.listenerCount++;
        
        // 🎚️ verbose 레벨에서만 표시
        this.logger.verbose(`이벤트 리스너 추가: ${event} (총 ${this.listenerCount}개)`);
        
        return () => this.remove(element, event, handler, options);
        
      } catch (error) {
        this.logger.error('이벤트 리스너 추가 실패:', error);
        return null;
      }
    }

    remove(element, event, handler, options = {}) {
      if (!element || !this.listeners.has(element)) return false;

      try {
        element.removeEventListener(event, handler, options);
        
        const elementListeners = this.listeners.get(element);
        const index = elementListeners.findIndex(
          l => l.event === event && l.handler === handler
        );
        
        if (index !== -1) {
          elementListeners.splice(index, 1);
          this.listenerCount--;
          // 🎚️ verbose 레벨에서만 표시
          this.logger.verbose(`이벤트 리스너 제거: ${event} (남은 개수: ${this.listenerCount}개)`);
        }
        
        if (elementListeners.length === 0) {
          this.listeners.delete(element);
        }
        
        return true;
        
      } catch (error) {
        this.logger.error('이벤트 리스너 제거 실패:', error);
        return false;
      }
    }

    removeAll(element) {
      if (!this.listeners.has(element)) return 0;

      const elementListeners = this.listeners.get(element);
      let removedCount = 0;

      elementListeners.forEach(({ event, handler, options }) => {
        try {
          element.removeEventListener(event, handler, options);
          removedCount++;
        } catch (error) {
          this.logger.warn('이벤트 리스너 제거 중 오류:', error);
        }
      });

      this.listeners.delete(element);
      this.listenerCount -= removedCount;
      
      // 🎚️ debug 레벨에서만 표시
      this.logger.debug(`요소의 모든 이벤트 리스너 제거: ${removedCount}개`);
      return removedCount;
    }

    cleanup() {
      // 🎚️ 중요한 정리는 info 레벨로 표시
      this.logger.info(`전체 이벤트 리스너 정리 시작... (${this.listenerCount}개)`);
      
      let totalRemoved = 0;
      
      this.listeners.forEach((listeners, element) => {
        listeners.forEach(({ event, handler, options }) => {
          try {
            element.removeEventListener(event, handler, options);
            totalRemoved++;
          } catch (error) {
            this.logger.warn('이벤트 리스너 제거 중 오류:', error);
          }
        });
      });

      this.listeners.clear();
      this.listenerCount = 0;
      
      this.logger.info(`이벤트 리스너 정리 완료: ${totalRemoved}개 제거됨`);
      return totalRemoved;
    }

    findOldListeners(maxAge = 3600000) {
      const now = Date.now();
      const oldListeners = [];

      this.listeners.forEach((listeners, element) => {
        listeners.forEach(listener => {
          const age = now - listener.addedAt;
          if (age > maxAge) {
            oldListeners.push({
              element,
              event: listener.event,
              age: Math.floor(age / 1000),
              addedAt: new Date(listener.addedAt).toLocaleString()
            });
          }
        });
      });

      if (oldListeners.length > 0) {
        this.logger.warn(`오래된 리스너 발견: ${oldListeners.length}개`);
      }

      return oldListeners;
    }

    getStats() {
      return {
        totalListeners: this.listenerCount,
        elementsWithListeners: this.listeners.size,
        oldListeners: this.findOldListeners().length
      };
    }
  }

  // ==================== 수정된 타이머 관리자 ====================
  class TimerManager {
    constructor() {
      this.timers = new Set();
      this.intervals = new Set();
      this.animationFrames = new Set();
      this.logger = new Logger('TimerManager');
    }

    setTimeout(callback, delay, ...args) {
      const timerId = window.setTimeout(() => {
        try {
          callback(...args);
        } finally {
          this.timers.delete(timerId);
        }
      }, delay);

      this.timers.add(timerId);
      // 🎚️ verbose 레벨에서만 표시
      this.logger.verbose(`setTimeout 추가 (총 ${this.timers.size}개)`);
      
      return timerId;
    }

    setInterval(callback, interval, ...args) {
      const intervalId = window.setInterval(() => {
        try {
          callback(...args);
        } catch (error) {
          this.logger.error('Interval 실행 오류:', error);
        }
      }, interval);

      this.intervals.add(intervalId);
      // 🎚️ debug 레벨에서만 표시
      this.logger.debug(`setInterval 추가 (총 ${this.intervals.size}개)`);
      
      return intervalId;
    }

    requestAnimationFrame(callback) {
      const frameId = window.requestAnimationFrame((time) => {
        try {
          callback(time);
        } finally {
          this.animationFrames.delete(frameId);
        }
      });

      this.animationFrames.add(frameId);
      return frameId;
    }

    clearTimeout(timerId) {
      if (timerId) {
        window.clearTimeout(timerId);
        this.timers.delete(timerId);
        this.logger.verbose(`setTimeout 제거 (남은 개수: ${this.timers.size}개)`);
      }
    }

    clearInterval(intervalId) {
      if (intervalId) {
        window.clearInterval(intervalId);
        this.intervals.delete(intervalId);
        this.logger.debug(`setInterval 제거 (남은 개수: ${this.intervals.size}개)`);
      }
    }

    cancelAnimationFrame(frameId) {
      if (frameId) {
        window.cancelAnimationFrame(frameId);
        this.animationFrames.delete(frameId);
      }
    }

    cleanup() {
      this.logger.info(`타이머 정리 시작... (${this.timers.size + this.intervals.size + this.animationFrames.size}개)`);
      
      this.timers.forEach(id => window.clearTimeout(id));
      const timeoutCount = this.timers.size;
      this.timers.clear();
      
      this.intervals.forEach(id => window.clearInterval(id));
      const intervalCount = this.intervals.size;
      this.intervals.clear();
      
      this.animationFrames.forEach(id => window.cancelAnimationFrame(id));
      const frameCount = this.animationFrames.size;
      this.animationFrames.clear();
      
      this.logger.info(`타이머 정리 완료: ${timeoutCount} timeouts, ${intervalCount} intervals, ${frameCount} frames`);
      
      return { timeouts: timeoutCount, intervals: intervalCount, animationFrames: frameCount };
    }

    getStats() {
      return {
        activeTimeouts: this.timers.size,
        activeIntervals: this.intervals.size,
        activeAnimationFrames: this.animationFrames.size,
        total: this.timers.size + this.intervals.size + this.animationFrames.size
      };
    }
  }

  // ==================== 수정된 캐시 관리자 ====================
  class CacheManager {
    constructor(maxSize = 100, maxAge = 3600000) {
      this.cache = new Map();
      this.maxSize = maxSize;
      this.maxAge = maxAge;
      this.hits = 0;
      this.misses = 0;
      this.logger = new Logger('CacheManager');
    }

    set(key, value) {
      if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
        const firstKey = this.cache.keys().next().value;
        this.cache.delete(firstKey);
        this.logger.debug(`캐시 용량 초과로 가장 오래된 항목 제거: ${firstKey}`);
      }

      if (this.cache.has(key)) {
        this.cache.delete(key);
      }

      this.cache.set(key, {
        value,
        timestamp: Date.now(),
        accessCount: 0
      });

      // 🎚️ verbose 레벨에서만 표시
      this.logger.verbose(`캐시 저장: ${key} (총 ${this.cache.size}개)`);
    }

    get(key) {
      const item = this.cache.get(key);

      if (!item) {
        this.misses++;
        // 🎚️ verbose 레벨에서만 표시
        this.logger.verbose(`캐시 미스: ${key}`);
        return undefined;
      }

      const age = Date.now() - item.timestamp;
      if (age > this.maxAge) {
        this.cache.delete(key);
        this.misses++;
        this.logger.debug(`캐시 만료: ${key} (${Math.floor(age / 1000)}초 경과)`);
        return undefined;
      }

      item.accessCount++;
      this.hits++;
      
      this.cache.delete(key);
      this.cache.set(key, item);

      // 🎚️ verbose 레벨에서만 표시
      this.logger.verbose(`캐시 히트: ${key}`);
      return item.value;
    }

    has(key) {
      return this.cache.has(key);
    }

    delete(key) {
      const deleted = this.cache.delete(key);
      if (deleted) {
        this.logger.debug(`캐시 삭제: ${key}`);
      }
      return deleted;
    }

    cleanExpired() {
      const now = Date.now();
      let cleanedCount = 0;

      for (const [key, item] of this.cache.entries()) {
        const age = now - item.timestamp;
        if (age > this.maxAge) {
          this.cache.delete(key);
          cleanedCount++;
        }
      }

      if (cleanedCount > 0) {
        this.logger.info(`만료된 캐시 정리: ${cleanedCount}개 삭제됨`);
      }

      return cleanedCount;
    }

    clear() {
      const size = this.cache.size;
      this.cache.clear();
      this.hits = 0;
      this.misses = 0;
      this.logger.info(`모든 캐시 정리: ${size}개 삭제됨`);
      return size;
    }

    getStats() {
      const hitRate = this.hits + this.misses > 0 
        ? (this.hits / (this.hits + this.misses) * 100).toFixed(2)
        : 0;

      return {
        size: this.cache.size,
        maxSize: this.maxSize,
        hits: this.hits,
        misses: this.misses,
        hitRate: `${hitRate}%`,
        memoryUsage: this.estimateMemoryUsage()
      };
    }

    estimateMemoryUsage() {
      let totalSize = 0;
      this.cache.forEach((item, key) => {
        totalSize += key.length * 2;
        totalSize += JSON.stringify(item.value).length * 2;
      });
      return `${(totalSize / 1024).toFixed(2)} KB`;
    }
  }

  // ==================== DOM 참조 관리자 (로그 적용) ====================
  class DOMReferenceManager {
    constructor() {
      this.references = new WeakMap();
      this.strongReferences = new Map();
      this.logger = new Logger('DOMRefManager');
    }

    setWeak(element, data) {
      if (element instanceof Node) {
        this.references.set(element, data);
      }
    }

    getWeak(element) {
      return this.references.get(element);
    }

    setStrong(key, element) {
      this.strongReferences.set(key, {
        element,
        timestamp: Date.now()
      });
      this.logger.debug(`강한 참조 저장: ${key}`);
    }

    getStrong(key) {
      const ref = this.strongReferences.get(key);
      return ref ? ref.element : undefined;
    }

    deleteStrong(key) {
      const deleted = this.strongReferences.delete(key);
      if (deleted) {
        this.logger.debug(`강한 참조 제거: ${key}`);
      }
      return deleted;
    }

    clearStrong() {
      const size = this.strongReferences.size;
      this.strongReferences.clear();
      this.logger.info(`모든 강한 참조 정리: ${size}개`);
      return size;
    }

    getStats() {
      return {
        strongReferences: this.strongReferences.size
      };
    }
  }

  // ==================== 메모리 모니터 (로그 적용) ====================
  class MemoryMonitor {
    constructor() {
      this.checkInterval = null;
      this.warningThreshold = 0.8;
      this.history = [];
      this.maxHistorySize = 10;
      this.logger = new Logger('MemoryMonitor');
    }

    getMemoryInfo() {
      if (performance.memory) {
        const { usedJSHeapSize, totalJSHeapSize, jsHeapSizeLimit } = performance.memory;
        
        return {
          used: (usedJSHeapSize / 1024 / 1024).toFixed(2) + ' MB',
          total: (totalJSHeapSize / 1024 / 1024).toFixed(2) + ' MB',
          limit: (jsHeapSizeLimit / 1024 / 1024).toFixed(2) + ' MB',
          usageRatio: (usedJSHeapSize / jsHeapSizeLimit).toFixed(3),
          timestamp: Date.now()
        };
      }
      
      return null;
    }

    startMonitoring(interval = 30000) {
      if (this.checkInterval) {
        this.logger.warn('이미 모니터링이 실행 중입니다');
        return;
      }

      this.logger.info(`메모리 모니터링 시작 (${interval / 1000}초마다)`);
      
      this.checkInterval = window.memoryManager.timerManager.setInterval(() => {
        const memInfo = this.getMemoryInfo();
        
        if (memInfo) {
          this.history.push(memInfo);
          if (this.history.length > this.maxHistorySize) {
            this.history.shift();
          }

          if (parseFloat(memInfo.usageRatio) > this.warningThreshold) {
            this.logger.warn(`메모리 사용량 높음: ${(parseFloat(memInfo.usageRatio) * 100).toFixed(1)}%`);
            
            if (typeof showToast === 'function') {
              showToast('⚠️ 메모리 사용량이 높습니다', 'warning');
            }
            
            this.performAutoCleanup();
          }
        }
      }, interval);
    }

    stopMonitoring() {
      if (this.checkInterval) {
        window.memoryManager.timerManager.clearInterval(this.checkInterval);
        this.checkInterval = null;
        this.logger.info('메모리 모니터링 중지');
      }
    }

    performAutoCleanup() {
      this.logger.info('자동 메모리 정리 시작...');
      
      const results = {
        cache: 0,
        oldListeners: 0,
        timers: 0
      };

      if (window.memoryManager.cacheManager) {
        results.cache = window.memoryManager.cacheManager.cleanExpired();
      }

      if (window.memoryManager.eventManager) {
        const oldListeners = window.memoryManager.eventManager.findOldListeners();
        results.oldListeners = oldListeners.length;
      }

      this.logger.info('자동 정리 완료:', results);
      return results;
    }

    getHistory() {
      return this.history;
    }

    getStats() {
      const current = this.getMemoryInfo();
      
      return {
        current,
        history: this.history,
        isMonitoring: this.checkInterval !== null
      };
    }
  }

  // ==================== 통합 메모리 관리자 ====================
  class MemoryManager {
    constructor() {
      this.eventManager = new EventManager();
      this.timerManager = new TimerManager();
      this.cacheManager = new CacheManager();
      this.domRefManager = new DOMReferenceManager();
      this.memoryMonitor = new MemoryMonitor();
      this.logger = new Logger('MemoryManager');
      
      this.setupPageUnloadHandler();
    }

    setupPageUnloadHandler() {
      window.addEventListener('beforeunload', () => {
        this.logger.info('페이지 언로드, 전체 정리 시작...');
        this.cleanup();
      });

      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          this.logger.debug('페이지 숨김, 부분 정리 시작...');
          this.partialCleanup();
        }
      });
    }

    cleanup() {
      this.logger.group('전체 메모리 정리');
      
      const results = {
        events: this.eventManager.cleanup(),
        timers: this.timerManager.cleanup(),
        cache: this.cacheManager.clear(),
        domRefs: this.domRefManager.clearStrong()
      };
      
      this.memoryMonitor.stopMonitoring();
      
      this.logger.info('전체 정리 완료:', results);
      this.logger.groupEnd();
      
      return results;
    }

    partialCleanup() {
      this.logger.group('부분 메모리 정리');
      
      const results = {
        expiredCache: this.cacheManager.cleanExpired(),
        oldListeners: this.eventManager.findOldListeners().length
      };
      
      this.logger.debug('부분 정리 완료:', results);
      this.logger.groupEnd();
      
      return results;
    }

    getStats() {
      return {
        events: this.eventManager.getStats(),
        timers: this.timerManager.getStats(),
        cache: this.cacheManager.getStats(),
        domRefs: this.domRefManager.getStats(),
        memory: this.memoryMonitor.getStats()
      };
    }

    printReport() {
      this.logger.group('메모리 사용 리포트');
      
      const stats = this.getStats();
      
      console.log('📋 이벤트 리스너:', stats.events);
      console.log('⏱️ 타이머:', stats.timers);
      console.log('💾 캐시:', stats.cache);
      console.log('🔗 DOM 참조:', stats.domRefs);
      console.log('🧠 메모리:', stats.memory);
      
      this.logger.groupEnd();
    }

    // 🎚️ 로그 레벨 제어 메서드
    setLogLevel(level) {
      this.logger.setLevel(level);
      this.eventManager.logger.setLevel(level);
      this.timerManager.logger.setLevel(level);
      this.cacheManager.logger.setLevel(level);
      this.domRefManager.logger.setLevel(level);
      this.memoryMonitor.logger.setLevel(level);
      
      console.log(`🎚️ 모든 로거의 레벨이 ${this.logger.getLevelName(level)}로 변경되었습니다`);
    }

    getLogLevel() {
      return this.logger.getCurrentLevel();
    }
  }

  // ==================== 초기화 ====================
  function initializeMemoryManager() {
    const logger = new Logger('Init');
    logger.info('메모리 관리자 초기화 시작...');
    
    try {
      window.memoryManager = new MemoryManager();
      window.LogLevel = LogLevel; // 전역으로 노출
      
      // 메모리 모니터링 시작 (개발 환경에서만)
      if (window.location.hostname === 'localhost' || 
          window.location.search.includes('debug=true')) {
        window.memoryManager.memoryMonitor.startMonitoring(30000);
      }
      
      logger.info('메모리 관리자 초기화 완료!');
      
      // 개발자 도구용 함수들
      if (window.location.hostname === 'localhost' || 
          window.location.search.includes('debug=true')) {
        
        window.getMemoryStats = () => window.memoryManager.getStats();
        window.printMemoryReport = () => window.memoryManager.printReport();
        window.cleanupMemory = () => window.memoryManager.cleanup();
        
        // 🎚️ 로그 레벨 제어 함수들
        window.setLogLevel = (level) => window.memoryManager.setLogLevel(level);
        window.getLogLevel = () => window.memoryManager.getLogLevel();
        
        console.log(`
🔧 메모리 디버깅 함수들:
  - getMemoryStats()     : 메모리 통계
  - printMemoryReport()  : 상세 리포트
  - cleanupMemory()      : 수동 정리

🎚️ 로그 레벨 제어:
  - setLogLevel(LogLevel.SILENT)  : 로그 끄기
  - setLogLevel(LogLevel.ERROR)   : 오류만
  - setLogLevel(LogLevel.WARN)    : 경고 + 오류
  - setLogLevel(LogLevel.INFO)    : 정보 + 경고 + 오류
  - setLogLevel(LogLevel.DEBUG)   : 디버그 로그 포함
  - setLogLevel(LogLevel.VERBOSE) : 모든 로그 (매우 상세)
  - getLogLevel()                 : 현재 로그 레벨 확인

현재 로그 레벨: ${window.memoryManager.getLogLevel().name}
        `);
      }
      
    } catch (error) {
      logger.error('메모리 관리자 초기화 실패:', error);
    }
  }

  // 자동 초기화
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeMemoryManager);
  } else {
    initializeMemoryManager();
  }

  console.log('🧹 로그 레벨 조정이 적용된 메모리 관리 시스템 로딩 완료!');

})();
