function initScrollReveal(root = document) {
  if (document.body.classList.contains("anim-off")) return;

  const items = root.querySelectorAll(".reveal");
  if (!items.length) return;

  if (!("IntersectionObserver" in window)) {
    items.forEach((el) => el.classList.add("is-visible"));
    return;
  }

  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.isIntersecting) {
        e.target.classList.add("is-visible");
        io.unobserve(e.target);
      }
    }
  }, { threshold: 0.12, rootMargin: "0px 0px -10% 0px" });

  items.forEach((el) => io.observe(el));
}

export function installAboutReveal() {
  if (typeof window.initScrollReveal === "function") {
    return { initScrollReveal: window.initScrollReveal };
  }
  window.initScrollReveal = initScrollReveal;
  return { initScrollReveal };
}

