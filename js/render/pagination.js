// Pagination renderer extracted from main.js
(function () {
  function renderPagination(category, totalItems) {
    const container = document.getElementById(`${category}-pagination`);
    if (!container) return;

    if (!container._btnCache) {
      container._btnCache = {};
    }

    const cache = container._btnCache;
    const state = window.state || {};
    const perPage = state.ITEMS_PER_PAGE || 10;
    const totalPages = Math.ceil(totalItems / perPage);
    if (totalPages <= 1) {
      container.replaceChildren();
      if (container._btnCache) container._btnCache = {};
      return;
    }

    const currentPage = state.currentPageByCategory?.[category] || 1;
    const fragment = document.createDocumentFragment();

    function getBtn(key, label, onclick) {
      let btn = cache[key];
      if (!btn) {
        btn = document.createElement("button");
        cache[key] = btn;
      }

      btn.className = "page-btn";
      btn.removeAttribute("style");
      btn.disabled = false;
      btn.onclick = null;
      btn.textContent = label;
      btn.onclick = onclick;
      return btn;
    }

    function getJumpSelect(key, fromPage, toPage, onJump) {
      if (toPage < fromPage) return null;

      let wrap = cache[key];
      if (!wrap) {
        wrap = document.createElement("span");
        wrap.className = "page-select-wrapper";

        const select = document.createElement("select");
        select.className = "page-quick-jump";
        select.setAttribute("aria-label", "페이지 건너뛰기");

        wrap.appendChild(select);
        cache[key] = wrap;
      }

      const select = wrap.querySelector("select");
      select.replaceChildren();

      const defaultOpt = document.createElement("option");
      defaultOpt.textContent = "...";
      defaultOpt.selected = true;
      defaultOpt.disabled = true;
      select.appendChild(defaultOpt);

      for (let p = fromPage; p <= toPage; p++) {
        const opt = document.createElement("option");
        opt.value = String(p);
        opt.textContent = String(p);
        select.appendChild(opt);
      }

      select.onchange = (e) => {
        const v = parseInt(e.target.value, 10);
        if (!Number.isFinite(v)) return;
        onJump(v);
        select.selectedIndex = 0;

        if (typeof window.afterNextRender === "function") {
          window.afterNextRender(() => {
            const header = document.querySelector(`#${category}-section .category-header`);
            if (header) {
              header.setAttribute("tabindex", "-1");
              header.focus({ preventScroll: true });
            }
          });
        }
      };

      return wrap;
    }

    fragment.appendChild(
      getBtn("prev", "이전", () => {
        if (currentPage > 1) {
          window.setPage?.(category, currentPage - 1, 800);
        }
      })
    ).disabled = currentPage === 1;

    let start = Math.max(1, currentPage - 2);
    let end = Math.min(totalPages, currentPage + 2);

    if (start > 1) {
      fragment.appendChild(
        getBtn("page-1", "1", () => {
          window.setPage?.(category, 1, 800);
        })
      );
      if (start > 2) {
        const jump = getJumpSelect("jump-start", 2, start - 1, (num) => {
          window.setPage?.(category, num, 800);
        });
        if (jump) fragment.appendChild(jump);
      }
    }

    for (let i = start; i <= end; i++) {
      const key = `page-${i}`;
      const btn = getBtn(key, String(i), () => {
        window.setPage?.(category, i, 800);
      });
      btn.classList.toggle("active", i === currentPage);
      fragment.appendChild(btn);
    }

    if (end < totalPages) {
      if (end < totalPages - 1) {
        const jump = getJumpSelect("jump-end", end + 1, totalPages - 1, (num) => {
          window.setPage?.(category, num, 800);
        });
        if (jump) fragment.appendChild(jump);
      }
      fragment.appendChild(
        getBtn(`page-${totalPages}`, String(totalPages), () => {
          window.setPage?.(category, totalPages, 800);
        })
      );
    }

    const keep = new Set(["prev", "next", "ellipsis-start", "ellipsis-end", "page-1", `page-${totalPages}`]);
    for (let i = start; i <= end; i++) keep.add(`page-${i}`);

    for (const k in cache) {
      if (!keep.has(k)) delete cache[k];
    }

    fragment.appendChild(
      getBtn("next", "다음", () => {
        if (currentPage < totalPages) {
          window.setPage?.(category, currentPage + 1, 800);
        }
      })
    ).disabled = currentPage === totalPages;

    container.replaceChildren(fragment);
  }

  window.renderPagination = renderPagination;
})();
