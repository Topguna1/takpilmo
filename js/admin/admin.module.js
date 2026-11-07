import { validateArticle, convertLegacy } from './validation.module.js';
import { saveDocument, versionOf, recoveryKey, storeRecovery, findRecovery } from './persistence.module.js';
import { firebaseConfig } from '../info/firebase-config.module.js';
import { esc } from '../hub/model.module.js';
import { articleView } from '../info/content.module.js';
import { INFO_CATEGORIES, TIP_CATEGORY, DIFFICULTIES, STATUSES } from '../info/categories.module.js';
import { BLOCK_TYPES, MAX_BLOCKS } from '../info/blocks.module.js';

// Admin-only editor. Not linked from the public site; Firestore rules are the real access control.
const base = 'https://www.gstatic.com/firebasejs/12.3.0/';
const root = document.getElementById('app');
const userLabel = document.getElementById('adminUser');
const state = { fb: null, auth: null, db: null, user: null, isAdmin: false, list: [], view: 'loading', draft: null, id: null, message: null, dirty: false, saving: false };
const session = crypto.randomUUID();
let recoveryTimer;
let editVersion = 0;
let expected = '', draftExpected = '';
let publicStatus = 'draft';
let undo = null;
let pending=null;
let filter = '', search = '', sort='updatedAt';
let pageSize = 25;
let cursor = null;
let hasMore = false;
let listFailed = false;
let sites = [];
fetch('./data/sheet-snapshot.json').then(r => r.json()).then(d => { sites = d.sites || []; }).catch(() => {});
const csv = text => String(text || '').split(',').map(v => v.trim()).filter(Boolean);
const newBlock = type => ({
  text: { type, text: '' }, image: { type, url: '', alt: '', caption: '' }, youtube: { type, url: '', caption: '' },
  steps: { type, items: [{ title: '', text: '', imageUrl: '' }] }, callout: { type, kind: 'tip', text: '' }, link: { type, label: '', url: '' }
})[type];
const emptyDraft = () => ({ title: '', summary: '', body: '', category: TIP_CATEGORY, status: 'draft', blocks: [], tags: [], thumbnail: '', difficulty: '', minutes: 0, siteKeys: [], sources: [], createdAt: null, publishedAt: null });
// JSON-clone only plain fields; createdAt/publishedAt must stay Firestore Timestamps.
const cloneDraft = item => ({ ...emptyDraft(), ...item, blocks: JSON.parse(JSON.stringify(item.blocks || [])), tags: [...(item.tags || [])], siteKeys: [...(item.siteKeys || [])], sources: JSON.parse(JSON.stringify(item.sources || [])) });
const sourcesToText = sources => (sources || []).map(s => `${s.label} | ${s.url} | ${s.checkedAt}`).join('\n');
function textToSources(text) {
  return String(text || '').split('\n').map(l => l.trim()).filter(Boolean).map(line => {
    const [label = '', url = '', checkedAt = ''] = line.split('|').map(p => p.trim());
    return { label, url, checkedAt };
  });
}
const setMessage = (text, error = false) => { state.message = text ? { text, error } : null; };
const messageHtml = () => state.message ? `<p class="admin-msg${state.message.error ? ' error' : ''}" role="status">${esc(state.message.text)}</p>` : '';

async function boot() {
  if (!firebaseConfig.projectId || !firebaseConfig.apiKey) { root.innerHTML = '<p>Firebase 설정이 비어 있어요.</p>'; return; }
  try {
    const [app, auth, fs] = await Promise.all([import(base + 'firebase-app.js'), import(base + 'firebase-auth.js'), import(base + 'firebase-firestore.js')]);
    const instance = app.getApps().length ? app.getApp() : app.initializeApp(firebaseConfig);
    state.fb = { ...auth, ...fs };
    state.auth = auth.getAuth(instance);
    state.db = fs.getFirestore(instance);
    auth.onAuthStateChanged(state.auth, async user => {
      clearTimeout(recoveryTimer);state.draft=null;state.dirty=false;
      state.user = user; state.isAdmin = false;
      userLabel.textContent = user?.email || '';
      if (user) {
        try { const role=await fs.getDoc(fs.doc(state.db, 'admins', user.uid));state.isAdmin=role.exists() && role.data().enabled !== false; } catch { state.isAdmin = false; }
        if (state.isAdmin) await loadList();
      }
      state.view = !user ? 'login' : !state.isAdmin ? 'denied' : 'list';
      render();
    });
  } catch { root.innerHTML = '<p class="admin-msg error">Firebase를 불러오지 못했어요. 네트워크를 확인하고 새로고침해 주세요.</p>'; }
}
async function loadList() {
  const { fb, db } = state;
  try {
    const snap = await fb.getDocs(fb.query(fb.collection(db, 'infoArticles'), fb.orderBy('updatedAt', 'desc'), ...(cursor ? [fb.startAfter(cursor)] : []), fb.limit(25)));
    const rows = snap.docs.map(d => ({ ...d.data(), id: d.id }));
    state.list = cursor ? [...state.list, ...rows] : rows;
    cursor = snap.docs.at(-1) || cursor; hasMore = rows.length === 25; listFailed = false; return true;
  } catch { listFailed = true; setMessage('글 목록 갱신에 실패했어요. 다시 시도해 주세요.', true); return false; }
}
const dateOf = item => item.updatedAt?.toDate?.().toLocaleDateString('ko-KR') || '';

