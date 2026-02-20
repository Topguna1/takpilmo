// Search highlight module
(function(){
  const HL_TAG = 'span';
  const HL_CLASS = 'search-highlight';

  function escapeRegExp(s){ return s.replace(/[.*+?^${}()|[\]\\]/g, '\\'); }

  function buildPattern(query){
    const q = (query || '').trim();
    if (!q) return null;

    const letters = q.split(/\s+/);
    const allSingle = letters.length > 1 && letters.every(x => x.length === 1);
    if (allSingle) {
      return new RegExp(letters.map(ch => escapeRegExp(ch)).join('\\s*'), 'gi');
    }

    const tokens = q.split(/\s+/).map(escapeRegExp).filter(Boolean);
    if (!tokens.length) return null;
    return new RegExp('(' + tokens.join('|') + ')', 'gi');
  }

  function clearHighlights(root){
    const marks = root.querySelectorAll(`${HL_TAG}.${HL_CLASS}`);
    marks.forEach(mark => {
      const parent = mark.parentNode;
      while (mark.firstChild) parent.insertBefore(mark.firstChild, mark);
      parent.removeChild(mark);
      parent.normalize();
    });
  }

  function highlightInTextNode(node, regex){
    const text = node.nodeValue;
    regex.lastIndex = 0;
    const match = regex.exec(text);
    if (!match) return;

    const frag = document.createDocumentFragment();
    let lastIndex = 0;
    regex.lastIndex = 0;

    let m;
    while ((m = regex.exec(text)) !== null) {
      const start = m.index;
      const end = start + m[0].length;
      if (start > lastIndex) frag.appendChild(document.createTextNode(text.slice(lastIndex, start)));

      const mark = document.createElement(HL_TAG);
      mark.className = HL_CLASS;
      mark.textContent = text.slice(start, end);
      frag.appendChild(mark);

      lastIndex = end;
      if (regex.lastIndex === start) regex.lastIndex++;
    }
    if (lastIndex < text.length) frag.appendChild(document.createTextNode(text.slice(lastIndex)));

    node.parentNode.replaceChild(frag, node);
  }

  function highlightInNode(root, query){
    const regex = buildPattern(query);
    if (!regex) { clearHighlights(root); return; }

    clearHighlights(root);

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(n){
        if (!n.nodeValue || !n.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        let parent = n.parentNode;
        while (parent && parent !== root) {
          if (parent.classList && parent.classList.contains('share-btn')) {
            return NodeFilter.FILTER_REJECT;
          }
          parent = parent.parentNode;
        }
        
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    const targets = [];
    while (walker.nextNode()) targets.push(walker.currentNode);
    targets.forEach(tn => highlightInTextNode(tn, regex));
  }

  window.ddakHighlight = {
    apply(query, scope=document) { highlightInNode(scope, query || ''); },
    clear(scope=document) { clearHighlights(scope); }
  };
})();
