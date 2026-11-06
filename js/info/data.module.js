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
    const [app, dbApi] = await Promise.all([import(base + 'firebase-app.js'), import(base + 'firebase-firestore.js')]);
    const instance = app.getApps().length ? app.getApp() : app.initializeApp(firebaseConfig);
    const db = dbApi.getFirestore(instance);
    return { db, ...dbApi };
  })().catch(error => { connection = null; throw error; });
  return readWithDeadline(connection);
}
export async function articles() {
  const f = await connect();
  const ref = f.collection(f.db, 'infoArticles');
  const query = f.query(ref, f.where('status', '==', 'published'), f.orderBy('publishedAt', 'desc'));
  return (await readWithDeadline(f.getDocsFromServer(query))).docs.map(d => ({ ...d.data(), id: d.id }));
}
export async function latestArticles() {
  const f = await connect();
  const q = f.query(f.collection(f.db, 'infoArticles'), f.where('status', '==', 'published'), f.orderBy('publishedAt', 'desc'), f.limit(3));
  return (await readWithDeadline(f.getDocsFromServer(q))).docs.map(d => ({...d.data(), id:d.id}));
}
export async function article(id) {
  const f = await connect();
  try {
    const doc = await readWithDeadline(f.getDocFromServer(f.doc(f.db, 'infoArticles', id)));
    return doc.exists() && doc.data().status === 'published' ? { ...doc.data(), id: doc.id } : null;
  } catch (error) { if (error.code === 'permission-denied') return null; throw error; }
}
