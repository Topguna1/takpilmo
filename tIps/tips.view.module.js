import "./tips.view.js";

export function installTipsView() {
  return {
    renderTipsView: window.renderTipsView || null,
  };
}

