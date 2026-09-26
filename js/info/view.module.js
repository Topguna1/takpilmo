import * as api from './data.module.js';
import { cards, articleView } from './content.module.js';
import { esc } from '../hub/model.module.js';
let dirty = false;
let pendingSave = false;
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
    if (hash.startsWith('#/admin/info') && root) { await admin(root, sites, live); return; }
    if (root && hash.startsWith('#/info/')) {
      let id; try { id = decodeURIComponent(hash.split('?')[0].slice('#/info/'.length)); } catch { id = ''; }
      const item = id && !id.includes('/') ? await api.article(id) : null;
      if (live()) {
        root.innerHTML = item ? articleView(item, sites) : '<div class="empty"><h1>글을 찾을 수 없어요</h1><a href="#/info">딱필 정보 목록 →</a></div>';
        if (item) document.title = `${item.title} — 딱필 정보`;
      }
    } else {
      const items = await api.articles(false, root ? {} : {take:3,siteKey:related?.dataset.infoRelated});
      if (!live()) return;
      if (shelf?.isConnected) shelf.innerHTML = items.length ? cards(items.slice(0, 3)) : '<p>아직 공개된 글이 없어요.</p>';
      if (related?.isConnected) {
        const matches = items.filter(item => item.siteKeys?.includes(related.dataset.infoRelated)).slice(0, 3);
        related.innerHTML = matches.length ? cards(matches) : '<a href="#/info">딱필 정보 읽어보기 →</a>';
      }
      if (root) {
        const params = new URLSearchParams(hash.split('?')[1] || '');
        const category = ['학습 정보','사이트 활용'].includes(params.get('category')) ? params.get('category') : '';
        const query = (params.get('q') || '').slice(0,200);
        const filtered = items.filter(item => (!category || item.category === category) && `${item.title} ${item.summary}`.toLowerCase().includes(query.toLowerCase()));
        const pages = Math.max(1,Math.ceil(filtered.length/12));
        const page = Math.min(pages,Math.max(1,parseInt(params.get('page'),10)||1));
        const pageUrl = number => '#/info?' + new URLSearchParams({category,q:query,page:number});
        const pagination = pages>1 ? '<nav class="info-pagination" aria-label="정보 글 페이지">' + (page>1?'<a class="button" href="'+esc(pageUrl(page-1))+'">이전</a>':'') + '<span>'+page+' / '+pages+'</span>' + (page<pages?'<a class="button" href="'+esc(pageUrl(page+1))+'">다음</a>':'') + '</nav>' : '';
        root.innerHTML = `<h1>딱필 정보</h1><p class="lead">짧게 읽고, 공부와 일상에 써먹는 정보.</p>${params.has('moved') ? '<p role="status">기존 가이드를 딱필 정보로 새롭게 바꿨어요.</p>' : ''}<form id="infoSearch"><label>정보 글 검색<input name="q" value="${esc(query)}" placeholder="제목이나 궁금한 내용을 검색하세요"></label><input type="hidden" name="category" value="${esc(category)}"><button type="submit">검색</button></form><nav class="group-tabs" aria-label="정보 분류">${['','학습 정보','사이트 활용'].map(value => `<a class="button" href="#/info?${esc(new URLSearchParams({category:value,q:query}).toString())}" ${value === category ? 'aria-current="page"' : ''}>${value || '전체'}</a>`).join('')}</nav><p role="status">${filtered.length}개의 글</p>${filtered.length ? cards(filtered.slice((page-1)*12,page*12)) : '<p>표시할 글이 없어요. 다른 검색어나 분류를 선택해 보세요.</p>'}${pagination}${items.invalidCount ? '<p role="status">형식을 확인할 수 없는 일부 글을 제외했어요.</p>' : ''}`;
      }
    }
  } catch (error) {
    const text = error.message?.startsWith('Firebase 연결') ? error.message : '글을 불러오지 못했어요. 연결을 확인하고 다시 시도해 주세요.';
    if (live()) {
      if (root) root.innerHTML = message(text);
      if (shelf?.isConnected) shelf.innerHTML = message(text);
      if (related?.isConnected) related.innerHTML = message(text);
    }
  } finally { if (root?.isConnected) root.setAttribute('aria-busy', 'false'); }
}
async function admin(root, sites, live) {
  const f = await api.connect();
  const allowed = await api.administrator();
  if (!live()) return;
  if (!allowed) {
    root.innerHTML = `<h1>딱필 정보 관리</h1>${f.auth.currentUser ? `<p>관리자 권한이 필요합니다. Firebase 콘솔에 아래 UID를 등록하세요.</p><code class="info-uid">${esc(f.auth.currentUser.uid)}</code><button data-info-logout>로그아웃</button><button data-info-retry>권한 다시 확인</button>` : '<p>관리자 Google 계정으로 로그인하세요.</p><button data-info-login>Google 로그인</button>'}<p id="infoAdminNotice" role="status"></p>`;
    return;
  }
  const items = await api.articles(true);
  if(!live())return;
  const signedUid=f.auth.currentUser?.uid;
  const unsubscribe=f.onAuthStateChanged?.(f.auth,user=>{
    if(!root.isConnected){unsubscribe?.();return;}
    if(user?.uid===signedUid)return;
    root.dataset.sessionLost='true';
    root.querySelectorAll('#infoEditForm button[type=submit]').forEach(button=>button.disabled=true);
    const notice=root.querySelector('#infoSaveNotice')||root.querySelector('#infoAdminNotice');
    if(notice)notice.textContent='로그인 계정이 변경됐어요. 작성 중인 내용을 복사해 보관한 뒤 다시 로그인하세요.';
  });
  const observer=new MutationObserver(()=>{if(!root.isConnected){unsubscribe?.();observer.disconnect();}});
  observer.observe(root.parentNode,{childList:true});
  if (!live()) return;
  root.innerHTML = `<h1>딱필 정보 관리</h1><div class="info-toolbar"><button data-info-new>새 글 작성</button><button data-info-seed>초기 글 8편 등록</button><button data-info-retry>목록 새로 불러오기</button><button data-info-logout>로그아웃</button></div><p id="infoAdminNotice" role="status"></p><div class="info-admin-list">${items.map(item => `<button data-info-edit="${esc(item.id)}">${esc(item.title)} · ${item.status === 'published' ? '공개' : '초안'}</button>`).join('')}</div><div id="infoEditor"></div>`;
  root.querySelector('[data-info-new]').onclick = () => openEditor({title:'',summary:'',body:'',category:'학습 정보',siteKeys:[],sources:[],status:'draft'});
  root.querySelectorAll('[data-info-edit]').forEach(button => button.onclick = () => openEditor(items.find(item => item.id === button.dataset.infoEdit)));
  function openEditor(item) {
    if (pendingSave || dirty && !window.confirm('저장하지 않은 변경을 버릴까요?')) return;
    sites = window.getAllSites?.() || sites;
    dirty = false;
    const host = document.getElementById('infoEditor');
    const selected = new Set(item.siteKeys);
    const choices=[...sites,...item.siteKeys.filter(key=>!sites.some(site=>(site.key||site.id)===key)).map(key=>({key,name:key+' (현재 목록에 없음)'}))];
    const siteChoices=choices.map(site=>'<label class="info-site-option" data-site-option="'+esc(site.name.toLowerCase())+'"><input type="checkbox" name="siteKeys" value="'+esc(site.key||site.id)+'" '+(selected.has(site.key||site.id)?'checked':'')+'><span>'+esc(site.name)+'</span></label>').join('');
    let expectedRevision=api.revisionOf(item.updatedAt);
    let requireReload=false;
    host.innerHTML = `<form id="infoEditForm"><h2>${item.id ? '글 수정' : '새 글'}</h2><label>제목<input required maxlength="160" name="title" value="${esc(item.title)}"></label><label>한 줄 요약<input required maxlength="300" name="summary" value="${esc(item.summary)}"></label><label>분류<select name="category">${['학습 정보','사이트 활용'].map(value => `<option ${value === item.category ? 'selected' : ''}>${value}</option>`).join('')}</select></label><label>본문 (Markdown)<textarea required maxlength="50000" name="body" rows="18">${esc(item.body)}</textarea></label><p class="muted">## 제목, 빈 줄로 문단 나누기, - 목록을 지원합니다. HTML은 실행되지 않습니다.</p><fieldset class="info-site-picker"><legend>관련 사이트 (최대 3개)</legend><label>사이트 찾기<input type="search" id="infoSiteSearch" autocomplete="off"></label><p id="infoSiteCount" role="status"></p><div class="info-site-options">${siteChoices}</div></fieldset><label>출처 (줄마다 이름 | URL | 확인일 YYYY-MM-DD)<textarea name="sources" rows="4" placeholder="공식 문서 | https://example.com | 2026-09-22">${esc(item.sources.map(source => `${source.label} | ${source.url} | ${source.checkedAt}`).join('\n'))}</textarea></label><p>공개 글은 저장 즉시 반영됩니다. 초안 저장을 누르면 공개가 해제됩니다.</p><div class="info-toolbar"><button type="button" id="infoPreviewButton">미리보기</button><button type="submit" value="draft">초안 저장 / 비공개</button><button type="submit" value="published">공개 저장</button></div><p id="infoSaveNotice" role="status"></p></form><div id="infoPreview"></div>`;
    const form = host.querySelector('form');
    const refreshChoices=()=>{
      const chosen=form.querySelectorAll('[name=siteKeys]:checked');
      form.querySelector('#infoSiteCount').textContent=chosen.length+' / 3개 선택';
      form.querySelectorAll('[name=siteKeys]').forEach(box=>box.disabled=!box.checked&&chosen.length>=3);
    };
    refreshChoices();
    form.querySelector('#infoSiteSearch').oninput=event=>{
      const query=event.target.value.trim().toLowerCase();
      form.querySelectorAll('[data-site-option]').forEach(label=>label.hidden=!label.dataset.siteOption.includes(query)&&!label.querySelector('input').checked);
    };
    form.oninput = event => { if(event.target.id!=='infoSiteSearch')dirty = true; };
    form.onchange=refreshChoices;
    const data = status => {
      const values = new FormData(form);
      return {title:values.get('title').trim(), summary:values.get('summary').trim(), body:values.get('body').trim(),category:values.get('category'),siteKeys:values.getAll('siteKeys'),sources:values.get('sources').split('\n').filter(line => line.trim()).map(line => { const [label='',url='',checkedAt=''] = line.split('|').map(value => value.trim()); return {label,url,checkedAt}; }),status};
    };
    host.querySelector('#infoPreviewButton').onclick = () => { host.querySelector('#infoPreview').innerHTML = articleView(data('draft'), sites); };
    form.onsubmit = async event => {
      event.preventDefault();
      if (pendingSave || requireReload || root.dataset.sessionLost) return;
      pendingSave = true;
      const notice = form.querySelector('#infoSaveNotice');
      const slow=setTimeout(()=>{notice.textContent='저장 결과를 확인 중이에요. 중복 저장하지 말고 잠시 기다려 주세요. 입력은 유지됩니다.';},15000);
      try {
        const value = data(event.submitter?.value || 'draft');
        api.validateArticle(value);
        form.querySelectorAll('input,textarea,select,button').forEach(control => control.disabled = true);
        item.id ||= await api.newArticleId();
        const saved = await api.saveArticle(item.id, value, false, expectedRevision);
        const id=saved.id;
        expectedRevision=api.revisionOf(saved.updatedAt);
        requireReload=!!saved.needsReload;
        item.updatedAt=saved.updatedAt;
        Object.assign(item,value);
        dirty = false;
        notice.textContent = requireReload ? '저장은 완료됐지만 최신 상태를 확인하지 못했어요. 다시 편집하기 전에 목록을 새로 불러와 주세요.' : '저장했습니다.';
        let listButton = Array.from(root.querySelectorAll('[data-info-edit]')).find(button => button.dataset.infoEdit === id);
        if (!listButton) {
          listButton = document.createElement('button');
          listButton.dataset.infoEdit = id;
          listButton.onclick = () => openEditor(item);
          root.querySelector('.info-admin-list').prepend(listButton);
        }
        listButton.textContent = `${item.title} · ${item.status === 'published' ? '공개' : '초안'}`;
      } catch (error) { notice.textContent = error.code === 'permission-denied' ? '관리자 권한이 없거나 변경됐어요. 입력을 복사해 보관한 뒤 권한을 확인하세요.' : error.message || '저장하지 못했어요. 다시 시도하세요.'; }
      finally {
        clearTimeout(slow);pendingSave=false;
        form.querySelectorAll('input,textarea,select,button').forEach(control=>control.disabled=false);
        refreshChoices();
        if(requireReload||root.dataset.sessionLost)form.querySelectorAll('button[type=submit]').forEach(button=>button.disabled=true);
      }
    };
    host.scrollIntoView({block:'start'});
  }
}
export function installInfo(getSites, rerender) {
  document.addEventListener('submit', event => {
    if (event.target.id !== 'infoSearch') return;
    event.preventDefault();
    location.hash = '#/info?' + new URLSearchParams(new FormData(event.target));
  });
  document.addEventListener('click', async event => {
    const button = event.target.closest('[data-info-retry],[data-info-login],[data-info-logout],[data-info-seed]');
    if (!button) return;
    if (pendingSave || dirty && !window.confirm('저장하지 않은 변경을 버릴까요?')) return;
    button.disabled = true;
    try {
      if (button.hasAttribute('data-info-login')) {
        const notice = document.getElementById('infoAdminNotice');
        if (notice) notice.textContent = 'Google 로그인 창에서 계정을 선택하세요. 창이 열리지 않으면 팝업 허용을 확인하거나 일반 브라우저에서 다시 열어 주세요.';
        await api.login();
      }
      if (button.hasAttribute('data-info-logout')) await api.logout();
      if (button.hasAttribute('data-info-seed')) {
        const { SEED_ARTICLES } = await import('./seed.module.js');
        for (const {id,...item} of SEED_ARTICLES) await api.saveArticle(id,item,true);
      }
      dirty = false;
      rerender();
    } catch (error) {
      const notice = document.getElementById('infoAdminNotice');
      if (notice) notice.textContent = error.code === 'auth/popup-blocked' ? '로그인 팝업이 차단됐어요. 팝업을 허용한 뒤 다시 시도하세요.' : error.message;
    } finally { button.disabled = false; }
  });
  window.addEventListener('beforeunload', event => { if (dirty || pendingSave) { event.preventDefault(); event.returnValue = ''; } });
  document.addEventListener('click', event => {
    if (!event.target.closest('a[href]') || !dirty && !pendingSave) return;
    if (pendingSave || !window.confirm('저장하지 않은 변경을 버리고 이동할까요?')) { event.preventDefault(); event.stopImmediatePropagation(); }
    else dirty = false;
  }, true);
  const guard = event => {
    if (!dirty && !pendingSave) return;
    if (pendingSave || !window.confirm('저장하지 않은 변경을 버리고 이동할까요?')) {
      history.replaceState(null,'',activeHash);
      event.stopImmediatePropagation();
    }
    else dirty = false;
  };
  window.addEventListener('popstate', guard);
  window.addEventListener('hashchange', guard);
  return () => hydrateInfo(getSites());
}
