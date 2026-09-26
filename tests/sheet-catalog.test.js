import { describe,it,expect,vi,afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { normalizeCatalog,loadSheetCatalog,SHEET_API_URL,reuseIntroductions } from '../js/data/sheet-catalog.module.js';
const snapshot=JSON.parse(readFileSync('data/sheet-snapshot.json','utf8'));
afterEach(()=>{vi.unstubAllGlobals();delete window.ddakpilmo;});
describe('Topguna1.github.io sheet catalog integration',()=>{
  it('uses the corrected 160-row snapshot, multicategory rows and full details',()=>{
    const catalog=normalizeCatalog(snapshot);
    expect(catalog.sites).toHaveLength(160);expect(Object.keys(catalog.categories)).toHaveLength(13);
    expect(catalog.sites.find(s=>s.key==='EBSi').categories).toEqual(['learning','exam','schoolexam']);
    expect(catalog.sites.some(s=>s.key==='kimi')).toBe(true);
    expect(catalog.details.EBS.detailDesc).toContain('한국교육방송공사');
  });
  it('accepts blank enabled and sorts blank order last while hiding FALSE,0,n,no',()=>{
    const payload=structuredClone(snapshot);payload.sites=[...['','FALSE',0,'n','no'].map((enabled,i)=>({...payload.sites[0],key:'row'+i,enabled,sortOrder:''})),{...payload.sites[0],key:'first',sortOrder:2}];
    expect(normalizeCatalog(payload).sites.map(s=>s.key)).toEqual(['first','row0']);
  });
  it('refreshes from the live sheet every time and never fetches the old site JSON',async()=>{
    let calls=0;
    const fetchMock=vi.fn(async url=>({ok:true,json:async()=>url===SHEET_API_URL?{...snapshot,sites:[...snapshot.sites,{...snapshot.sites[0],key:'fresh'+(++calls)}]}:{tips:{}}}));
    vi.stubGlobal('fetch',fetchMock);await loadSheetCatalog();await loadSheetCatalog();
    expect(window.siteDataSource).toBe('google-sheets');expect(window.initialSites.some(s=>s.key==='fresh2')).toBe(true);
    expect(fetchMock.mock.calls.filter(([url])=>url===SHEET_API_URL)).toHaveLength(2);
    expect(fetchMock.mock.calls.some(([url])=>['data/sheet-snapshot.json'].includes(url))).toBe(false);
    expect(fetchMock.mock.calls[0][1].cache).toBe('no-store');
  });
  for(const value of [{items:{}},{error:'permission error'},null])it('falls back explicitly for invalid or unavailable sheet responses '+JSON.stringify(value),async()=>{
    vi.stubGlobal('fetch',vi.fn(async url=>({ok:url!==SHEET_API_URL||value!==null,status:403,json:async()=>url===SHEET_API_URL?value:url==='data/sheet-snapshot.json'?snapshot:{tips:{}}})));
    await loadSheetCatalog();expect(window.siteDataSource).toBe('snapshot');expect(window.initialSites).toHaveLength(160);expect(window.__sheetLoadError).toBeTruthy();
  });
});


it('keeps valid live rows and reports invalid rows without editing the source', () => {
  const payload=structuredClone(snapshot);
  payload.sites.push({...payload.sites[0],key:'broken',url:'javascript:alert(1)'});
  const catalog=normalizeCatalog(payload);
  expect(catalog.sites).toHaveLength(160);
  expect(catalog.warnings).toHaveLength(1);
  expect(catalog.warnings[0].key).toBe('broken');
  expect(payload.sites).toHaveLength(161);
  expect(()=>normalizeCatalog({...payload,sites:[payload.sites.at(-1)]})).toThrow('No enabled sheet sites');
});

it('reuses old introductions only for current sites without overwriting current facts or disabled details', () => {
  const catalog={sites:[{key:'old'},{key:'live'},{key:'hidden'},{key:'disabled-old'}],details:{old:{detailDesc:'  ',fee:'현재 요금'},live:{detailDesc:'최신 소개'}},disabledDetailKeys:['hidden']};
  const legacy={old:{detailDesc:'기존 소개\n  둘째 줄',fee:'옛 요금',verifiedAt:'2020-01-01'},live:{detailDesc:'이전 소개'},hidden:{detailDesc:'숨긴 소개'},'disabled-old':{detailDesc:'사용 안 함',enabled:false},removed:{detailDesc:'삭제된 사이트'}};
  reuseIntroductions(catalog,legacy);
  expect(catalog.details.old).toEqual({detailDesc:'기존 소개\n  둘째 줄',fee:'현재 요금'});
  expect(catalog.details.live.detailDesc).toBe('최신 소개');
  expect(catalog.details.hidden).toBeUndefined();
  expect(catalog.details['disabled-old']).toBeUndefined();
  expect(catalog.details.removed).toBeUndefined();
});

it('loads saved introductions even when the live catalog already has tips', async () => {
  const live={...snapshot,details:[],tips:{}};
  const legacy=JSON.parse(readFileSync('data/site-introductions.json','utf8'));
  live.tips={unused:true};
  vi.stubGlobal('fetch',vi.fn(async url=>({ok:true,json:async()=>url===SHEET_API_URL?live:legacy})));
  await loadSheetCatalog();
  expect(window.siteDataSource).toBe('google-sheets');
  expect(window.siteDetailMap.EBS.detailDesc).toBe(legacy.EBS.detailDesc);
  expect(window.initialSites).toHaveLength(snapshot.sites.length);
});
