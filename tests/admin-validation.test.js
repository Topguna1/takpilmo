import { describe, it, expect } from 'vitest';
import { validateArticle, convertLegacy } from '../js/admin/validation.module.js';
import { findRecovery, storeRecovery, recoveryKey } from '../js/admin/persistence.module.js';
const draft = () => ({title:'',summary:'',body:'',blocks:[],tags:[],siteKeys:[],sources:[],thumbnail:'',minutes:0,category:'팁·따라하기'});
describe('lossless authoring', () => {
  it('keeps incomplete blocks in drafts but rejects publishing them', () => {
    const d={...draft(),blocks:[{type:'image',url:'',alt:'',caption:''}]};
    expect(validateArticle(d)).toEqual([]);
    d.blocks[0].url='https://';expect(validateArticle(d)).toEqual([]);
    expect(validateArticle(d,true).length).toBeGreaterThan(0);
  });
  it('rejects rather than truncating long text, callouts and tags', () => {
    for(const [type,length] of [['text',20001],['callout',1001]]) {
      const d={...draft(),blocks:[{type,text:'가'.repeat(length)}]};
      expect(validateArticle(d).length).toBeGreaterThan(0);
      expect(d.blocks[0].text).toHaveLength(length);
    }
    expect(validateArticle({...draft(),tags:Array(9).fill('x')})).not.toEqual([]);
  });
  it('splits legacy paragraphs without changing a character', () => {
    const body=('가'.repeat(9000)+'\n\n').repeat(5);
    const blocks=convertLegacy(body);
    expect(blocks.map(b=>b.text).join('')).toBe(body);
    expect(blocks.every(b=>b.text.length<=20000)).toBe(true);
    expect(()=>convertLegacy('x'.repeat(20001))).toThrow();
    expect(()=>convertLegacy('text',Array(60).fill({type:'text',text:'x'}))).toThrow();
  });
  it('isolates recovery by account and keeps different tab records', () => {
    localStorage.clear();
    storeRecovery(localStorage,recoveryKey('a','new','one'),draft());
    storeRecovery(localStorage,recoveryKey('a','new','two'),{...draft(),title:'two'});
    expect(findRecovery(localStorage,'a','new')).toHaveLength(2);
    expect(findRecovery(localStorage,'b','new')).toEqual([]);
  });
});
