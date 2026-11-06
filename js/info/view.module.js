import { TASK_GUIDES } from './task-guides.module.js';
import * as api from './data.module.js';
import { cards, articleView } from './content.module.js';
import { esc } from '../hub/model.module.js';
let activeHash = '';
const message = text => `<div class="empty"><p role="status">${esc(text)}</p><button data-info-retry>다시 시도</button><a class="button" href="#/info">딱필 정보</a></div>`;
export function infoShell() { return '<section id="infoSurface" aria-busy="true"><p role="status">정보 글을 불러오고 있어요.</p></section>'; }
export function infoShelf() { return '<section class="info-shelf"><div class="section-intro"><h2>읽고 나면 하나 더 알게 돼요</h2><a href="#/info">딱필 정보 모두 보기 →</a></div><div data-info-shelf><p>학습 정보와 사이트 활용 이야기를 만나보세요.</p></div></section>'; }
export async function hydrateInfo(sites = []) {
  const root = document.getElementById('infoSurface');
  const shelf = document.querySelector('[data-info-shelf]');
  const related = document.querySelector('[data-info-related]');
  const hash = location.hash;
  if (!root && !shelf && !related) return;
  if (root && hash === activeHash && root.dataset.mounted) return;
  activeHash = hash;
  if (root) root.dataset.mounted = 'true';
  const live = () => location.hash === hash && (!root || root.isConnected);
  try {
    if (root && hash.startsWith('#/info/')) {
      let id; try { id = decodeURIComponent(hash.split('?')[0].slice('#/info/'.length)); } catch { id = ''; }
      const item = TASK_GUIDES.find(item => item.id === id) || (id && !id.includes('/') ? await api.article(id) : null);
      if (live()) {
        root.innerHTML = item ? articleView(item, sites) : '<div class="empty"><h1>글을 찾을 수 없어요</h1><a href="#/info">딱필 정보 목록 →</a></div>';
        if (item) document.title = `${item.title} — 딱필 정보`;
      }
    } else {
      const remote = shelf ? await api.latestArticles() : await api.articles();
      const items = shelf ? remote : [...TASK_GUIDES, ...remote.filter(item => !TASK_GUIDES.some(guide => guide.id === item.id))];
      if (!live()) return;
      if (shelf?.isConnected) shelf.innerHTML = items.length ? cards(items.slice(0, 3)) : '<p>아직 공개된 글이 없어요.</p>';
      if (related?.isConnected) {
        const matches = items.filter(item => item.siteKeys?.includes(related.dataset.infoRelated)).slice(0, 3);
        related.innerHTML = matches.length ? cards(matches) : '<a href="#/info">딱필 정보 읽어보기 →</a>';
      }
      if (root) {
        const params = new URLSearchParams(hash.split('?')[1] || '');
        const category = ['학습 정보','사이트 활용'].includes(params.get('category')) ? params.get('category') : '';
        const query = params.get('q') || '';
        const filtered = items.filter(item => (!category || item.category === category) && `${item.title} ${item.summary}`.toLowerCase().includes(query.toLowerCase()));
        root.innerHTML = `<h1>딱필 정보</h1><p class="lead">짧게 읽고, 공부와 일상에 써먹는 정보.</p>${params.has('moved') ? '<p role="status">기존 가이드를 딱필 정보로 새롭게 바꿨어요.</p>' : ''}<form id="infoSearch"><label>정보 글 검색<input name="q" value="${esc(query)}" placeholder="제목이나 궁금한 내용을 검색하세요"></label><input type="hidden" name="category" value="${esc(category)}"><button type="submit">검색</button></form><nav class="group-tabs" aria-label="정보 분류">${['','학습 정보','사이트 활용'].map(value => `<a class="button" href="#/info?${esc(new URLSearchParams({category:value,q:query}).toString())}" ${value === category ? 'aria-current="page"' : ''}>${value || '전체'}</a>`).join('')}</nav><p role="status">${filtered.length}개의 글</p>${filtered.length ? cards(filtered) : '<p>표시할 글이 없어요. 다른 검색어나 분류를 선택해 보세요.</p>'}`;
      }
    }
  } catch (error) {
    const text = error.message?.startsWith('Firebase 연결') ? error.message : '글을 불러오지 못했어요. 연결을 확인하고 다시 시도해 주세요.';
    if (live()) {
      if (root) root.innerHTML = message(text) + cards(TASK_GUIDES);
      if (shelf?.isConnected) shelf.innerHTML = message(text);
      if (related?.isConnected) related.innerHTML = message(text);
    }
  } finally { if (root?.isConnected) root.setAttribute('aria-busy', 'false'); }
}
export function installInfo(getSites, rerender) {
  document.addEventListener('submit', event => {
    if (event.target.id !== 'infoSearch') return;
    event.preventDefault();
    location.hash = '#/info?' + new URLSearchParams(new FormData(event.target));
  });
  document.addEventListener('click', event => {
    if (event.target.closest('[data-info-retry]')) rerender();
  });
  return () => hydrateInfo(getSites());
}
