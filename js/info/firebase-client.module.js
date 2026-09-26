import { getApps, getApp, initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, query, where, orderBy, limit, getDocsFromServer, getDocFromServer, runTransaction, serverTimestamp } from 'firebase/firestore';
import { firebaseConfig } from './firebase-config.module.js';
export function client() {
  if (!firebaseConfig.projectId || !firebaseConfig.apiKey) throw new Error('Firebase 연결 준비 중입니다. 관리자 설정 후 글을 공개합니다.');
  const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  return {app,db:getFirestore(app),collection,doc,query,where,orderBy,limit,getDocsFromServer,getDocFromServer,runTransaction,serverTimestamp};
}
