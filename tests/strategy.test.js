import { beforeEach, describe, expect, it } from 'vitest';
import { installSearchEngine } from '../js/search/filter-engine.module.js';
import { createViews } from '../js/hub/views.module.js';
import { TASK_GUIDES } from '../js/info/task-guides.module.js';
const sites = [
  {key:'KOSIS',name:'국가통계포털',desc:'통계 데이터',category:'info',ages:['mid','high'],verifiedPublic:true},
  {key:'museum',name:'과학관',desc:'탐구 활동',category:'info',ages:['mid'],isGov:true},
  {key:'naver',name:'네이버',desc:'검색',category:'info',ages:['mid'],searchUses:'보고서 문헌 조사'}
];
beforeEach(() => { delete window.App; });
describe('task strategy regressions', () => {
  const cases = [['통계',['KOSIS']],['탐구',['museum']],['ㄴㅇㅂ',['naver']],['ㅌㄱ',['KOSIS','museum']],['보고서',['naver']],['없는단어',[]],['통계 데이터',['KOSIS']],['네이',['naver']],['NAVER',[]],[' 통계 ',['KOSIS']]];
  for (const [q, expected] of cases) it(`matches intended terms for ${q}`, () => {
    const search = installSearchEngine();
    expect(search.getFilteredSites({sites,currentSearchQuery:q,currentAgeFilter:'all',currentCategoryFilter:'all',currentSubjectFilter:'all',currentGovFilter:'all'}).map(s=>s.key)).toEqual(expected);
  });
  it('public filter excludes unverified legacy flags', () => {
    expect(installSearchEngine().getFilteredSites({sites,currentSearchQuery:'',currentAgeFilter:'all',currentCategoryFilter:'all',currentSubjectFilter:'all',currentGovFilter:'gov'}).map(s=>s.key)).toEqual(['KOSIS']);
  });
  it('preserves other conditions when relaxing school level', () => {
    const views = createViews({sites,categories:{info:{name:'참고자료'}},detail:()=>({}),saved:()=>false});
    const html=views.listResults({q:'통계',group:'research',category:'info',age:'mid',subject:'social',gov:'gov',page:1},[]);
    const document = new DOMParser().parseFromString(html,'text/html');
    const url = new URL(document.querySelector('a').getAttribute('href').slice(1),'https://example.com');
    expect(url.searchParams.get('q')).toBe('통계');expect(url.searchParams.get('age')).toBe('all');expect(url.searchParams.get('subject')).toBe('social');expect(url.searchParams.get('gov')).toBe('gov');
  });
  it('ships complete safe task articles using the existing article interface', () => {
    expect(TASK_GUIDES).toHaveLength(3);
    for(const item of TASK_GUIDES) {
      expect(item.title.trim()).not.toBe('');
      expect(item.body.trim()).not.toBe('');
      expect(item.sources.length).toBeGreaterThan(0);
      for(const source of item.sources) expect(source.url).toMatch(/^https?:\/\//);
    }
  });
});
