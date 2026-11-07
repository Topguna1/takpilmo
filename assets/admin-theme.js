/* global localStorage, document, window, matchMedia */
// Runs before styles/body to prevent a light flash when opening a dark editor.
(() => {
  const media = matchMedia('(prefers-color-scheme: dark)');
  let preference = 'system';
  const read = () => {
    try { const value = localStorage.getItem('adminTheme') || localStorage.getItem('siteTheme'); return ['light','dark','system'].includes(value) ? value : 'system'; }
    catch { return preference; }
  };
  const apply = () => {
    const dark = preference === 'dark' || preference === 'system' && media.matches;
    document.documentElement.dataset.adminTheme = dark ? 'dark' : 'light';
    document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
    document.body?.classList.toggle('dark',dark);
    const control = document.getElementById('adminTheme');
    if (control) control.value = preference;
  };
  preference = read(); apply();
  document.addEventListener('DOMContentLoaded', () => {
    apply();
    document.getElementById('adminTheme').addEventListener('change', event => {
      preference = event.target.value;
      try { localStorage.setItem('adminTheme',preference); } catch { /* Session preference still works. */ }
      apply();
    });
  });
  media.addEventListener('change',apply);
  window.addEventListener('storage',() => { preference = read(); apply(); });
})();
