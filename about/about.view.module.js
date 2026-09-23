import "./about.view.js";

export function installAboutView() {
  return {
    renderAboutView: window.renderAboutView || null,
    fillAboutStats: window.fillAboutStats || null,
  };
}

