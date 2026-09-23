import "./error-handling.js";

export function installErrorHandling() {
  window.ddakpilmo = window.ddakpilmo || {};
  return {
    errorManager: window.ddakpilmo.errorManager || null,
    faviconLoader: window.ddakpilmo.faviconLoader || null,
    fallbackShare: window.ddakpilmo.fallbackShare || null,
    fallbackCopyToClipboard: window.ddakpilmo.fallbackCopyToClipboard || null,
  };
}

