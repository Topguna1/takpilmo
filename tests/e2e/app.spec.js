import { expect,test } from '@playwright/test';
const categories={learning:{name:'온라인강의'},reading:{name:'독서'},info:{name:'참고자료'},ppt:{name:'발표'},career:{name:'진로'}};
const sites=Array.from({length:25},(_,i)=>({key:`alpha-${i+1}`,name:`Alpha ${i+1}`,url:`https://alpha${i+1}.example.com`,desc:`학습 자료 ${i+1}`,category:'learning',ages:['elem'],subjects:['math'],sortOrder:i+1})).concat([
  {key:'naver',name:'네이버',url:'https://naver.com',desc:'대표 포털',category:'info',ages:['mid'],subjects:['general']},
  {key:'RISS',name:'RISS',url:'https://www.riss.kr',desc:'국내 학술 자료 검색',category:'info',ages:['high'],subjects:['general'],isGov:true},
  {key:'GoogleScholar',name:'Google Scholar',url:'https://scholar.google.com',desc:'논문 검색',category:'info',ages:['high'],subjects:['general']}
]);
test.beforeEach(async({page})=>{
  await page.route('**/js/info/firebase-config.module.js', r=>r.fulfill({contentType:'application/javascript',body:'export const firebaseConfig = {};'}));
  await page.route('**/data/categories.json',r=>r.fulfill({json:categories}));
  await page.route('**/data/sites.json',r=>r.fulfill({json:sites}));
  await page.route('**/script.google.com/**',r=>r.fulfill({json:{categories,sites,details:{}}}));
  await page.route('**/data/sheet-snapshot.json',r=>r.fulfill({json:{categories,sites,details:{}}}));
  await page.route('https://www.google.com/s2/**',r=>r.abort());
});
async function ready(page,hash='') { await page.goto(`/index.html${hash}`);await page.waitForFunction(()=>!!window.ddakpilmo?.hub); }

test('home offers two entrances and search preserves Korean input, autocomplete and IME',async({page})=>{
  await ready(page);await expect(page.locator('.entry')).toHaveCount(2);await expect(page.locator('.site-card')).toHaveCount(0);
  await page.locator('#homeSearch').fill('네이버');await page.locator('#homeSearch').press('Enter');
  await expect(page.locator('#searchInput')).toHaveValue('네이버');await expect(page.locator('.site-card')).toHaveCount(1);
  await page.locator('#searchInput').fill('ㄴㅇㅂ');await expect(page.locator('.site-card')).toHaveCount(1);
  await page.locator('#searchInput').press('ArrowDown');await page.locator('#searchInput').press('Enter');await expect(page.locator('#searchInput')).toHaveValue('네이버');
  await page.locator('#searchInput').evaluate(input=>{
    input.dispatchEvent(new CompositionEvent('compositionstart',{bubbles:true}));input.value='네';
    input.dispatchEvent(new InputEvent('input',{bubbles:true,isComposing:true}));
  });
  await expect(page).toHaveURL(/q=/);
  await page.locator('#searchInput').evaluate(input=>{
    input.value='네이버';input.dispatchEvent(new CompositionEvent('compositionend',{bubbles:true,data:'버'}));
  });
  await expect(page.locator('#filteredCount')).toHaveText('1개');await expect(page.locator('#searchInput')).toBeFocused();
});

test('flat pagination, filters and detail restore URL, scroll and focus',async({page})=>{
  await ready(page,'#/sites?group=study&age=elem&subject=math&page=2');
  await expect(page.locator('.site-card')).toHaveCount(12);await expect(page.locator('.site-card').first()).toContainText('Alpha 13');
  const link=page.locator('.site-card').nth(4).getByText('상세정보 →');await link.scrollIntoViewIfNeeded();await link.focus();
  const y=await page.evaluate(()=>scrollY);await link.click();
  await expect(page.locator('h1')).toHaveText('Alpha 17');await expect(page.locator('.summary-card')).toContainText('미확인');
  await page.locator('[data-return]').click();await expect(page).toHaveURL(/page=2/);await expect(link).toBeFocused();
  await expect.poll(()=>page.evaluate(()=>scrollY)).toBeCloseTo(y,0);
  await page.locator('#ageFilter').selectOption('mid');await expect(page).toHaveURL(/page=1/);await expect(page.locator('#filteredCount')).toHaveText('0개');
});

