import { readFileSync } from 'node:fs';
import { rejects } from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, getDoc, getDocs, collection, query, where, setDoc, updateDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import * as firestoreApi from 'firebase/firestore';
import { saveDocument, deleteDocument, versionOf } from '../js/admin/persistence.module.js';
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
  await assertSucceeds(updateDoc(ref,{title:'',updatedAt:serverTimestamp()}));
  await assertFails(updateDoc(ref,{status:'published',title:'',updatedAt:serverTimestamp()}));
  await assertFails(updateDoc(ref,{createdAt:Timestamp.fromMillis(1),updatedAt:serverTimestamp()}));
  await assertFails(updateDoc(ref,{siteKeys:['a','b','c','d'],updatedAt:serverTimestamp()}));
  await assertFails(setDoc(doc(db,'admins','other'),{enabled:true}));
});
const tip = extra => ({...content('draft'),category:'팁·따라하기',sources:[],blocks:[{type:'text',text:'안녕'},{type:'youtube',url:'https://youtu.be/dQw4w9WgXcQ',caption:''}],tags:['공부'],thumbnail:'https://example.com/a.jpg',difficulty:'쉬움',minutes:5,...extra});
test('admin can write block-based tips, tip category may publish without sources',async () => {
  const db = env.authenticatedContext('owner').firestore();
  const ref = doc(db,'infoArticles','tip');
  await assertSucceeds(setDoc(ref,tip()));
  await assertSucceeds(updateDoc(ref,{status:'published',publishedAt:serverTimestamp(),updatedAt:serverTimestamp()}));
  await assertSucceeds(updateDoc(ref,{status:'archived',updatedAt:serverTimestamp()}));
  await assertSucceeds(setDoc(doc(db,'infoArticles','tip-no-body'),tip({body:''})));
});
test('block-based fields stay bounded and non-tip categories still need sources',async () => {
  const db = env.authenticatedContext('owner').firestore();
  await assertSucceeds(setDoc(doc(db,'infoArticles','x1'),tip({body:'',blocks:[]})));
  await assertFails(setDoc(doc(db,'infoArticles','x1public'),tip({body:'',blocks:[],status:'published',publishedAt:serverTimestamp()})));
  await assertFails(setDoc(doc(db,'infoArticles','x2'),tip({blocks:Array.from({length:61},() => ({type:'text',text:'a'}))})));
  await assertFails(setDoc(doc(db,'infoArticles','x3'),tip({tags:Array.from({length:9},(_,i) => `t${i}`)})));
  await assertFails(setDoc(doc(db,'infoArticles','x4'),tip({difficulty:'극악'})));
  await assertFails(setDoc(doc(db,'infoArticles','x5'),tip({minutes:-1})));
  await assertFails(setDoc(doc(db,'infoArticles','x6'),tip({unknownField:1})));
  await assertFails(setDoc(doc(db,'infoArticles','x7'),tip({category:'기타'})));
  const ref = doc(db,'infoArticles','x8');
  await assertSucceeds(setDoc(ref,tip({category:'학습 정보'})));
  await assertFails(updateDoc(ref,{status:'published',publishedAt:serverTimestamp(),updatedAt:serverTimestamp()}));
});
test('archived and draft articles stay hidden from visitors',async () => {
  const visitor = env.unauthenticatedContext().firestore();
  await assertFails(getDoc(doc(visitor,'infoArticles','tip')));
  await assertFails(getDoc(doc(visitor,'infoArticles','tip-no-body')));
});
test('real transactional editor preserves metadata, drafts, history and detects conflicts',async () => {
  const db=env.authenticatedContext('owner').firestore();
  const plain=tip({body:'',status:'published',sources:Array.from({length:10},()=>({label:'출처',url:'https://example.com',checkedAt:'2026-11-07'})),siteKeys:['a','b','c'],blocks:Array.from({length:60},()=>({type:'text',text:'내용'})),tags:Array(8).fill('tag')});
  for(const key of ['createdAt','updatedAt','publishedAt'])delete plain[key];
  const base={id:'editor-transaction',content:plain,expected:'',draftExpected:'',working:false,uid:'owner',operation:'save'};
  let result=await saveDocument(firestoreApi,db,base);
  const ref=doc(db,'infoArticles',base.id);
  const first=(await getDoc(ref)).data();
  const draftResult=await saveDocument(firestoreApi,db,{...base,content:{...plain,title:'working',status:'draft'},expected:result.expected,working:true,operation:'draft'});
  if((await getDoc(ref)).data().title==='working')throw Error('draft changed public article');
  result=await saveDocument(firestoreApi,db,{...base,content:{...plain,title:'updated'},expected:result.expected,draftExpected:draftResult.draftExpected});
  const last=(await getDoc(ref)).data();
  if(!first.createdAt.isEqual(last.createdAt) || !first.publishedAt.isEqual(last.publishedAt))throw Error('metadata changed');
  if(versionOf(last)!==result.expected)throw Error('wrong returned version');
  await rejects(saveDocument(firestoreApi,db,{...base,expected:draftResult.expected}),{code:'conflict'});
  await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(),'articleDrafts',base.id)));
  const history=await getDocs(query(collection(db,'adminHistory'),where('articleId','==',base.id)));
  if(history.empty)throw Error('missing atomic history');
  await assertFails(getDocs(collection(env.authenticatedContext('reader').firestore(),'adminHistory')));
});
test('disabled admins cannot write, incomplete drafts remain private',async () => {
  await env.withSecurityRulesDisabled(async c=>setDoc(doc(c.firestore(),'admins','disabled'),{enabled:false}));
  await assertFails(setDoc(doc(env.authenticatedContext('disabled').firestore(),'infoArticles','disabled'),tip()));
  const db=env.authenticatedContext('owner').firestore();
  await assertSucceeds(setDoc(doc(db,'articleDrafts','unfinished'),tip({title:'',summary:'',body:'',blocks:[{type:'image',url:'',alt:'',caption:''}]})));
  await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(),'articleDrafts','unfinished')));
  await assertFails(updateDoc(doc(db,'articleDrafts','unfinished'),{status:'published',updatedAt:serverTimestamp()}));
});
test('retrying an acknowledged operation does not create another version',async () => {
  const db=env.authenticatedContext('owner').firestore();
  const plain=tip();for(const key of ['createdAt','updatedAt','publishedAt'])delete plain[key];
  const args={id:'idempotent',content:plain,expected:'',draftExpected:'',working:false,uid:'owner',operation:'save',operationId:'test-operation'};
  const first=await saveDocument(firestoreApi,db,args);
  const again=await saveDocument(firestoreApi,db,args);
  if(first.revision!==again.revision)throw Error('duplicate commit');
});
test('production source and site-key safeguards are retained',async () => {
  const db=env.authenticatedContext('owner').firestore();
  await assertSucceeds(setDoc(doc(db,'infoArticles','production-max'),tip({status:'published',publishedAt:serverTimestamp(),sources:Array.from({length:10},()=>({label:'출처',url:'https://example.com',checkedAt:'2026-11-07'})),siteKeys:['a','b','c'],blocks:Array.from({length:60},()=>({type:'text',text:'내용'})),tags:Array(8).fill('tag')})));
  for(const [key,value] of Object.entries({duplicate:{siteKeys:['RISS','RISS']},object:{siteKeys:[{}]},long:{siteKeys:['x'.repeat(201)]},source:{status:'published',publishedAt:serverTimestamp(),sources:[{label:'x',url:'javascript:bad',checkedAt:'2026-11-07'}]},extra:{sources:[{label:'x',url:'https://example.com',checkedAt:'2026-11-07',extra:'x'}]}})) {
    await assertFails(setDoc(doc(db,'infoArticles','production-'+key),tip(value)));
  }
});
test('attackers cannot self-promote or read/write private collections with forged role claims',async () => {
  for(const context of [env.unauthenticatedContext(),env.authenticatedContext('reader'),env.authenticatedContext('pretender',{admin:true,role:'admin'})]){
    const db=context.firestore();
    await assertFails(getDocs(collection(db,'admins')));
    await assertFails(setDoc(doc(db,'admins','pretender'),{enabled:true,role:'admin'}));
    await assertFails(updateDoc(doc(db,'admins','owner'),{enabled:false}));
    await assertFails(getDoc(doc(db,'infoArticles','draft')));
    await assertFails(getDocs(query(collection(db,'articleDrafts'),where('status','==','draft'))));
    await assertFails(getDocs(collection(db,'adminHistory')));
    await assertFails(setDoc(doc(db,'infoArticles','attempt'),tip()));
    await assertFails(setDoc(doc(db,'articleDrafts','attempt'),tip()));
    await assertFails(setDoc(doc(db,'adminHistory','attempt'),{articleId:'draft',kind:'article',snapshot:{},savedAt:serverTimestamp(),author:'owner',operation:'save'}));
  }
});

