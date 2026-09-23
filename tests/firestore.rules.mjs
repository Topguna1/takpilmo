import { readFileSync } from 'node:fs';
import { after, before, test } from 'node:test';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, getDoc, getDocs, collection, query, where, setDoc, updateDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
let env;
const content = status => ({title:'검증 글',summary:'요약',body:'본문',category:'학습 정보',siteKeys:['RISS'],sources:[{label:'출처',url:'https://www.riss.kr',checkedAt:'2026-09-22'}],status,createdAt:serverTimestamp(),updatedAt:serverTimestamp(),publishedAt:status === 'published' ? serverTimestamp() : null});
before(async () => {
  env = await initializeTestEnvironment({projectId:'demo-ddakpilmo',firestore:{rules:readFileSync('firestore.rules','utf8')}});
  await env.withSecurityRulesDisabled(async context => {
    const db = context.firestore();
    await setDoc(doc(db,'admins','owner'),{enabled:true});
    await setDoc(doc(db,'infoArticles','public'),content('published'));
    await setDoc(doc(db,'infoArticles','draft'),content('draft'));
  });
});
after(async () => { await env?.cleanup(); });
test('visitors can only read published documents and constrained queries',async () => {
  for(const context of [env.unauthenticatedContext(),env.authenticatedContext('reader')]) {
    const db = context.firestore();
    await assertSucceeds(getDoc(doc(db,'infoArticles','public')));
    await assertSucceeds(getDocs(query(collection(db,'infoArticles'),where('status','==','published'))));
    await assertFails(getDoc(doc(db,'infoArticles','draft')));
    await assertFails(getDocs(collection(db,'infoArticles')));
    await assertFails(setDoc(doc(db,'infoArticles','attack'),content('published')));
    await assertFails(updateDoc(doc(db,'infoArticles','public'),{title:'변조'}));
  }
});
test('accounts cannot grant themselves admin or enumerate admins',async () => {
  const db = env.authenticatedContext('reader').firestore();
  await assertSucceeds(getDoc(doc(db,'admins','reader')));
  await assertFails(setDoc(doc(db,'admins','reader'),{enabled:true}));
  await assertFails(getDoc(doc(db,'admins','owner')));
  await assertFails(getDocs(collection(db,'admins')));
});
test('admin can publish and unpublish while timestamps and validation are enforced',async () => {
  const db = env.authenticatedContext('owner').firestore();
  await assertSucceeds(getDocs(collection(db,'infoArticles')));
  const ref = doc(db,'infoArticles','new');
  await assertSucceeds(setDoc(ref,content('draft')));
  await assertSucceeds(updateDoc(ref,{status:'published',publishedAt:serverTimestamp(),updatedAt:serverTimestamp()}));
  await assertSucceeds(updateDoc(ref,{status:'draft',updatedAt:serverTimestamp()}));
  await assertFails(updateDoc(ref,{status:'published',sources:[],updatedAt:serverTimestamp()}));
  await assertFails(updateDoc(ref,{title:'',updatedAt:serverTimestamp()}));
  await assertFails(updateDoc(ref,{createdAt:Timestamp.fromMillis(1),updatedAt:serverTimestamp()}));
  await assertFails(updateDoc(ref,{siteKeys:['a','b','c','d'],updatedAt:serverTimestamp()}));
  await assertFails(setDoc(doc(db,'admins','other'),{enabled:true}));
});
