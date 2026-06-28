import { describe, expect, it } from "vitest";
import { loadBrowserScript, resetBrowserEnv } from "./helpers/browser-env.js";

describe("store", () => {
  it("defaults to 5 items per page", () => {
    resetBrowserEnv();
    loadBrowserScript("js/app/store.js");

    expect(window.App.store.getState().ITEMS_PER_PAGE).toBe(5);
  });

  it("updates state immutably and mirrors window.state", () => {
    resetBrowserEnv();
    loadBrowserScript("js/app/store.js");

    const store = window.App.store;
    const previous = store.getState();
    const next = store.setState({ currentSearchQuery: "EBS" }, { render: false });

    expect(next).not.toBe(previous);
    expect(store.getState().currentSearchQuery).toBe("EBS");
    expect(window.state.currentSearchQuery).toBe("EBS");
  });

  it("resets pagination when filters change", () => {
    const env = resetBrowserEnv();
    loadBrowserScript("js/app/store.js");

    const store = window.App.store;
    store.setState(
      {
        currentPageByCategory: { learning: 3 },
      },
      { render: false }
    );

    store.setFilters({ currentCategoryFilter: "learning" });
    env.flushRaf();

    expect(store.getState().currentPageByCategory).toEqual({});
    expect(store.getState().currentCategoryFilter).toBe("learning");
  });

  it("coalesces subscriber notifications into one frame", () => {
    const env = resetBrowserEnv();
    loadBrowserScript("js/app/store.js");

    const store = window.App.store;
    const calls = [];
    store.subscribe((state) => {
      calls.push(state.currentSearchQuery);
    });

    store.setState({ currentSearchQuery: "alpha" });
    store.setState({ currentSearchQuery: "beta" });

    expect(calls).toEqual([]);
    env.flushRaf();
    expect(calls).toEqual(["beta"]);
  });
});