function render() {
  if (state.view === 'loading') return;
  if (state.view === 'login') root.innerHTML = '<h1>관리자 로그인</h1><p>관리자로 등록된 Google 계정만 글을 쓸 수 있어요.</p><button data-act="login">Google로 로그인</button>' + messageHtml();
  else if (state.view === 'denied') root.innerHTML = `<h1>권한이 없어요</h1><p>이 계정(${esc(state.user?.email)})은 관리자가 아니에요. UID를 Firestore <code>admins</code> 컬렉션에 문서 ID로 등록해야 해요.</p><p>UID: <code>${esc(state.user?.uid)}</code></p><button data-act="logout">로그아웃</button>`;
  else if (state.view === 'list') renderList();
  else if (state.view === 'edit') renderEditor();
  else if (state.view === 'preview') renderPreview();
}
function renderList() {
  const filtered = state.list.filter(i => (!filter || i.status === filter) && i.title.toLowerCase().includes(search.toLowerCase())).sort((a,b)=>(b[sort]?.seconds||0)-(a[sort]?.seconds||0));
  const rows = filtered.slice(0,pageSize).map(item => `<tr><td><strong>${esc(item.title || '제목 없는 초안')}</strong><br><small>${esc(item.category)}</small></td><td><span class="badge ${esc(item.status)}">${esc(STATUSES[item.status] || item.status)}</span></td><td>${esc(dateOf(item))}</td><td class="admin-row"><button data-act="edit" data-id="${esc(item.id)}">수정</button>${item.status === 'published' ? `<a class="button" href="./#/info/${encodeURIComponent(item.id)}" target="_blank" rel="noopener noreferrer">보기 ↗</a>` : ''}</td></tr>`).join('');
  const counts = Object.keys(STATUSES).map(s => `${STATUSES[s]} ${state.list.filter(i => i.status === s).length}`).join(' · ');
  root.innerHTML = `<div class="admin-row"><h1 style="margin-right:auto">글 관리</h1><button data-act="new">새 글 쓰기</button><button data-act="logout">로그아웃</button></div><p>불러온 글: ${esc(counts)}</p><form id="listFilter"><label>상태 <select name="status">${opt(['',...Object.keys(STATUSES)],filter,v=>STATUSES[v] || '전체')}</select></label><label>제목 검색 <input name="q" value="${esc(search)}"></label><label>정렬 <select name="sort">${opt(['updatedAt','publishedAt'],sort,v=>v==='updatedAt'?'수정일':'공개일')}</select></label><button>적용</button></form><p>검색 범위: 불러온 ${state.list.length}개 글${hasMore ? ' (더 불러오기로 범위를 넓힐 수 있어요)' : ' (전체)'}</p><button data-act="refresh">목록 새로고침</button>${hasMore ? '<button data-act="more">더 불러오기</button>' : ''}${messageHtml()}${rows ? `<div style="overflow-x:auto"><table class="admin-table"><thead><tr><th>제목</th><th>상태</th><th>수정일</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>` : `<p>${listFailed ? '글 목록을 확인할 수 없어요.' : '표시할 글이 없어요.'}</p>`}`;
}
const opt = (values, current, labelOf = v => v || '선택 안 함') => values.map(v => `<option value="${esc(v)}"${v === current ? ' selected' : ''}>${esc(labelOf(v))}</option>`).join('');
const input = (field, label, value, extra = '') => `<label class="field">${label}<input data-f="${field}" value="${esc(value)}" ${extra}></label>`;
function blockEditor(block, index, total) {
  const head = `<header><button type="button" data-act="collapse" data-i="${index}" aria-expanded="true">접기</button><button type="button" data-act="duplicate" data-i="${index}">복제</button><button type="button" data-act="insert" data-i="${index}">아래 글 삽입</button><strong>${index + 1}. ${esc(BLOCK_TYPES[block.type])}</strong><span class="admin-row"><button type="button" data-act="up" data-i="${index}"${index === 0 ? ' disabled' : ''}>↑</button><button type="button" data-act="down" data-i="${index}"${index === total - 1 ? ' disabled' : ''}>↓</button><button type="button" data-act="remove-block" data-i="${index}">삭제</button></span></header>`;
  let body = Object.hasOwn(BLOCK_TYPES,block.type) ? '' : '<p role="alert">지원하지 않는 블록이에요. 원문 내보내기로 보관해 주세요.</p>';
  if (block.type === 'text') body = `<label class="field">내용<textarea data-f="text" rows="7">${esc(block.text)}</textarea><small>## 제목, ### 소제목, - 목록, 빈 줄로 문단 구분</small></label>`;
  if (block.type === 'image') body = input('url', '이미지 주소 (https://)', block.url, 'inputmode="url"') + input('alt', '대체 텍스트 (이미지 설명)', block.alt) + input('caption', '캡션 (선택)', block.caption);
  if (block.type === 'youtube') body = input('url', '유튜브 링크', block.url, 'inputmode="url"') + input('caption', '설명 (선택)', block.caption) + '<small>youtu.be, watch?v=, shorts 링크 지원. ?t=90 으로 시작 시간 지정</small>';
  if (block.type === 'callout') body = `<label class="field">종류<select data-f="kind">${opt(['tip', 'warn'], block.kind, v => v === 'warn' ? '주의' : '꿀팁')}</select></label><label class="field">내용<textarea data-f="text" rows="3">${esc(block.text)}</textarea></label>`;
  if (block.type === 'link') body = input('label', '버튼 이름', block.label) + input('url', '주소 (https://)', block.url, 'inputmode="url"');
  if (block.type === 'steps') body = (block.items || []).map((item, s) => `<div class="step-edit" data-s="${s}"><div class="admin-row"><strong>단계 ${s + 1}</strong><button type="button" data-act="remove-step" data-i="${index}" data-s="${s}">단계 삭제</button></div>${input('title', '제목', item.title)}<label class="field">설명<textarea data-f="text" rows="3">${esc(item.text)}</textarea></label>${input('imageUrl', '이미지 주소 (선택, https://)', item.imageUrl)}</div>`).join('') + `<button type="button" data-act="add-step" data-i="${index}">+ 단계 추가</button>`;
  return `<section class="blk-edit" data-i="${index}" data-type="${esc(block.type)}">${head}<div class="block-fields">${body}</div></section>`;
}
function renderEditor() {
  const d = state.draft;
  const legacy = d.body ? `<section class="blk-edit"><header><strong>기존 본문 (마크다운)</strong><button type="button" data-act="convert">블록으로 변환</button></header><label class="field"><textarea data-f="body" rows="6">${esc(d.body)}</textarea></label><small>블록이 있으면 블록이 우선 표시돼요. 변환 결과를 미리보기로 확인한 뒤 저장하세요. 되돌리기로 취소할 수 있어요.</small></section>` : '';
  const adds = Object.entries(BLOCK_TYPES).map(([type, label]) => `<button type="button" data-act="add-block" data-type="${type}">+ ${esc(label)}</button>`).join('');
  root.innerHTML = `<div class="admin-row"><button type="button" data-act="back">← 목록</button><h1 style="margin:0">${state.hasServer ? '글 수정' : '새 글'}</h1></div>${messageHtml()}<p id="saveState" role="status">${state.dirty ? '저장하지 않은 변경' : '서버에서 불러온 내용'}</p>
  <div id="editor">
  ${input('title', '제목 (160자 이내)', d.title, '')}
  <label class="field">요약 (300자 이내, 목록 카드에 표시)<textarea data-f="summary" rows="2">${esc(d.summary)}</textarea></label>
  <div class="grid2"><label class="field">분류<select data-f="category">${opt(INFO_CATEGORIES, d.category)}</select></label><label class="field">상태<select data-f="status">${opt(Object.keys(STATUSES), d.status, v => STATUSES[v])}</select><small>공개로 저장하면 바로 사이트에 보여요. 보관은 삭제 대신 숨기는 용도예요.</small></label></div>
  <div class="grid2"><label class="field">난이도<select data-f="difficulty">${opt(DIFFICULTIES, d.difficulty)}</select></label>${input('minutes', '소요 시간(분)', d.minutes || '', 'inputmode="numeric"')}</div>
  ${input('thumbnail', '대표 이미지 주소 (선택, https://)', d.thumbnail, 'inputmode="url"')}
  ${input('tags', '태그 (쉼표로 구분, 최대 8개)', (d.tags || []).join(', '))}
  ${input('siteKeys', '관련 사이트 키 (쉼표로 구분, 최대 3개)', (d.siteKeys || []).join(', '))}<label class="field">관련 사이트 찾기<input list="siteOptions" id="sitePicker"><datalist id="siteOptions">${sites.map(s=>`<option value="${esc(s.key || s.id)}">${esc(s.name)}</option>`).join('')}</datalist></label><button data-act="pick-site">관련 사이트 추가</button>
  <label class="field">참고 출처 (줄마다 이름 | https://주소 | YYYY-MM-DD)<textarea data-f="sources" rows="3">${esc(sourcesToText(d.sources))}</textarea><small>${esc(TIP_CATEGORY)} 분류는 출처 없이 공개할 수 있어요. 다른 분류는 출처가 1개 이상 필요해요.</small></label>
  ${legacy}
  <h2>본문 블록</h2>
  ${d.blocks.map((b, i) => blockEditor(b, i, d.blocks.length)).join('') || '<p>아래 버튼으로 블록을 추가하세요.</p>'}
  <div class="admin-row">${adds}</div>
  </div>
  <div class="admin-sticky"><button type="button" data-act="save">${publicStatus === 'published' ? '공개 변경 반영' : '저장'}</button><button type="button" data-act="draft">초안 저장</button><button type="button" data-act="undo">되돌리기</button><button type="button" data-act="history">이전 버전</button><button type="button" data-act="export">원문 내보내기</button><button type="button" data-act="preview">미리보기</button><button type="button" data-act="back">닫기</button></div>`;
}
function renderPreview() {
  root.innerHTML = `<div class="admin-row"><button type="button" data-act="edit-back">← 편집으로 돌아가기</button><span>미리보기 (저장 전 내용이에요)</span></div><div style="margin-top:16px">${articleView({ ...state.draft, id: state.id || 'preview' }, sites)}</div>`;
  root.querySelectorAll('.info-article a[href^="#"]').forEach(a => { a.href='./index.html'+a.getAttribute('href'); a.target='_blank'; a.rel='noopener'; });
}

