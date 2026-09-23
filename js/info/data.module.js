import { firebaseConfig } from './firebase-config.module.js';
let connection;
async function readWithDeadline(promise) {
  let timer;
  try {
    return await Promise.race([promise,new Promise((_,reject) => {
      timer = setTimeout(() => reject(new Error('연결 시간이 초과됐어요. 다시 시도해 주세요.')),15000);
    })]);
  } finally { clearTimeout(timer); }
}
export async function connect() {
  if (!firebaseConfig.projectId || !firebaseConfig.apiKey) throw new Error('Firebase 연결 준비 중입니다. 관리자 설정 후 글을 공개합니다.');
  if (!connection) connection = (async () => {
    const base = 'https://www.gstatic.com/firebasejs/12.3.0/';
    const [app, dbApi, authApi] = await Promise.all([import(base + 'firebase-app.js'), import(base + 'firebase-firestore.js'), import(base + 'firebase-auth.js')]);
    const instance = app.getApps().length ? app.getApp() : app.initializeApp(firebaseConfig);
    const db = dbApi.getFirestore(instance), auth = authApi.getAuth(instance);
    await auth.authStateReady();
    return { db, auth, ...dbApi, ...authApi };
  })().catch(error => { connection = null; throw error; });
  return readWithDeadline(connection);
}
export async function articles(admin = false) {
  const f = await connect();
  const ref = f.collection(f.db, 'infoArticles');
  const query = admin ? f.query(ref, f.orderBy('updatedAt', 'desc')) : f.query(ref, f.where('status', '==', 'published'), f.orderBy('publishedAt', 'desc'));
  return (await readWithDeadline(f.getDocsFromServer(query))).docs.map(d => ({ ...d.data(), id: d.id }));
}
export async function article(id) {
  const f = await connect();
  try {
    const doc = await readWithDeadline(f.getDocFromServer(f.doc(f.db, 'infoArticles', id)));
    return doc.exists() && doc.data().status === 'published' ? { ...doc.data(), id: doc.id } : null;
  } catch (error) { if (error.code === 'permission-denied') return null; throw error; }
}
export async function administrator() {
  const f = await connect();
  if (!f.auth.currentUser) return false;
  return (await readWithDeadline(f.getDocFromServer(f.doc(f.db, 'admins', f.auth.currentUser.uid)))).exists();
}
export async function login() {
  const f = await connect();
  await f.signInWithPopup(f.auth, new f.GoogleAuthProvider());
}
export async function logout() { const f = await connect(); await f.signOut(f.auth); }
export function validateArticle(data) {
  if (!data.title?.trim() || data.title.length > 160) throw new Error('제목을 160자 이내로 입력하세요.');
  if (!data.summary?.trim() || data.summary.length > 300) throw new Error('요약을 300자 이내로 입력하세요.');
  if (!['학습 정보', '사이트 활용'].includes(data.category)) throw new Error('분류를 선택하세요.');
  if (!data.body?.trim() || data.body.length > 50000) throw new Error('본문을 50,000자 이내로 입력하세요.');
  if (!['draft', 'published'].includes(data.status)) throw new Error('공개 상태를 확인하세요.');
  if (!Array.isArray(data.siteKeys) || data.siteKeys.length > 3) throw new Error('관련 사이트는 최대 3개입니다.');
  if (!Array.isArray(data.sources) || data.sources.length > 10) throw new Error('출처는 최대 10개입니다.');
  for (const source of data.sources) {
    let url; try { url = new URL(source.url); } catch { throw new Error('출처 URL을 확인하세요.'); }
    if (!['https:', 'http:'].includes(url.protocol) || !source.label?.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(source.checkedAt || '')) throw new Error('출처 이름·웹 주소·확인 날짜를 확인하세요.');
  }
  if (data.status === 'published' && !data.sources.length) throw new Error('공개 전 참고 출처와 확인 날짜를 등록하세요.');
  return data;
}
export async function saveArticle(id, data, createOnly = false) {
  validateArticle(data);
  const f = await connect();
  const ref = id ? f.doc(f.db, 'infoArticles', id) : f.doc(f.collection(f.db, 'infoArticles'));
  await f.runTransaction(f.db, async transaction => {
    const old = await transaction.get(ref);
    if (createOnly && old.exists()) return;
    transaction.set(ref, { ...data, createdAt: old.data()?.createdAt || f.serverTimestamp(), updatedAt: f.serverTimestamp(), publishedAt: old.data()?.publishedAt || (data.status === 'published' ? f.serverTimestamp() : null) });
  });
  return ref.id;
}
