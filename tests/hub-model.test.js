import { describe,it,expect } from 'vitest';
import { mergedDetail,operatorLabel,filterSites,listState,safeUrl,consolidateSites } from '../js/hub/model.module.js';
describe('hub model',()=>{
  it('keeps local verified fields when old remote content is blank',()=>{
    const d=mergedDetail({fee:'무료',operatorType:'public',verifiedAt:'2026-01-01',sourceUrl:'https://example.org'},{fee:' ',features:[],summary:'새 설명'});
    expect(d.fee).toBe('무료');expect(d.summary).toBe('새 설명');expect(operatorLabel(d)).toBe('공공기관 운영');
    expect(operatorLabel({operatorType:'government'})).toBe('');expect(safeUrl('javascript:alert(1)')).toBe('');
  });
  it('deduplicates multi-category results and applies school and query through search',()=>{
    const sites=[{key:'a',name:'A',category:'learning'},{key:'a',name:'A',category:'reading'},{key:'b',name:'B',category:'ppt'}];
    expect(filterSites(sites,{group:'study',category:'all',q:''},s=>s.sites)).toHaveLength(1);
    const merged=consolidateSites([{...sites[0],ages:['elem']},{...sites[1],ages:['high']}]);
    expect(merged).toHaveLength(1);expect(merged[0].categories).toEqual(['learning','reading']);expect(merged[0].ages).toEqual(['elem','high']);
  });
  it('normalizes incompatible categories and invalid page numbers',()=>{
    const s=listState(new URLSearchParams('group=study&category=ppt&page=-2&age=other'),{ppt:{}});
    expect(s.category).toBe('all');expect(s.page).toBe(1);expect(s.age).toBe('all');
  });
});


describe('shared URL validation', () => {
  it('rejects inherited object names as selectable keys', () => {
    for (const key of ['constructor','__proto__','toString']) {
      const state=listState(new URLSearchParams(`group=${key}&category=${key}&age=${key}&subject=${key}`),{});
      expect([state.group,state.category,state.age,state.subject]).toEqual(['all','all','all','all']);
    }
  });
});
