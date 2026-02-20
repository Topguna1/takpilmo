(function () {
  if (window.__initBootstrapRegistered) {
    console.log("[bootstrap] already registered; skip");
    return;
  }
  window.__initBootstrapRegistered = true;

  function runInitRunner() {
    if (!window.initRunner || typeof initRunner.add !== "function") {
      console.warn("[bootstrap] initRunner unavailable; fallback to legacy init");
      try {
        if (typeof init === "function") init();
      } catch (e) {
        console.warn("[init] legacy/init error:", e);
      }
      return;
    }

    initRunner.add("data:load-json", async () => {
      await loadJSONData();
    });

    initRunner.add(
      "data:load-details-sheet",
      async () => {
        await loadDetailsFromSheet({ cacheMinutes: 60 });
        if (location.hash.includes("#site=")) window.__route?.parseRoute?.();
      },
      { after: ["data:load-json"] }
    );

    initRunner.add(
      "data:ensure-site-ids",
      () => {
        if (!window.state) window.state = { sites: [] };
        if (
          !Array.isArray(window.state.sites) ||
          window.state.sites.length === 0
        ) {
          window.state.sites = Array.isArray(window.initialSites)
            ? window.initialSites
            : [];
        }
        window.ensureSiteIds?.();
      },
      { after: ["data:load-json"] }
    );

    initRunner.add(
      "legacy:init",
      () => {
        try {
          if (typeof init === "function") init();
        } catch (e) {
          console.warn("[init] legacy/init error:", e);
        }
      },
      { after: ["data:load-json"] }
    );

    initRunner.add(
      "ui:highlight",
      () => {
        try {
          const q = (
            window.state?.currentSearchQuery ||
            document.getElementById("searchInput")?.value ||
            ""
          ).trim();
          if (q && window.ddakHighlight) {
            const scope = document.getElementById("categoriesContainer") || document;
            window.ddakHighlight.apply(q, scope);
          }
        } catch (e) {
          console.debug("highlight skipped", e);
        }
      },
      { after: ["legacy:init"] }
    );

    initRunner.add(
      "ui:sync-stats",
      () => {
        if (typeof updateGlobalStats === "function") updateGlobalStats();
      },
      { after: ["legacy:init"] }
    );

    initRunner.run().then((rep) => {
      console.log("[init] report:", rep, initRunner.status());
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