// DOM -> state.draft. Called before every action that re-renders or saves.
function collect() {
  const ed = document.getElementById('editor');
  if (!ed) return;
  const d = state.draft;
  const top = f => ed.querySelector(`:scope > [data-f="${f}"], :scope > label > [data-f="${f}"], :scope > .grid2 > label > [data-f="${f}"]`)?.value;
  for (const f of ['title', 'summary', 'category', 'status', 'difficulty', 'thumbnail']) { const v = top(f); if (v !== undefined) d[f] = v; }
  const minutes = top('minutes'); if (minutes !== undefined) d.minutes = minutes === '' ? 0 : Number(minutes);
  const tags = top('tags'); if (tags !== undefined) d.tags = csv(tags);
  const keys = top('siteKeys'); if (keys !== undefined) d.siteKeys = csv(keys);
  const sources = top('sources'); if (sources !== undefined) d.sources = textToSources(sources);
  const legacy = ed.querySelector('textarea[data-f="body"]'); if (legacy) d.body = legacy.value;
  d.blocks = [...ed.querySelectorAll('.blk-edit[data-type]')].map(el => {
    const get = (scope, f) => scope.querySelector(`[data-f="${f}"]`)?.value ?? '';
    const type = el.dataset.type;
    if (!Object.hasOwn(BLOCK_TYPES,type)) return state.draft.blocks[+el.dataset.i];
    if (type === 'steps') return { type, items: [...el.querySelectorAll('.step-edit')].map(s => ({ title: get(s, 'title'), text: get(s, 'text'), imageUrl: get(s, 'imageUrl') })) };
    return Object.fromEntries([['type', type], ...[...el.querySelectorAll('[data-f]')].map(f => [f.dataset.f, f.value])]);
  });
}
function localKey() { return recoveryKey(state.user.uid, state.recoveryId || 'new', session); }
function recoverLocally() {
  if (!state.draft || !state.user || !state.dirty) return;
  collect();
  try { storeRecovery(localStorage,localKey(), { ...state.draft, _expected: expected, _draftExpected: draftExpected, _publicStatus: publicStatus, _id: state.id });
    const el=document.getElementById('saveState'); if(el) el.textContent='이 브라우저에 임시 보관했어요 · 서버 미저장';
  } catch { const el=document.getElementById('saveState'); if(el) el.textContent='임시 보관 실패: 원문 내보내기로 보관해 주세요.'; }
}
function showMessage() {
  root.querySelector('.admin-msg')?.remove();
  root.insertAdjacentHTML('afterbegin',messageHtml());
}
async function save(asDraft = false) {
  if (state.saving) return;
  collect();
  const content = JSON.parse(JSON.stringify(state.draft));
  for(const k of ['id','createdAt','updatedAt','publishedAt','revision','lastOperation','_expected','_draftExpected','_publicStatus','_id']) delete content[k];
  if(asDraft) content.status='draft';
  const errors=validateArticle(content,content.status==='published');
  root.querySelectorAll('.field-error').forEach(el=>el.remove());
  root.querySelectorAll('[aria-invalid]').forEach(el=>el.removeAttribute('aria-invalid'));
  if(errors.length) {
    setMessage(errors.map(e=>e.message).join(' / '),true); showMessage();
    for(const e of errors) { const el=e.field.startsWith('block:') ? root.querySelector(`.blk-edit[data-i="${e.field.split(':')[1]}"]`) : root.querySelector(`[data-f="${e.field}"]`);
      if(el){el.setAttribute('aria-invalid','true'); const note=document.createElement('p');note.className='field-error';note.textContent=e.message;el.after(note);} }
    root.querySelector('[aria-invalid]')?.scrollIntoView({block:'center'}); return;
  }
  const version=editVersion, id=state.id, working=asDraft && publicStatus==='published';
  const signature=JSON.stringify({id,content,working});
  if(pending?.signature!==signature)pending={signature,id:crypto.randomUUID()};
  state.saving=true;
  const button=root.querySelector('[data-act="save"]'); if(button) button.disabled=true;
  document.getElementById('saveState').textContent='서버에 저장 중…';
  recoverLocally();
  try {
    const result = await saveDocument(state.fb,state.db,{id,content,expected,draftExpected,working,uid:state.user.uid,operation:asDraft?'draft':'save',operationId:pending.id});
    expected=result.expected;draftExpected=result.draftExpected;pending=null;state.hasServer=true;
    const previousKey=localKey();state.recoveryId=id;try{localStorage.removeItem(previousKey);}catch{}
    if(!working)publicStatus=content.status;
    if(editVersion===version){state.dirty=false; try {localStorage.removeItem(localKey());}catch{} }
    if(state.dirty)recoverLocally();
    cursor=null; const listed=await loadList();
    setMessage((working?'공개 본문을 유지하고 초안을 저장했어요.':'저장했어요.')+(state.dirty?' 추가 변경은 아직 서버에 저장하지 않았어요.':'')+(!listed?' 목록 갱신에 실패했어요. 다시 시도할 수 있어요.':''));
  } catch(error) {
    setMessage(error.code==='conflict'?error.message:error.code==='permission-denied'?'저장이 거부됐어요. 관리자 권한과 배포 규칙을 확인해 주세요.':'저장 결과를 확인하지 못했어요. 작성본은 유지했어요. 최신 글을 다시 확인한 뒤 재시도해 주세요.',true);
  } finally {
    state.saving=false; showMessage(); if(!state.dirty && asDraft && !working){state.draft.status='draft';const statusSelect=root.querySelector('[data-f="status"]');if(statusSelect)statusSelect.value='draft';}
    if(button?.isConnected) {button.disabled=false;button.textContent=publicStatus==='published'?'공개 변경 반영':'저장';}
    const status=document.getElementById('saveState'); if(status) status.textContent=state.dirty?'서버 미저장 변경이 있어요':'서버 저장 완료 · '+new Date().toLocaleTimeString('ko-KR');
  }
}
async function openEditor(id) {
  if(state.saving) return;
  const found=id && state.list.find(i=>i.id===id);state.hasServer=!!found;
  state.recoveryId=id || 'new';
  state.id=id || state.fb.doc(state.fb.collection(state.db,'infoArticles')).id;
  let work=null;
  try {const snap=await state.fb.getDoc(state.fb.doc(state.db,'articleDrafts',state.id)); work=snap.exists()?snap.data():null;} catch {setMessage('작업 초안을 확인하지 못했어요. 규칙과 연결을 확인해 주세요.',true);showMessage();return;}
  expected=versionOf(found || null);draftExpected=versionOf(work);publicStatus=found?.status || 'draft';
  state.draft=found?cloneDraft(found):emptyDraft();
  if(work && confirm('서버에 저장한 작업 초안이 있어요. 이어서 편집할까요?')) {state.draft=cloneDraft(work);state.draft.status=found?.status || 'draft';}
  state.dirty=false;undo=null;pending=null;editVersion++;setMessage(null);
  try {
    const recovery=findRecovery(localStorage,state.user.uid,id || 'new')[0];
    if(recovery && confirm('이 브라우저에 미저장 작성본이 있어요. 복구할까요?')) {
      state.draft=cloneDraft(recovery.content);state.dirty=true;if(!id && recovery.content._id)state.id=recovery.content._id;
      expected=recovery.content._expected ?? expected;draftExpected=recovery.content._draftExpected ?? draftExpected;
    }
  } catch {setMessage('임시 보관을 읽지 못했어요. 원문 내보내기를 이용해 주세요.',true);}
  state.view='edit';render();
}
const actions = {
  login: async () => { try { await state.fb.signInWithPopup(state.auth, new state.fb.GoogleAuthProvider()); } catch { setMessage('로그인하지 못했어요. 팝업 차단을 확인해 주세요.', true); render(); } },
  logout: async () => { if (state.dirty && !confirm('저장하지 않은 변경이 있어요. 로그아웃할까요?')) return; await state.fb.signOut(state.auth); state.dirty = false; },
  new: () => openEditor(null),
  edit: el => openEditor(el.dataset.id),
  back: () => { if (state.dirty && !confirm('저장하지 않은 변경이 있어요. 나갈까요?')) return; if(state.dirty){try{localStorage.removeItem(localKey());}catch{}} clearTimeout(recoveryTimer);state.dirty = false; setMessage(null); state.view = 'list'; render(); },
  save: () => save(false),
  draft: () => save(true),
  refresh: async () => { cursor=null; await loadList(); render(); },
  more: async () => { await loadList(); pageSize+=25; render(); },
  preview: () => { collect(); state.view = 'preview'; render(); },
  'edit-back': () => { state.view = 'edit'; render(); },
  convert: () => { collect(); try { undo=cloneDraft(state.draft); state.draft.blocks=convertLegacy(state.draft.body,state.draft.blocks);state.draft.body='';state.dirty=true;renderEditor(); }catch(e){setMessage(e.message,true);showMessage();} },
  'add-block': el => { collect(); if (state.draft.blocks.length >= MAX_BLOCKS) return; state.draft.blocks.push(newBlock(el.dataset.type)); state.dirty = true; renderEditor(); },
  'remove-block': el => { collect(); if (!confirm('이 블록을 삭제할까요?')) return; undo=cloneDraft(state.draft); state.draft.blocks.splice(+el.dataset.i, 1); state.dirty = true; renderEditor(); },
  up: el => move(+el.dataset.i, -1), down: el => move(+el.dataset.i, 1),
  collapse: el => { const fields=el.closest('.blk-edit').querySelector('.block-fields');fields.hidden=!fields.hidden;el.textContent=fields.hidden?'펼치기':'접기';el.setAttribute('aria-expanded',String(!fields.hidden)); },
  duplicate: el => { collect(); if(state.draft.blocks.length>=MAX_BLOCKS)return;undo=cloneDraft(state.draft);state.draft.blocks.splice(+el.dataset.i+1,0,JSON.parse(JSON.stringify(state.draft.blocks[+el.dataset.i])));state.dirty=true;renderEditor(); },
  insert: el => { collect();if(state.draft.blocks.length>=MAX_BLOCKS)return;state.draft.blocks.splice(+el.dataset.i+1,0,newBlock('text'));state.dirty=true;renderEditor(); },
  undo: () => {if(undo){state.draft=undo;undo=null;state.dirty=true;renderEditor();}},
  export: () => {collect();const url=URL.createObjectURL(new Blob([JSON.stringify(state.draft,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='takpilmo-draft.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);},
  'pick-site': () => {const value=document.getElementById('sitePicker').value;if(sites.some(s=>(s.key||s.id)===value)){collect();state.draft.siteKeys=[...new Set([...state.draft.siteKeys,value])];state.dirty=true;renderEditor();}},
  history: async () => {collect();const f=state.fb;try { const snap=await f.getDocs(f.query(f.collection(state.db,'adminHistory'),f.where('articleId','==',state.id),f.orderBy('savedAt','desc'),f.limit(50)));const entries=snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(b.savedAt?.seconds||0)-(a.savedAt?.seconds||0));state.history=entries;root.innerHTML='<button data-act="edit-back">← 편집으로 돌아가기</button><h1>이전 버전</h1><p>최근 50개 버전을 표시해요. 복원 후 저장하면 새 버전으로 반영돼요.</p>'+entries.map((e,i)=>`<p>${esc(e.snapshot.title || '제목 없는 글')} · ${esc(e.kind)} · ${esc(e.author)}<button data-act="restore" data-i="${i}">이 버전 복원</button></p>`).join(''); }catch {setMessage('이력을 불러오지 못했어요.',true);showMessage();}},
  restore: el => {undo=cloneDraft(state.draft);state.draft=cloneDraft(state.history[+el.dataset.i].snapshot);state.dirty=true;state.view='edit';renderEditor();},
  'add-step': el => { collect(); const b = state.draft.blocks[+el.dataset.i]; if (b.items.length < 20) b.items.push({ title: '', text: '', imageUrl: '' }); state.dirty = true; renderEditor(); },
  'remove-step': el => { collect(); undo=cloneDraft(state.draft); const b = state.draft.blocks[+el.dataset.i]; if (b.items.length > 1) b.items.splice(+el.dataset.s, 1); state.dirty = true; renderEditor(); }
};
function move(i, delta) {
  collect();
  const list = state.draft.blocks, j = i + delta;
  if (j < 0 || j >= list.length) return;
  [list[i], list[j]] = [list[j], list[i]];
  state.dirty = true; renderEditor();
  const moved=root.querySelector(`.blk-edit[data-i="${j}"]`); moved?.scrollIntoView({block:'center'});moved?.querySelector('button')?.focus();
}
root.addEventListener('click', event => {
  const el = event.target.closest('[data-act]');
  if (el && actions[el.dataset.act]) {if(state.saving && !['export','collapse'].includes(el.dataset.act))return;const action=el.dataset.act; Promise.resolve(actions[action](el)).then(()=>{if(state.view==='edit' && !['save','draft','export','collapse'].includes(action)){editVersion++;recoverLocally();}}).catch(error=>{setMessage(error.message || '작업을 완료하지 못했어요.',true);showMessage();});}
});
root.addEventListener('input', event => { if (state.view === 'edit') {state.dirty=true;editVersion++;clearTimeout(recoveryTimer);recoveryTimer=setTimeout(recoverLocally,500);const el=event.target;if(el.matches('input[data-f=url],input[data-f=thumbnail],input[data-f=imageUrl]') && el.value.startsWith('https://') && !el.closest('[data-type=youtube]')){let img=el.parentElement.querySelector('img');if(!img){img=document.createElement('img');img.className='admin-image-preview';img.alt='이미지 미리보기';el.after(img);}img.src=el.value;}if(el.matches('textarea,input[data-f]')){el.title=`${el.value.length}자`;let counter=el.parentElement.querySelector('.char-count');if(!counter){counter=document.createElement('small');counter.className='char-count';el.after(counter);}counter.textContent=`${el.value.length}자`;} } });
root.addEventListener('submit',event=>{if(event.target.id==='listFilter'){event.preventDefault();const data=new FormData(event.target);filter=data.get('status');search=data.get('q');sort=data.get('sort');renderList();}});
root.addEventListener('error',event=>{if(event.target.tagName==='IMG')event.target.alt='이미지를 불러오지 못했어요. 주소를 확인해 주세요.';},true);
window.addEventListener('beforeunload', event => { if (state.dirty) { recoverLocally(); event.preventDefault(); event.returnValue = ''; } });
boot();
