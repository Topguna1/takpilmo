export function installInitBootstrap() {
  if (window.__initBootstrapRegistered) {
    console.log("[bootstrap] already registered; skip");
    return;
  }
  window.__initBootstrapRegistered = true;

  async function loadDetailsSafely() {
    if (typeof window.loadDetailsFromSheet !== "function") return;
    try {
      await window.loadDetailsFromSheet({ cacheMinutes: 0 });
    } catch (error) {
      console.warn("[init] detail sheet load failed; continuing with fallback descriptions", error);
    }
  }

  async function runDirectInit() {
    if (typeof window.loadJSONData !== "function") {
      throw new Error("loadJSONData() is unavailable");
    }

    await window.loadJSONData();

    if (typeof window.init !== "function") {
      throw new Error("init() is unavailable");
    }

    const ok = window.init();
    if (ok === false) {
      throw new Error("init() returned false");
    }

    await loadDetailsSafely();
    window.ensureSiteIds?.();
    window.initializeTheme?.();
    window.setupSettingsPanel?.();
    window.renderCategorySections?.();
    window.buildCategoryTabs?.();
    window.setupEventListeners?.();
    window.setupScrollFabs?.();
    window.initFuse?.();
    window.renderSites?.();
    window.setupHashRouting?.();
  }

  function registerRunnerSteps() {
    const addStep = (name, fn, opts) => {
      window.initRunner.add(
        name,
        async () => {
          try {
            return await fn();
          } catch (error) {
            console.warn(`[init] step failed: ${name}`, error);
            throw error;
          }
        },
        opts
      );
    };

    addStep("data:load-json", async () => {
      if (typeof window.loadJSONData !== "function") {
        throw new Error("loadJSONData() is unavailable");
      }
      await window.loadJSONData();
    });

    addStep(
      "data:prepare-state",
      () => {
        if (typeof window.init !== "function") {
          throw new Error("init() is unavailable");
        }
        const ok = window.init();
        if (ok === false) throw new Error("init() returned false");
      },
      { after: ["data:load-json"] }
    );

    addStep(
      "data:load-details-sheet",
      () => loadDetailsSafely(),
      { after: ["data:prepare-state"] }
    );

    addStep(
      "data:ensure-site-ids",
      () => window.ensureSiteIds?.(),
      { after: ["data:prepare-state"] }
    );

    addStep(
      "ui:theme-init",
      () => window.initializeTheme?.(),
      { after: ["data:prepare-state"] }
    );

    addStep(
      "ui:settings-init",
      () => window.setupSettingsPanel?.(),
      { after: ["ui:theme-init"] }
    );

    addStep(
      "ui:render-sections",
      () => window.renderCategorySections?.(),
      { after: ["data:prepare-state"] }
    );

    addStep(
      "ui:build-tabs",
      () => window.buildCategoryTabs?.(),
      { after: ["ui:render-sections"] }
    );

    addStep(
      "ui:list-events",
      () => window.setupEventListeners?.(),
      { after: ["ui:build-tabs"] }
    );

    addStep(
      "ui:scroll-fabs",
      () => window.setupScrollFabs?.(),
      { after: ["ui:build-tabs"] }
    );

    addStep(
      "search:init-fuse",
      () => window.initFuse?.(),
      { after: ["data:prepare-state"] }
    );

    addStep(
      "ui:request-render",
      () => window.renderSites?.(),
      { after: ["ui:list-events", "data:ensure-site-ids"] }
    );

    addStep(
      "routing:bind",
      () => window.setupHashRouting?.(),
      { after: ["ui:request-render"] }
    );
  }

  function configureMemoryManagerLogLevel() {
    setTimeout(() => {
      if (window.memoryManager && window.memoryManager.setLogLevel && window.LogLevel) {
        window.memoryManager.setLogLevel(window.LogLevel.WARN);
        console.log("[memory] log level set to WARN");
      }
    }, 1000);
  }

  function runInitRunner() {
    if (window.__initRunnerStarted) {
      console.log("[bootstrap] init runner already started; skip");
      return;
    }
    window.__initRunnerStarted = true;

    if (!window.initRunner || typeof window.initRunner.add !== "function") {
      console.warn("[bootstrap] initRunner unavailable; using direct init path");
      runDirectInit().catch((error) => window.handleInitializationFailure?.(error));
      return;
    }

    try {
      registerRunnerSteps();
    } catch (error) {
      window.handleInitializationFailure?.(error);
      return;
    }

    window.initRunner.run().then((report) => {
      console.log("[init] report:", report, window.initRunner.status());
      if (report?.failed?.length) {
        window.handleInitializationFailure?.(
          new Error(`Init failed steps: ${report.failed.join(", ")}`)
        );
        return;
      }
      if (location.hash.includes("#site=")) {
        window.App?.router?.parseRoute?.() || window.__route?.parseRoute?.();
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", runInitRunner, { once: true });
    document.addEventListener("DOMContentLoaded", configureMemoryManagerLogLevel, { once: true });
  } else {
    runInitRunner();
    configureMemoryManagerLogLevel();
  }

  window.addEventListener("online", () => window.showToast?.("인터넷이 연결되었습니다."));
  window.addEventListener("offline", () => window.showToast?.("인터넷 연결이 끊어졌습니다", "error"));
}
