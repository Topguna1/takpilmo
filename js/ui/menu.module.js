function setupTopMenu() {
  if (setupTopMenu.__initialized) return;
  const menu = document.querySelector(".top-menu");
  if (!menu) return;

  const closeMenu = () => {
    menu.open = false;
  };

  document.addEventListener("click", (event) => {
    if (!menu.open) return;
    if (!menu.contains(event.target)) {
      closeMenu();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeMenu();
  });

  menu.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", closeMenu);
  });

  setupTopMenu.__initialized = true;
}

export function installMenu() {
  if (window.__menuModuleInstalled) {
    return { setupTopMenu };
  }
  window.__menuModuleInstalled = true;
  setupTopMenu();
  return { setupTopMenu };
}

