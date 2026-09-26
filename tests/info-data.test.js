import {beforeEach,test,expect,vi} from 'vitest';
import {SEED_ARTICLES} from '../js/info/seed.module.js';
const f=vi.hoisted(()=>({db:{},auth:{currentUser:{uid:'owner'}},collection:()=>({}),doc:(_db,_name,id)=>({id:id||'new'}),query:(...args)=>args,where:(...args)=>args,orderBy:(...args)=>args,limit:n=>n,getDocsFromServer:vi.fn(),getDocFromServer:vi.fn(),runTransaction:vi.fn(),serverTimestamp:()=>({server:true})}));
vi.mock('../js/info/firebase-client.module.js',()=>({client:()=>f}));
vi.mock('../js/info/firebase-auth.module.js',()=>({withAuth:async()=>f}));
beforeEach(()=>{vi.resetModules();vi.clearAllMocks();});
const item={...SEED_ARTICLES[0],status:'published',updatedAt:{seconds:2,nanoseconds:0}};
const snapshot=data=>({id:'one',exists:()=>true,data:()=>data});
test('concurrent reads merge, malformed items are omitted, later reads stay fresh',async()=>{
let release;f.getDocsFromServer.mockImplementationOnce(()=>new Promise(resolve=>release=resolve));
const api=await import('../js/info/data.module.js');const a=api.articles(),b=api.articles();
await vi.waitFor(()=>expect(f.getDocsFromServer).toHaveBeenCalledTimes(1));
release({size:2,docs:[snapshot(item),snapshot({...item,body:8})]});
const [x,y]=await Promise.all([a,b]);expect(x).toBe(y);expect(x).toHaveLength(1);expect(x.invalidCount).toBe(1);
f.getDocsFromServer.mockResolvedValue({size:0,docs:[]});expect(await api.articles()).toHaveLength(0);expect(f.getDocsFromServer).toHaveBeenCalledTimes(2);
});
test('failed read can be retried',async()=>{f.getDocsFromServer.mockRejectedValueOnce(Error('network')).mockResolvedValueOnce({size:0,docs:[]});const api=await import('../js/info/data.module.js');await expect(api.articles()).rejects.toThrow('network');expect(await api.articles()).toHaveLength(0);});
test('stale editor cannot overwrite another revision',async()=>{const tx={get:async()=>snapshot(item),set:vi.fn()};f.runTransaction.mockImplementation((_db,fn)=>fn(tx));const api=await import('../js/info/data.module.js');await expect(api.saveArticle('one',{...item,title:'changed'},false,'1:0')).rejects.toThrow('다른 창');expect(tx.set).not.toHaveBeenCalled();});
test('retry after a committed save recognizes identical content',async()=>{const tx={get:async()=>snapshot(item),set:vi.fn()};f.runTransaction.mockImplementation((_db,fn)=>fn(tx));f.getDocFromServer.mockResolvedValue(snapshot(item));const api=await import('../js/info/data.module.js');expect(await api.saveArticle('one',item,false,null)).toEqual({id:'one',updatedAt:item.updatedAt});expect(tx.set).not.toHaveBeenCalled();});
