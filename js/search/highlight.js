// Search highlight module
function escapeHtmlSafe(value) {
  if (typeof window.escapeHtml === "function") return window.escapeHtml(value);
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isChosungOnlyToken(token) {
  return /^[\u3131-\u314e]+$/.test(String(token || ""));
}

function getChosungText(value) {
  const fn =
    window.ddakpilmo?.utils?.getChosungSafe ||
    window.getChosungSafe ||
    window.getChosung;
  try {
    return typeof fn === "function" ? String(fn(value ?? "")) : String(value ?? "");
  } catch {
    return String(value ?? "");
  }
}

function mergeRanges(ranges) {
  if (!ranges.length) return [];
  const sorted = ranges
    .map((r) => [Math.max(0, r[0] | 0), Math.max(0, r[1] | 0)])
    .filter((r) => r[1] > r[0])
    .sort((a, b) => a[0] - b[0]);

  const merged = [sorted[0]];
  for (let i = 1; i < sorted.length; i += 1) {
    const prev = merged[merged.length - 1];
    const cur = sorted[i];
    if (cur[0] <= prev[1]) prev[1] = Math.max(prev[1], cur[1]);
    else merged.push(cur);
  }
  return merged;
}

function collectHighlightRanges(raw, tokens) {
  const ranges = [];
  const lowerRaw = raw.toLowerCase();
  const chosungRaw = getChosungText(raw).toLowerCase();

  for (const token of tokens) {
    const needle = String(token || "").toLowerCase();
    if (!needle) continue;

    if (isChosungOnlyToken(needle)) {
      let from = 0;
      while (from <= chosungRaw.length - needle.length) {
        const idx = chosungRaw.indexOf(needle, from);
        if (idx === -1) break;
        ranges.push([idx, idx + needle.length]);
        from = idx + Math.max(1, needle.length);
      }
      continue;
    }

    let from = 0;
    while (from <= lowerRaw.length - needle.length) {
      const idx = lowerRaw.indexOf(needle, from);
      if (idx === -1) break;
      ranges.push([idx, idx + needle.length]);
      from = idx + Math.max(1, needle.length);
    }
  }

  return mergeRanges(ranges);
}

function renderHighlightedHtml(raw, ranges) {
  if (!ranges.length) return escapeHtmlSafe(raw);
  let out = "";
  let last = 0;

  for (const [start, end] of ranges) {
    if (start > last) out += escapeHtmlSafe(raw.slice(last, start));
    out += `<span class="search-highlight">${escapeHtmlSafe(raw.slice(start, end))}</span>`;
    last = end;
  }

  if (last < raw.length) out += escapeHtmlSafe(raw.slice(last));
  return out;
}

function highlightSearchTerms(text, query) {
  const raw = String(text ?? "");
  const q = String(query ?? "").trim();
  if (!q) return escapeHtmlSafe(raw);

  const tokens = Array.from(
    new Set(
      q
        .split(/\s+/)
        .map((t) => t.trim())
        .filter(Boolean)
    )
  ).sort((a, b) => b.length - a.length);

  if (!tokens.length) return escapeHtmlSafe(raw);

  const ranges = collectHighlightRanges(raw, tokens);
  return renderHighlightedHtml(raw, ranges);
}

function makeSearchSnippet(text, query, radius = 36) {
  const raw = String(text ?? "");
  const q = String(query ?? "").trim();
  if (!raw) return "";
  if (!q) return escapeHtmlSafe(raw);

  const tokens = q.split(/\s+/).filter(Boolean);
  const lower = raw.toLowerCase();
  const chosung = getChosungText(raw).toLowerCase();

  let hit = -1;
  let tokenLen = 0;
  for (const token of tokens) {
    const needle = token.toLowerCase();
    const idx = isChosungOnlyToken(needle)
      ? chosung.indexOf(needle)
      : lower.indexOf(needle);
    if (idx !== -1) {
      hit = idx;
      tokenLen = token.length;
      break;
    }
  }

  if (hit === -1) {
    const cut = raw.length > radius * 2 ? `${raw.slice(0, radius * 2)}...` : raw;
    return highlightSearchTerms(cut, q);
  }

  const start = Math.max(0, hit - radius);
  const end = Math.min(raw.length, hit + Math.max(tokenLen, radius));
  const prefix = start > 0 ? "..." : "";
  const suffix = end < raw.length ? "..." : "";

  return highlightSearchTerms(`${prefix}${raw.slice(start, end)}${suffix}`, q);
}

window.highlightSearchTerms = highlightSearchTerms;
window.makeSearchSnippet = makeSearchSnippet;
window.ddakpilmo = window.ddakpilmo || {};
window.ddakpilmo.search = window.ddakpilmo.search || {};
window.ddakpilmo.search.highlightSearchTerms =
  window.ddakpilmo.search.highlightSearchTerms || window.highlightSearchTerms;
window.ddakpilmo.search.makeSearchSnippet =
  window.ddakpilmo.search.makeSearchSnippet || window.makeSearchSnippet;

(function () {
  const HL_TAG = "span";
  const HL_CLASS = "search-highlight";

  function clearHighlights(root) {
    const marks = root.querySelectorAll(`${HL_TAG}.${HL_CLASS}`);
    marks.forEach((mark) => {
      const parent = mark.parentNode;
      while (mark.firstChild) parent.insertBefore(mark.firstChild, mark);
      parent.removeChild(mark);
      parent.normalize();
    });
  }

  function highlightInNode(root, query) {
    const q = String(query ?? "").trim();
    if (!q) {
      clearHighlights(root);
      return;
    }

    clearHighlights(root);

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;

        let parent = node.parentNode;
        while (parent && parent !== root) {
          if (parent.classList && parent.classList.contains("share-btn")) {
            return NodeFilter.FILTER_REJECT;
          }
          if (
            parent.nodeName === "SCRIPT" ||
            parent.nodeName === "STYLE" ||
            parent.nodeName === "NOSCRIPT"
          ) {
            return NodeFilter.FILTER_REJECT;
          }
          parent = parent.parentNode;
        }

        return NodeFilter.FILTER_ACCEPT;
      },
    });

    const targets = [];
    while (walker.nextNode()) targets.push(walker.currentNode);
    targets.forEach((node) => {
      const text = String(node.nodeValue || "");
      if (!text.trim()) return;

      const html = highlightSearchTerms(text, q);
      if (!html.includes(`class="${HL_CLASS}"`)) return;

      const wrap = document.createElement("span");
      wrap.innerHTML = html;
      const frag = document.createDocumentFragment();
      while (wrap.firstChild) frag.appendChild(wrap.firstChild);
      node.parentNode?.replaceChild(frag, node);
    });
  }

  window.ddakHighlight = {
    apply(query, scope = document) {
      highlightInNode(scope, query || "");
    },
    clear(scope = document) {
      clearHighlights(scope);
    },
  };
})();
