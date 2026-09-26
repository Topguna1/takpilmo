import {test,expect} from '@playwright/test';
import {writeFile,mkdir} from 'node:fs/promises';
test('1000 sites and 100 articles keep pagination and title-summary search usable',async({page})=>{
const sites=Array.from({length:1000},(_,i)=>({key:'s'+i,name:'자료 사이트 '+i,url:'https://example.com/'+i,desc:'학습 자료',category:'learning',ages:['high'],subjects:['general']}));
await page.route('**/script.google.com/**',r=>r.fulfill({json:{categories:{learning:{name:'학습'}},sites,details:{}}}));
await page.route('https://www.google.com/s2/**',r=>r.abort());
await page.route('**/js/info/data.module.js',r=>r.fulfill({contentType:'text/javascript',body:"export async function articles(){return Array.from({length:100},(_,i)=>({id:'a'+i,title:'정보 제목 '+i,summary:i===99?'특별한 요약':'일반 요약',body:'본문',category:'학습 정보',siteKeys:[],sources:[],status:'published'}));}"}));
const start=Date.now();await page.goto('/#/sites');await expect(page.locator('#filteredCount')).toHaveText('1000개');await expect(page.locator('.site-card')).toHaveCount(12);const loadMs=Date.now()-start;
const search=Date.now();await page.locator('#searchInput').fill('자료 사이트 999');await expect(page).toHaveURL(/q=/);await expect(page.locator('.site-card').first()).toContainText('999');const searchMs=Date.now()-search;
const info=Date.now();await page.goto('/#/info');await expect(page.locator('.info-card')).toHaveCount(12);const infoMs=Date.now()-info;
await page.getByRole('link',{name:'다음',exact:true}).click();await expect(page.locator('.info-pagination')).toContainText('2 / 9');
const link=page.locator('.info-card').first();await link.focus();
await page.getByLabel('정보 글 검색').fill('특별한 요약');await page.locator('#infoSearch button').click();await expect(page.locator('.info-card')).toHaveCount(1);await expect(page.locator('.info-card')).toContainText('정보 제목 99');
await mkdir('test-results',{recursive:true});await writeFile('test-results/performance.json',JSON.stringify({environment:'local Chromium, mocked network, one sample, includes automation waits',sites:1000,articles:100,loadMs,searchMs,infoMs},null,2));
});