test('only enabled admins can delete articles and deletion atomically clears drafts with audit history',async () => {
  const db=env.authenticatedContext('owner').firestore();
  for(const status of ['draft','published','archived']){
    const id='delete-'+status, ref=doc(db,'infoArticles',id), draftRef=doc(db,'articleDrafts',id);
    await setDoc(ref,content(status));
    await setDoc(draftRef,content('draft'));
    for(const context of [env.unauthenticatedContext(),env.authenticatedContext('reader'),env.authenticatedContext('disabled'),env.authenticatedContext('pretender',{admin:true})]){
      await assertFails(firestoreApi.deleteDoc(doc(context.firestore(),'infoArticles',id)));
      await assertFails(firestoreApi.deleteDoc(doc(context.firestore(),'articleDrafts',id)));
    }
    const args={id,expected:versionOf((await getDoc(ref)).data()),draftExpected:versionOf((await getDoc(draftRef)).data()),uid:'owner'};
    await rejects(deleteDocument(firestoreApi,db,{...args,expected:'stale'}),{code:'conflict'});
    await updateDoc(draftRef,{revision:2,updatedAt:serverTimestamp()});
    await rejects(deleteDocument(firestoreApi,db,args),{code:'conflict'});
    if(!(await getDoc(ref)).exists())throw Error('conflict deleted article');
    await deleteDocument(firestoreApi,db,{...args,draftExpected:versionOf((await getDoc(draftRef)).data())});
    if((await getDoc(ref)).exists() || (await getDoc(draftRef)).exists())throw Error('incomplete deletion');
    const history=await getDocs(query(collection(db,'adminHistory'),where('articleId','==',id)));
    if(history.size!==2 || history.docs.some(d=>d.data().operation!=='delete'))throw Error('missing deletion history');
    await assertFails(firestoreApi.deleteDoc(history.docs[0].ref));
    await deleteDocument(firestoreApi,db,args);
  }
});
