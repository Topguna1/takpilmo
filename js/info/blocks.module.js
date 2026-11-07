import { esc, safeUrl } from '../hub/model.module.js';
// Block-based article body. Every value is validated here and escaped on output.
// Editors can only choose from the block types below; no raw HTML is ever rendered.
export const BLOCK_TYPES = { text: '글', image: '이미지', youtube: '유튜브', steps: '따라하기 단계', callout: '팁·주의 박스', link: '링크 버튼' };
export const MAX_BLOCKS = 60;
const MAX_STEPS = 20;
const clip = (value, max) => String(value ?? '').trim().slice(0, max);
export function httpsUrl(value) {
  const url = safeUrl(String(value ?? '').trim());
  return url.startsWith('https://') ? url : '';
}
function seconds(raw) {
  if (!raw) return 0;
  if (/^\d+$/.test(raw)) return Math.min(Number(raw), 86400);
  const match = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/.exec(raw);
  if (!match) return 0;
  return Math.min((+match[1] || 0) * 3600 + (+match[2] || 0) * 60 + (+match[3] || 0), 86400);
}
// Accepts watch, youtu.be, shorts, live and embed links. Returns { id, start } or null.
export function parseYoutube(value) {
  let url;
  try { url = new URL(String(value ?? '').trim()); } catch { return null; }
  if (url.protocol !== 'https:') return null;
  const host = url.hostname.replace(/^(www|m)\./, '');
  let id = '';
  if (host === 'youtu.be') id = url.pathname.slice(1).split('/')[0];
  else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    const parts = url.pathname.split('/').filter(Boolean);
    if (url.pathname === '/watch') id = url.searchParams.get('v') || '';
    else if (['shorts', 'embed', 'live'].includes(parts[0])) id = parts[1] || '';
  }
  if (!/^[A-Za-z0-9_-]{11}$/.test(id)) return null;
  return { id, start: seconds(url.searchParams.get('t') || url.searchParams.get('start')) };
}
export function youtubeEmbedUrl(value) {
  const video = parseYoutube(value);
  if (!video) return '';
  return `https://www.youtube-nocookie.com/embed/${video.id}?rel=0${video.start ? `&start=${video.start}` : ''}`;
}
// Returns a clean block list. Invalid blocks are dropped, so callers validate separately to warn editors.
export function normalizeBlocks(blocks) {
  if (!Array.isArray(blocks)) return [];
  const out = [];
  for (const block of blocks.slice(0, MAX_BLOCKS)) {
    if (!block || typeof block !== 'object') continue;
    if (block.type === 'text' && clip(block.text, 20000)) out.push({ type: 'text', text: clip(block.text, 20000) });
    else if (block.type === 'image' && httpsUrl(block.url)) out.push({ type: 'image', url: httpsUrl(block.url), alt: clip(block.alt, 200), caption: clip(block.caption, 300) });
    else if (block.type === 'youtube' && parseYoutube(block.url)) out.push({ type: 'youtube', url: clip(block.url, 300), caption: clip(block.caption, 300) });
    else if (block.type === 'callout' && clip(block.text, 1000)) out.push({ type: 'callout', kind: block.kind === 'warn' ? 'warn' : 'tip', text: clip(block.text, 1000) });
    else if (block.type === 'link' && clip(block.label, 80) && httpsUrl(block.url)) out.push({ type: 'link', label: clip(block.label, 80), url: httpsUrl(block.url) });
    else if (block.type === 'steps' && Array.isArray(block.items)) {
      const items = block.items.slice(0, MAX_STEPS).map(item => ({ title: clip(item?.title, 120), text: clip(item?.text, 2000), imageUrl: httpsUrl(item?.imageUrl) })).filter(item => item.title || item.text);
      if (items.length) out.push({ type: 'steps', items });
    }
  }
  return out;
}
// Human-readable problems for the editor: what normalizeBlocks would silently drop.
export function blockProblems(blocks) {
  const problems = [];
  (blocks || []).forEach((block, index) => {
    const label = `${index + 1}번째 블록(${BLOCK_TYPES[block.type] || block.type})`;
    if (block.type === 'image' && !httpsUrl(block.url)) problems.push(`${label}: https:// 로 시작하는 이미지 주소가 필요해요.`);
    if (block.type === 'youtube' && !parseYoutube(block.url)) problems.push(`${label}: 올바른 유튜브 링크가 아니에요.`);
    if (block.type === 'link' && !(clip(block.label, 80) && httpsUrl(block.url))) problems.push(`${label}: 버튼 이름과 https 주소가 필요해요.`);
    if ((block.type === 'text' || block.type === 'callout') && !clip(block.text, 20000)) problems.push(`${label}: 내용이 비어 있어요.`);
    if (block.type === 'steps' && !(block.items || []).some(item => clip(item.title, 120) || clip(item.text, 2000))) problems.push(`${label}: 단계가 비어 있어요.`);
  });
  return problems;
}
const lines = text => esc(text).replace(/\n/g, '<br>');
function renderBlock(block, renderText) {
  if (block.type === 'text') return `<div class="blk blk-text">${renderText(block.text)}</div>`;
  if (block.type === 'image') return `<figure class="blk blk-image"><img src="${esc(block.url)}" alt="${esc(block.alt)}" loading="lazy" decoding="async" referrerpolicy="no-referrer">${block.caption ? `<figcaption>${esc(block.caption)}</figcaption>` : ''}</figure>`;
  if (block.type === 'youtube') {
    const embed = youtubeEmbedUrl(block.url);
    const watch = `https://www.youtube.com/watch?v=${parseYoutube(block.url).id}`;
    return `<figure class="blk blk-video"><div class="blk-video-frame"><iframe src="${esc(embed)}" title="${esc(block.caption || '유튜브 영상')}" loading="lazy" allow="accelerometer; encrypted-media; picture-in-picture" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe></div><figcaption>${block.caption ? `${esc(block.caption)} · ` : ''}<a href="${esc(watch)}" target="_blank" rel="noopener noreferrer">유튜브에서 보기 ↗</a></figcaption></figure>`;
  }
  if (block.type === 'callout') return `<aside class="blk blk-callout blk-${block.kind}"><strong>${block.kind === 'warn' ? '주의' : '꿀팁'}</strong><p>${lines(block.text)}</p></aside>`;
  if (block.type === 'link') return `<p class="blk blk-link"><a class="button" href="${esc(block.url)}" target="_blank" rel="noopener noreferrer">${esc(block.label)} ↗</a></p>`;
  if (block.type === 'steps') {
    return `<ol class="blk blk-steps">${block.items.map(item => `<li class="blk-step">${item.title ? `<h3>${esc(item.title)}</h3>` : ''}${item.text ? `<p>${lines(item.text)}</p>` : ''}${item.imageUrl ? `<img src="${esc(item.imageUrl)}" alt="${esc(item.title)}" loading="lazy" decoding="async" referrerpolicy="no-referrer">` : ''}</li>`).join('')}</ol>`;
  }
  return '';
}
export function renderBlocks(blocks, renderText) {
  return normalizeBlocks(blocks).map(block => renderBlock(block, renderText)).join('');
}
