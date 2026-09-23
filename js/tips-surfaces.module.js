import "./tips-surfaces.js";

export function installTipsSurfaces() {
  window.ddakpilmo = window.ddakpilmo || {};
  window.ddakpilmo.tips?.hydrateEntryPoints?.();
  return window.ddakpilmo.tips || null;
}
