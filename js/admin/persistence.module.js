// Keep transport concerns separate from the editor. Transactions never mutate UI state.
export const versionOf = data => data?.revision ? `r:${data.revision}` : data ? `${data.updatedAt?.seconds ?? ''}:${data.updatedAt?.nanoseconds ?? ''}:${data.revision || 0}` : '';
export async function saveDocument(f, db, { id, content, expected, draftExpected, working, uid, operation, operationId }) {
  const ref = f.doc(db, 'infoArticles', id);
  const draftRef = f.doc(db, 'articleDrafts', id);
  const historyRef = f.doc(f.collection(db, 'adminHistory'));
  return f.runTransaction(db, async tx => {
    const currentSnap = await tx.get(ref), draftSnap = await tx.get(draftRef);
    const current = currentSnap.exists() ? currentSnap.data() : null;
    const draft = draftSnap.exists() ? draftSnap.data() : null;
    const target=working?draft:current;
    if(operationId && target?.lastOperation===operationId)return {working, revision:target.revision, expected:versionOf(current),draftExpected:versionOf(draft)};
    if (versionOf(current) !== expected || versionOf(draft) !== draftExpected) throw Object.assign(new Error('다른 탭에서 변경됐어요. 작성본을 내보낸 뒤 최신 글을 다시 열어 주세요.'), { code: 'conflict' });
    const stamp = f.serverTimestamp();
    const previous = working ? draft : current;
    const data = { ...content, ...(operationId?{lastOperation:operationId}:{}), createdAt: previous?.createdAt || (working ? null : current?.createdAt) || stamp, updatedAt: stamp,
      publishedAt: working ? null : (current?.publishedAt || (content.status === 'published' ? stamp : null)), revision: (previous?.revision || 0) + 1 };
    // Preserve the version being replaced atomically, including the first legacy version.
    if (previous) tx.set(historyRef, { articleId: id, kind: working ? 'draft' : 'article', snapshot: previous, savedAt: stamp, author: uid, operation });
    tx.set(working ? draftRef : ref, data);
    if (!working && draft) tx.delete(draftRef);
    return { working, revision: data.revision, expected: working ? expected : `r:${data.revision}`, draftExpected: working ? `r:${data.revision}` : '' };
  });
}

export function recoveryKey(uid, id, session) { return `takpilmo:editor:${uid}:${id}:${session}`; }
export async function deleteDocument(f, db, { id, expected, draftExpected, uid }) {
  const articleRef=f.doc(db,'infoArticles',id), draftRef=f.doc(db,'articleDrafts',id);
  const articleHistory=f.doc(f.collection(db,'adminHistory')), draftHistory=f.doc(f.collection(db,'adminHistory'));
  return f.runTransaction(db,async tx=>{
    const articleSnap=await tx.get(articleRef), draftSnap=await tx.get(draftRef);
    const article=articleSnap.exists()?articleSnap.data():null, draft=draftSnap.exists()?draftSnap.data():null;
    // An already completed deletion is safe to retry after an uncertain network result.
    if(!article && !draft)return;
    if(versionOf(article)!==expected || versionOf(draft)!==draftExpected)throw Object.assign(new Error('다른 탭에서 변경됐어요. 최신 글을 다시 확인한 뒤 삭제해 주세요.'),{code:'conflict'});
    const savedAt=f.serverTimestamp();
    for(const [snapshot,kind,ref] of [[article,'article',articleHistory],[draft,'draft',draftHistory]]){
      if(snapshot)tx.set(ref,{articleId:id,kind,snapshot,savedAt,author:uid,operation:'delete'});
    }
    tx.delete(articleRef);
    if(draft)tx.delete(draftRef);
  });
}
export function storeRecovery(storage, key, content) {
  storage.setItem(key, JSON.stringify({ content, savedAt: Date.now() }));
}
export function findRecovery(storage, uid, id) {
  const prefix = `takpilmo:editor:${uid}:${id}:`;
  const entries = [];
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (!key?.startsWith(prefix)) continue;
    try { const value = JSON.parse(storage.getItem(key)); if (value?.content) entries.push({ ...value, key }); } catch { /* Ignore corrupt local records. */ }
  }
  return entries.sort((a, b) => b.savedAt - a.savedAt);
}
