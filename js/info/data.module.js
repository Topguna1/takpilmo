import { validateArticle, readableArticle, revisionOf, sameContent } from './validation.module.js';
export { validateArticle, revisionOf } from './validation.module.js';
let connection, authenticated;
const pending = new Map();
export async function readWithDeadline(promise, milliseconds = 15000) {
  let timer;
  try { return await Promise.race([promise,new Promise((_,reject) => { timer=setTimeout(()=>reject(new Error('연결 시간이 초과됐어요. 다시 시도해 주세요.')),milliseconds); })]); }
  finally { clearTimeout(timer); }
}
function coalesce(key, task) {
  if (pending.has(key)) return pending.get(key);
  const result=readWithDeadline(Promise.resolve().then(task)).finally(()=>{if(pending.get(key)===result)pending.delete(key);});
  pending.set(key,result); return result;
}
export function database() {
  if (!connection) {
    const attempt=readWithDeadline(import('./firebase-client.module.js').then(m=>m.client()));
    connection=attempt;
    attempt.catch(()=>{if(connection===attempt)connection=null;});
  }
  return connection;
}
export function connect() {
  if (!authenticated) {
    const attempt=readWithDeadline(database().then(async f=>(await import('./firebase-auth.module.js')).withAuth(f)));
    authenticated=attempt;attempt.catch(()=>{if(authenticated===attempt)authenticated=null;});
  }
  return authenticated;
}
export function articles(admin = false, {take, siteKey} = {}) {
  return coalesce(JSON.stringify(['articles',admin,take,siteKey]),async()=>{
    const f=await (admin?connect():database());
    const constraints=admin ? [] : [f.where('status','==','published')];
    if(siteKey)constraints.push(f.where('siteKeys','array-contains',siteKey));
    constraints.push(f.orderBy(admin?'updatedAt':'publishedAt','desc'));
    if(take)constraints.push(f.limit(take));
    const result=await f.getDocsFromServer(f.query(f.collection(f.db,'infoArticles'),...constraints));
    const items=result.docs.map(d=>readableArticle(d.id,d.data())).filter(Boolean);
    Object.defineProperty(items,'invalidCount',{value:result.size-items.length});
    return items;
  });
}
export function article(id) {
  return coalesce('article:'+id,async()=>{
    const f=await database();
    try { const doc=await f.getDocFromServer(f.doc(f.db,'infoArticles',id));return doc.exists()&&doc.data().status==='published'?readableArticle(doc.id,doc.data()):null; }
    catch(error){if(error.code==='permission-denied')return null;throw error;}
  });
}
export async function administrator() {
  const f=await connect();if(!f.auth.currentUser)return false;
  return (await readWithDeadline(f.getDocFromServer(f.doc(f.db,'admins',f.auth.currentUser.uid)))).exists();
}
export async function login() {const f=await connect();await f.signInWithPopup(f.auth,new f.GoogleAuthProvider());}
export async function logout() {const f=await connect();await f.signOut(f.auth);}
export async function newArticleId() {const f=await connect();return f.doc(f.collection(f.db,'infoArticles')).id;}
export async function saveArticle(id,data,createOnly=false,expectedRevision) {
  validateArticle(data);
  if(typeof navigator!=='undefined' && navigator.onLine===false)throw new Error('오프라인입니다. 입력은 유지되니 연결 후 다시 저장하세요.');
  const f=await connect();const uid=f.auth.currentUser?.uid;
  if(!uid)throw new Error('로그인이 만료됐어요. 입력을 복사해 보관한 뒤 다시 로그인하세요.');
  const ref=f.doc(f.db,'infoArticles',id);
  // No artificial write timeout: a timed-out write might still commit. Retain the ID on retry.
  await f.runTransaction(f.db,async tx=>{
    const old=await tx.get(ref);
    if(f.auth.currentUser?.uid!==uid)throw new Error('로그인 계정이 변경됐어요. 다시 로그인하세요.');
    if(createOnly && old.exists())return;
    if(old.exists() && sameContent(old.data(),data))return;
    if(expectedRevision!==undefined && revisionOf(old.data()?.updatedAt)!==expectedRevision)throw new Error('다른 창에서 이 글이 변경됐어요. 현재 입력을 복사한 뒤 목록을 다시 불러와 비교해 주세요.');
    tx.set(ref,{...data,createdAt:old.data()?.createdAt||f.serverTimestamp(),updatedAt:f.serverTimestamp(),publishedAt:old.data()?.publishedAt||(data.status==='published'?f.serverTimestamp():null)});
  });
  pending.clear();
  try {
    const saved=await readWithDeadline(f.getDocFromServer(ref));
    if(sameContent(saved.data(),data))return {id:ref.id,updatedAt:saved.data().updatedAt};
  } catch { /* Commit succeeded; do not invite an unsafe retry with a new ID. */ }
  return {id:ref.id,needsReload:true};
}