test('filter dialog cancellation and bookmark legacy persistence',async({page})=>{
  await page.addInitScript(()=>localStorage.setItem('ddakpilmo.retention.bookmarks.v1',JSON.stringify(['alpha-1'])));
  await ready(page,'#/sites');await page.locator('[data-panel=filters]').click();await page.locator('#panel select[name=gov]').selectOption('gov');await page.getByRole('button',{name:'취소',exact:true}).click();
  await expect(page.locator('#filteredCount')).toHaveText('28개');
  await page.locator('[data-save="alpha-1"]').click();await expect(page.locator('[data-save="alpha-1"]')).toHaveAttribute('aria-pressed','false');
  await page.locator('[data-save="alpha-2"]').click();await page.locator('[data-nav=collection]').click();
  await expect(page.locator('.site-card')).toHaveCount(1);await expect(page.locator('.site-card')).toContainText('Alpha 2');
  await page.locator('.site-card [data-detail]').first().click();await expect(page.locator('.summary-card [data-save]')).toHaveAttribute('aria-pressed','true');
  await page.locator('[data-return]').click();await expect(page).toHaveURL(/saved-sites/);
  await page.locator('a[href="#/recent-sites"]').click();await expect(page.locator('.site-card')).toContainText('Alpha 2');
});



test('legacy guide links, invalid routes and direct detail remain usable',async({page})=>{
  await ready(page,'#/tips?tab=utility');await expect(page).toHaveURL(/#\/info\?moved=1/);
  await ready(page,'#/tips/guide/ppt-tip');await expect(page).toHaveURL(/#\/info\?moved=1/);
  await ready(page,'#site=RISS');await expect(page.locator('h1')).toHaveText('RISS');await expect(page.locator('.detail-body')).toContainText('재확인 필요');await expect(page.locator('.summary-card')).not.toContainText('공공기관 운영');
  await page.locator('[data-return]').click();await expect(page).toHaveURL(/#\/sites$/);
  await ready(page,'#site=%ZZ');await expect(page.locator('.empty')).toContainText('찾을 수 없습니다');
  await ready(page,'#/unknown');await expect(page.locator('.empty')).toContainText('존재하지 않는');
});

test('remote failure falls back, storage failure is reported, settings persist',async({page})=>{
  await page.route('**/script.google.com/**',r=>r.abort());await ready(page,'#/sites');await expect(page.locator('.site-card')).toHaveCount(12);
  await page.locator('#settingsOpen').click();await page.locator('[data-pref=siteTheme][data-value=dark]').click();await page.locator('[data-pref=siteFontSize][data-value=large]').click();await page.keyboard.press('Escape');
  await expect(page.locator('body')).toHaveClass(/dark/);await page.reload();await page.waitForFunction(()=>!!window.ddakpilmo?.hub);await expect(page.locator('body')).toHaveClass(/font-large/);
  await page.evaluate(()=>{Storage.prototype.setItem=()=>{throw new Error('full');};});await page.locator('[data-save]').first().click();await expect(page.locator('#notice')).toContainText('저장하지 못했습니다');
});

for(const width of [390,768,1440,1920])test(`responsive pages have no overflow at ${width}px`,async({page})=>{
  await page.setViewportSize({width,height:1000});await ready(page);
  for(const hash of ['#/','#/sites','#site=RISS','#/guide','#/guide/result?purpose=papers&age=high&subject=all&topic=기후변화','#/saved-sites','#/tips?tab=utility']){
    await page.evaluate(h=>location.hash=h,hash);await page.waitForTimeout(100);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await page.evaluate(()=>document.body.classList.add('font-large'));expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.evaluate(()=>document.body.classList.remove('font-large'));
    if([390,1440].includes(width)&&['#/','#/sites','#site=RISS','#/guide/result?purpose=papers&age=high&subject=all&topic=기후변화'].includes(hash)) await page.screenshot({path:`test-results/screens/${width}-${hash==='#/'?'home':hash.startsWith('#site')?'detail':hash.startsWith('#/guide')?'guide':'sites'}.png`,fullPage:true});
  }
  await page.evaluate(()=>document.body.classList.add('font-large'));expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});



test('verified local detail survives empty remote fields and large text remains readable',async({page})=>{
  await page.route('**/data/site-details.json',r=>r.fulfill({json:{RISS:{summary:'확인된 용도 설명',useCases:['과제의 참고문헌을 찾을 때'],features:['서지 정보 검색'],fee:'일부 유료',operatorType:'public',operatorName:'예시 운영기관',sourceUrl:'https://example.org/source',verifiedAt:'2026-01-01'}}}));
  await page.route('**/script.google.com/**',r=>r.fulfill({json:{categories,sites,details:{bySiteKey:{RISS:{fee:'',features:[],detailDesc:'원격 소개'}}}}}));
  await ready(page,'#site=RISS');await expect(page.locator('.summary-card')).toContainText('일부 유료');await expect(page.locator('.detail-heading')).toContainText('공공기관 운영');await expect(page.locator('.detail-body')).toContainText('서지 정보 검색');
  await page.setViewportSize({width:390,height:1000});
  for(const hash of ['#/','#/sites','#/guide','#site=RISS']){
    await page.evaluate(h=>location.hash=h,hash);await page.waitForTimeout(80);await page.evaluate(()=>document.body.style.fontSize='32px');
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  }
});


test('detail alignment, introduction whitespace and floating settings dismissal', async ({page}) => {
  await page.route('**/script.google.com/**', r => r.fulfill({json:{categories,sites,details:{RISS:{detailDesc:'첫 문장\n    들여쓴 문장\n\t탭 문장'}}}}));
  await page.setViewportSize({width:1440,height:1000});
  await ready(page,'#site=RISS');
  const logo = await page.locator('.detail-heading .favicon').boundingBox();
  const summary = await page.locator('.summary-card').boundingBox();
  expect(Math.abs(logo.y-summary.y)).toBeLessThan(1);
  await expect(page.locator('.site-introduction')).toHaveCSS('white-space','pre-wrap');
  expect(await page.locator('.site-introduction').textContent()).toContain('\n    들여쓴 문장');
  await page.locator('#settingsOpen').click();
  await expect(page.locator('#settingsOpen')).toHaveAttribute('aria-expanded','true');
  await page.locator('[data-pref=siteTheme][data-value=dark]').click();
  await expect(page.locator('[data-pref=siteTheme][data-value=dark]')).toHaveAttribute('aria-pressed','true');
  await page.mouse.click(20,200);
  await expect(page.locator('#panel')).not.toBeVisible();
  await expect(page.locator('#settingsOpen')).toBeFocused();
  await page.locator('#settingsOpen').click();
  await page.locator('[data-reset-settings]').click();
  await expect(page.locator('body')).not.toHaveClass(/dark/);
  await page.setViewportSize({width:390,height:700});
  const box = await page.locator('#panel').boundingBox();
  expect(box.x).toBeGreaterThanOrEqual(0);expect(box.x+box.width).toBeLessThanOrEqual(390);
  await page.screenshot({path:'test-results/screens/settings-mobile.png'});
  await page.keyboard.press('Escape');
});


test('malformed shared routes remain navigable and retired guides redirect', async ({page}) => {
  const errors=[];page.on('pageerror', e=>errors.push(e.message));
  await ready(page,'#/sites?group=constructor&age=toString');
  await expect(page.locator('.site-card')).toHaveCount(12);
  await ready(page,'#/guide/result?purpose=__proto__&age=high&subject=math');
  await expect(page).toHaveURL(/#\/info\?moved=1/);expect(errors).toEqual([]);
});

test('autocomplete clears stale selection and filters retain keyboard focus', async ({page}) => {
  await ready(page,'#/sites');
  const search=page.locator('#searchInput');
  await search.fill('Alpha');await search.press('ArrowDown');
  await expect(search).toHaveAttribute('aria-activedescendant','suggestion-0');
  await search.fill('RISS');await expect(search).not.toHaveAttribute('aria-activedescendant');
  await page.locator('#suggestions [role=option]').click();
  await expect(search).toHaveValue('RISS');await expect(page.locator('#suggestions')).toBeHidden();
  await search.fill('');await page.locator('#ageFilter').selectOption('high');
  await expect(page.locator('#ageFilter')).toBeFocused();
  await page.keyboard.press('Tab');await expect(page.locator('#subjectFilter')).toBeFocused();
});

test('total load failure persists across navigation and retry preserves saved records', async ({page}) => {
  await page.addInitScript(()=>localStorage.setItem('ddakpilmo.retention.bookmarks.v1',JSON.stringify(['RISS'])));
  await page.route('**/script.google.com/**',r=>r.abort());
  await page.route('**/data/sheet-snapshot.json',r=>r.abort());
  await page.goto('/index.html#/sites');await expect(page.locator('#retryLoad')).toBeVisible();
  await expect(page.locator('#main')).toHaveAttribute('aria-busy','false');
  await page.locator('[data-nav=collection]').click();await expect(page.locator('#retryLoad')).toBeVisible();
  await expect(page.locator('#main')).toContainText('저장한 사이트 기록은 그대로 유지됩니다');
  await page.route('**/script.google.com/**',r=>r.fulfill({json:{categories,sites,details:{}}}));
  await page.locator('#retryLoad').click();await expect(page.locator('.site-card')).toHaveCount(1);
  await expect(page.locator('.site-card')).toContainText('RISS');
});

test('pending data is not presented as empty results and invalid rows keep the live catalog', async ({page}) => {
  let release;const gate=new Promise(resolve=>release=resolve);
  await page.route('**/script.google.com/**',async r=>{await gate;await r.fulfill({json:{categories,sites:[...sites,{key:'broken',name:'broken',url:'invalid',category:'learning'}]}});});
  await page.goto('/index.html#/sites');
  await expect(page.locator('#main')).toHaveAttribute('aria-busy','true');
  await expect(page.locator('#main')).not.toContainText('조건에 맞는 사이트 0개');
  release();await expect(page.locator('.site-card')).toHaveCount(12);
  await expect(page.locator('.data-source-notice')).toContainText('1개 항목');
  expect(await page.evaluate(()=>window.siteDataSource)).toBe('google-sheets');
});


test('copy fallback is reusable and settings errors are announced inside the dialog', async ({page}) => {
  await ready(page,'#site=RISS');
  await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{value:{writeText:async()=>{throw new Error('denied');}},configurable:true}));
  await page.locator('[data-share]').click();await page.locator('[data-share]').click();
  await expect(page.locator('.share-fallback')).toHaveCount(1);
  await expect(page.locator('.share-fallback')).toHaveValue(/#site=RISS/);
  await page.locator('#settingsOpen').click();
  await page.evaluate(()=>{Storage.prototype.setItem=()=>{throw new Error('denied');};});
  await page.locator('[data-pref=siteTheme][data-value=dark]').click();
  await expect(page.locator('#panel [role=status]')).toContainText('설정을 저장하지 못했습니다');
  await expect(page.locator('[data-pref=siteTheme][data-value=light]')).toHaveAttribute('aria-pressed','true');
});

test('320px enlarged text keeps navigation, feedback and settings usable', async ({page}) => {
  await page.setViewportSize({width:320,height:720});await ready(page,'#/guide');

  await page.addStyleTag({content:'body {font-size:32px !important}'});
  for(const hash of ['#/','#/sites','#site=RISS','#/guide','#/saved-sites']) {
    await page.evaluate(h=>location.hash=h,hash);await page.waitForTimeout(80);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  }
  await page.evaluate(()=>location.hash='#site=RISS');await page.locator('.summary-card [data-save]').click();
  const notice=await page.locator('#notice').boundingBox(),gear=await page.locator('#settingsOpen').boundingBox();
  expect(notice.y+notice.height).toBeLessThan(gear.y);
  await page.locator('#settingsOpen').click();
  await page.locator('[data-reset-settings]').scrollIntoViewIfNeeded();await expect(page.locator('[data-reset-settings]')).toBeInViewport();
  expect(await page.locator('#panel').evaluate(e=>e.scrollWidth<=e.clientWidth)).toBe(true);
  await page.screenshot({path:'test-results/screens/audit-settings-enlarged.png'});
  await page.keyboard.press('Escape');await expect(page.locator('#settingsOpen')).toBeFocused();
});


test('overview renders new Sheets fields and separates signup age from recommended audience', async ({page}) => {
  const fields={mainUses:['논문 검색','참고자료 탐색'],recommendedFor:'고등학생·교사',fee:'일부 무료',signup:'다운로드는 가입 필요',signupAge:'만 14세 이상',operatorName:'테스트 운영기관',operatorType:'public',sourceUrl:'https://example.com/about',verifiedAt:'2026-09-13'};
  await page.route('**/script.google.com/**',r=>r.fulfill({json:{categories,sites,details:{bySiteKey:{RISS:fields}}}}));
  await ready(page,'#site=RISS');
  for(const text of ['논문 검색 · 참고자료 탐색','고등학생·교사','일부 무료','다운로드는 가입 필요','테스트 운영기관','공공기관 운영']) await expect(page.locator('.summary-card')).toContainText(text);
  await expect(page.locator('.summary-card')).not.toContainText('만 14세');
  await expect(page.locator('.detail-body')).toContainText('가입 연령 조건: 만 14세 이상');
  await expect(page.locator('.detail-footer')).toContainText('2026-09-13');
});
