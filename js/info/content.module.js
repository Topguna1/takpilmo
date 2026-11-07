import { esc, safeUrl } from '../hub/model.module.js';
import { renderBlocks, normalizeBlocks, httpsUrl } from './blocks.module.js';
// Deliberately small Markdown subset: headings, paragraphs and list items.
// Escape first: author HTML and scripts are always plain text.
export function markdown(text = '') {
  return text.split(/\n\s*\n/).map(block => {
    const lines = block.trim().split('\n');
    if (!block.trim()) return '';
    if (lines.every(line => /^- /.test(line))) return `<ul>${lines.map(line => `<li>${esc(line.slice(2))}</li>`).join('')}</ul>`;
    const heading = /^(#{1,3}) (.+)$/.exec(block.trim());
    if (heading) return `<h${Math.max(2, heading[1].length)}>${esc(heading[2])}</h${Math.max(2, heading[1].length)}>`;
    return `<p>${lines.map(esc).join('<br>')}</p>`;
  }).join('');
}
export function cards(items) {
  return `<div class="info-grid">${items.map(item => `<a class="info-card" href="#/info/${encodeURIComponent(item.id)}">${httpsUrl(item.thumbnail) ? `<img class="info-thumb" src="${esc(httpsUrl(item.thumbnail))}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer">` : ''}<span class="tag">${esc(item.category)}</span><h2>${esc(item.title)}</h2><p>${esc(item.summary)}</p><span>읽어보기 →</span></a>`).join('')}</div>`;
}
export function articleView(item, sites = []) {
  const related = (item.siteKeys || []).map(key => sites.find(site => (site.key || site.id) === key)).filter(Boolean);
  const date = item.updatedAt?.toDate?.().toLocaleDateString('ko-KR') || '';
  const hasBlocks = normalizeBlocks(item.blocks).length > 0;
  const sources = (item.sources || []).filter(source => safeUrl(source.url));
  const facts = [item.difficulty && `난이도 ${item.difficulty}`, Number(item.minutes) > 0 && `${Number(item.minutes)}분`].filter(Boolean);
  const tags = (Array.isArray(item.tags) ? item.tags : []).slice(0, 8).map(tag => `<span class="tag">#${esc(tag)}</span>`).join(' ');
  const hero = httpsUrl(item.thumbnail) ? `<img class="info-hero" src="${esc(httpsUrl(item.thumbnail))}" alt="" decoding="async" referrerpolicy="no-referrer">` : '';
  const relatedHtml = `<section><h2>관련 사이트</h2>${related.length ? related.map(site => `<p><a href="#site=${encodeURIComponent(site.key || site.id)}">${esc(site.name)} →</a></p>`).join('') : '<p>연결된 사이트 정보를 표시할 수 없어요.</p><a href="#/sites">사이트 모음 보기 →</a>'}</section>`;
  const sourcesHtml = sources.length ? `<section><h2>참고 출처</h2>${sources.map(source => `<p><a href="${esc(safeUrl(source.url))}" target="_blank" rel="noopener noreferrer">${esc(source.label)} ↗</a> <small>확인: ${esc(source.checkedAt)}</small></p>`).join('')}</section>` : '';
  const note = date ? `수정일: ${esc(date)}` : item.id?.startsWith('task-') ? '기본 작업 안내' : '미리보기';
  return `<article class="info-article"><a href="#/info">← 딱필 정보 목록</a><p class="eyebrow">${esc(item.category)}${facts.length ? ` · ${facts.map(esc).join(' · ')}` : ''}</p><h1>${esc(item.title)}</h1><p class="lead">${esc(item.summary)}</p>${tags ? `<p class="info-tags">${tags}</p>` : ''}${hero}<div class="info-body">${hasBlocks ? renderBlocks(item.blocks, markdown) : markdown(item.body)}</div>${relatedHtml}${sourcesHtml}<p class="muted">${note}</p></article>`;
}
