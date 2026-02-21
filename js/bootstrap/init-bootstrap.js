(function () {
  if (window.__initBootstrapRegistered) {
    console.log("[bootstrap] already registered; skip");
    return;
  }
  window.__initBootstrapRegistered = true;

  function runInitRunner() {
    if (window.__initRunnerStarted) {
      console.log("[bootstrap] init runner already started; skip");
      return;
    }
    window.__initRunnerStarted = true;

    if (!window.initRunner || typeof initRunner.add !== "function") {
      console.warn("[bootstrap] initRunner unavailable; fallback to direct init path");
      Promise.resolve()
        .then(() => window.loadJSONData?.())
        .then(() => {
          if (typeof window.init === "function") window.init();
          window.initializeTheme?.();
          window.setupSettingsPanel?.();
          window.renderCategorySections?.();
          window.buildCategoryTabs?.();
          window.setupEventListeners?.();
          window.setupScrollFabs?.();
          window.ensureSiteIds?.();
          window.initFuse?.();
          window.renderSites?.();
          window.setupHashRouting?.();
        })
        .catch((e) => window.handleInitializationFailure?.(e));
      return;
    }

    const addStep = (name, fn, opts) => {
      initRunner.add(
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
      await loadJSONData();
    });

    addStep(
      "data:prepare-state",
      () => {
        const ok = typeof init === "function" ? init() : false;
        if (ok === false) throw new Error("init() returned false");
      },
      { after: ["data:load-json"] }
    );

    addStep(
      "data:load-details-sheet",
      async () => {
        await loadDetailsFromSheet({ cacheMinutes: 60 });
      },
      { after: ["data:prepare-state"] }
    );

    addStep(
      "data:ensure-site-ids",
      () => {
        window.ensureSiteIds?.();
      },
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

    addStep(
      "ui:highlight",
      () => {
        const q = (
          window.state?.currentSearchQuery ||
          document.getElementById("searchInput")?.value ||
          ""
        ).trim();
        if (q && window.ddakHighlight) {
          const scope = document.getElementById("categoriesContainer") || document;
          window.ddakHighlight.apply(q, scope);
        }
      },
      { after: ["ui:request-render"] }
    );

    addStep(
      "ui:sync-stats",
      () => {
        if (typeof updateGlobalStats === "function") updateGlobalStats();
        else window.updateStats?.();
      },
      { after: ["ui:request-render"] }
    );

    initRunner.run().then((rep) => {
      console.log("[init] report:", rep, initRunner.status());
      if (rep?.failed?.length) {
        window.handleInitializationFailure?.(
          new Error(`Init failed steps: ${rep.failed.join(", ")}`)
        );
      }
      if (location.hash.includes("#site=")) window.__route?.parseRoute?.();
    });
  }

  function configureMemoryManagerLogLevel() {
    setTimeout(() => {
      if (window.memoryManager && window.memoryManager.setLogLevel && window.LogLevel) {
        window.memoryManager.setLogLevel(LogLevel.WARN);
        console.log("[memory] log level set to WARN");
      }
    }, 1000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", runInitRunner, { once: true });
    document.addEventListener("DOMContentLoaded", configureMemoryManagerLogLevel, {
      once: true,
    });
  } else {
    runInitRunner();
    configureMemoryManagerLogLevel();
  }

  window.addEventListener("online", () => showToast("🌐 인터넷이 연결되었습니다"));
  window.addEventListener("offline", () => showToast("📴 인터넷 연결이 끊어졌습니다"));
})();
