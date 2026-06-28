import { describe, expect, it, vi } from "vitest";
import { loadBrowserScript, resetBrowserEnv } from "./helpers/browser-env.js";

function createRouterDom() {
  return `
    <div class="ui-scale-wrap" aria-hidden="false">
      <input id="searchInput" />
      <div class="container"></div>
    </div>
    <section id="detailView" style="display:none;" aria-hidden="true">
      <button id="detailBackBtn" type="button">back</button>
      <div class="detail-title-wrap">
        <img id="detailFavicon" alt="" />
        <h2 id="detailTitle"></h2>
        <div id="detailMeta" class="detail-meta"></div>
        <p id="detailDesc"></p>
      </div>
      <a id="detailGoBtn" href="#"></a>
      <button id="detailCopyBtn" type="button">copy</button>
      <div id="detailRelated"></div>
    </section>
    <section id="aboutView" style="display:none;" aria-hidden="true"></section>
    <section id="tipsView" style="display:none;" aria-hidden="true"></section>
  `;
}

describe("router", () => {
  it("shows detail view and canonicalizes the hash", () => {
    const env = resetBrowserEnv(createRouterDom());
    window.GOV_ICON_DATA_URL = "https://example.com/gov.png";

    const state = {
      currentSearchQuery: "",
      sites: [
        {
          key: "alpha",
          id: "alpha-1",
          name: "Alpha",
          url: "https://alpha.test",
          desc: "Alpha description",
          category: "learning",
          ages: ["elem"],
          subjects: ["math"],
        },
      ],
    };

    window.App = {
      store: {
        getState: () => state,
      },
      render: {
        afterNextRender: () => Promise.resolve(),
      },
    };
    window.getCategoryName = (key) => key;
    window.getRelatedSites = () => [];
    window.showToast = vi.fn();

    loadBrowserScript("js/routing/hash-routing.js");

    window.location.hash = "#site=Alpha";
    const router = window.setupHashRouting();
    env.flushRaf();

    expect(window.location.hash).toBe("#site=alpha");
    expect(document.getElementById("detailView").getAttribute("aria-hidden")).toBe("false");
    expect(document.activeElement).toBe(document.getElementById("detailBackBtn"));
    expect(router).toBe(window.App.router);
  });

  it("restores list view scroll position after returning from detail", async () => {
    const env = resetBrowserEnv(createRouterDom());
    const state = {
      currentSearchQuery: "",
      sites: [
        {
          key: "alpha",
          id: "alpha-1",
          name: "Alpha",
          url: "https://alpha.test",
          desc: "Alpha description",
          category: "learning",
          ages: ["elem"],
          subjects: ["math"],
        },
      ],
    };

    window.App = {
      store: {
        getState: () => state,
      },
      render: {
        afterNextRender: () => Promise.resolve(),
      },
    };
    window.getCategoryName = (key) => key;
    window.getRelatedSites = () => [];
    window.showToast = vi.fn();

    loadBrowserScript("js/routing/hash-routing.js");
    const router = window.setupHashRouting();

    env.setScroll(420);
    window.location.hash = "#site=alpha";
    router.parseRoute();

    window.location.hash = "#/";
    router.parseRoute();
    await Promise.resolve();
    await Promise.resolve();

    expect(document.querySelector(".ui-scale-wrap").getAttribute("aria-hidden")).toBe("false");
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 420, behavior: "auto" });
  });
});
