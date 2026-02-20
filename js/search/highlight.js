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

  const pattern = tokens.map(escapeRegExp).join("|");
  const regex = new RegExp(`(${pattern})`, "gi");

  let out = "";
  let last = 0;
  let match;

  while ((match = regex.exec(raw)) !== null) {
    const start = match.index;
    const end = start + match[0].length;

    if (start > last) out += escapeHtmlSafe(raw.slice(last, start));
    out += `<span class="search-highlight">${escapeHtmlSafe(raw.slice(start, end))}</span>`;
    last = end;

    if (regex.lastIndex === start) regex.lastIndex += 1;
  }

  if (last < raw.length) out += escapeHtmlSafe(raw.slice(last));
  return out;
}

function makeSearchSnippet(text, query, radius = 36) {
  const raw = String(text ?? "");
  const q = String(query ?? "").trim();
  if (!raw) return "";
  if (!q) return escapeHtmlSafe(raw);

  const tokens = q.split(/\s+/).filter(Boolean);
  const lower = raw.toLowerCase();

  let hit = -1;
  let tokenLen = 0;
  for (const token of tokens) {
    const idx = lower.indexOf(token.toLowerCase());
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

(function () {
  const HL_TAG = "span";
  const HL_CLASS = "search-highlight";

  function buildPattern(query) {
    const q = String(query ?? "").trim();
    if (!q) return null;

    const tokens = q
      .split(/\s+/)
      .map((t) => t.trim())
      .filter(Boolean)
      .map(escapeRegExp);

    if (!tokens.length) return null;
    return new RegExp(`(${tokens.join("|")})`, "gi");
  }

  function clearHighlights(root) {
    const marks = root.querySelectorAll(`${HL_TAG}.${HL_CLASS}`);
    marks.forEach((mark) => {
      const parent = mark.parentNode;
      while (mark.firstChild) parent.insertBefore(mark.firstChild, mark);
      parent.removeChild(mark);
      parent.normalize();
    });
  }

  function highlightInTextNode(node, regex) {
    const text = node.nodeValue;
    regex.lastIndex = 0;
    const first = regex.exec(text);
    if (!first) return;

    const frag = document.createDocumentFragment();
    let last = 0;
    regex.lastIndex = 0;

    let match;
    while ((match = regex.exec(text)) !== null) {
      const start = match.index;
      const end = start + match[0].length;

      if (start > last) frag.appendChild(document.createTextNode(text.slice(last, start)));

      const mark = document.createElement(HL_TAG);
      mark.className = HL_CLASS;
      mark.textContent = text.slice(start, end);
      frag.appendChild(mark);

      last = end;
      if (regex.lastIndex === start) regex.lastIndex += 1;
    }

    if (last < text.length) frag.appendChild(document.createTextNode(text.slice(last)));
    node.parentNode.replaceChild(frag, node);
  }

  function highlightInNode(root, query) {
    const regex = buildPattern(query);
    if (!regex) {
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
          parent = parent.parentNode;
        }

        return NodeFilter.FILTER_ACCEPT;
      },
    });

    const targets = [];
    while (walker.nextNode()) targets.push(walker.currentNode);
    targets.forEach((node) => highlightInTextNode(node, regex));
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