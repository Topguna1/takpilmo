import { expect, test } from '@playwright/test';

async function mock(page, options = {}) {
  await page.route('**/script.google.com/**', route => route.abort());
  await page.route('https://www.google.com/s2/**', route => route.abort());
  await page.route('**/js/info/data.module.js', route => route.fulfill({contentType:'application/javascript',body:`
    import { SEED_ARTICLES } from './seed.module.js';
    let items = SEED_ARTICLES.map(item => ({...item,status:'published'}));
    let signed = ${!!options.admin};
    let failSave = ${!!options.failSave};
    export const revisionOf = value => value ? String(value.seconds) : null;
    export const newArticleId = async () => 'new-article';
    export const connect = async () => ({auth:{currentUser:signed ? {uid:'test-uid'} : null}});
    export const administrator = async () => signed && ${!options.denied};
    export const login = async () => {signed = true;};
    export const logout = async () => {signed = false;};
    export async function articles(admin = false) {
      ${options.fail ? "throw Error('network');" : ''}
      return ${options.empty ? '[]' : "items.filter(item => admin || item.status === 'published')"};
    }
    export const article = async id => items.find(item => item.id === id && item.status === 'published');
    export const validateArticle = item => { if (!item.sources.length && item.status === 'published') throw Error('출처를 등록하세요.'); };
    export async function saveArticle(id, data, createOnly = false) {
      if(failSave) {failSave=false;throw Error('저장 실패 테스트');}
      id ||= 'new-article';
      const index = items.findIndex(item => item.id === id);
      if (createOnly && index >= 0) return id;
      if(index >= 0) items[index] = {...data,id}; else items.push({...data,id});
      return {id,updatedAt:{seconds:1,nanoseconds:0}};
    }
  `}));
}
async function ready(page, hash = '#/info') {
  await page.goto('/index.html' + hash);
  await page.waitForFunction(() => !!window.ddakpilmo?.hub);
}
test('library filters, search, direct article, related site and old URL redirects', async ({page}) => {
  await mock(page);await ready(page);
  await expect(page.locator('.info-card')).toHaveCount(8);
  await page.getByRole('link',{name:'사이트 활용',exact:true}).click();
  await expect(page.locator('.info-card')).toHaveCount(2);
  await page.reload();await expect(page.locator('.info-card')).toHaveCount(2);
  await page.getByLabel('정보 글 검색').fill('RISS');await page.locator('#infoSearch button').click();
  await expect(page.locator('.info-card')).toHaveCount(1);
  await page.locator('.info-card').click();await expect(page.locator('.info-article h1')).toContainText('RISS');
  await page.reload();await expect(page.locator('.info-article')).toContainText('기억할 내용');
  await page.locator('.info-article a[href="#site=RISS"]').click();await expect(page.locator('h1')).toHaveText('RISS');
  await page.goBack();await expect(page.locator('.info-article')).toBeVisible();
  for (const hash of ['#/guide','#/guide/result?purpose=papers','#/tips/guide/old','#/practice/presentation']) {
    await ready(page,hash);await expect(page).toHaveURL(/#\/info\?moved=1/);await expect(page.locator('.info-card')).toHaveCount(8);
  }
  await ready(page,'#/info/missing');await expect(page.getByRole('heading',{name:'글을 찾을 수 없어요'})).toBeVisible();
});
test('admin sign-in, preview, save failure recovery, unpublish and no overwrite seed',async ({page}) => {
  await mock(page,{failSave:true});await ready(page,'#/admin/info');
  await page.getByRole('button',{name:'Google 로그인'}).click();
  await page.locator('[data-info-edit="sources"]').click();
  await page.getByLabel('제목',{exact:true}).fill('수정한 정보 제목');
  await page.getByRole('button',{name:'미리보기',exact:true}).click();
  await expect(page.locator('#infoPreview h1')).toHaveText('수정한 정보 제목');
  await page.getByRole('button',{name:'공개 저장',exact:true}).click();
  await expect(page.locator('#infoSaveNotice')).toContainText('저장 실패');
  await expect(page.getByLabel('제목',{exact:true})).toHaveValue('수정한 정보 제목');
  await page.getByRole('button',{name:'공개 저장',exact:true}).click();await expect(page.locator('#infoSaveNotice')).toHaveText('저장했습니다.');
  await page.getByRole('button',{name:'초안 저장 / 비공개',exact:true}).click();await expect(page.locator('[data-info-edit="sources"]')).toContainText('초안');
  await page.getByRole('button',{name:'초기 글 8편 등록'}).click();await expect(page.locator('[data-info-edit="sources"]')).toContainText('수정한 정보 제목');
  await page.locator('[data-nav=info]').click();await expect(page.locator('.info-card')).toHaveCount(7);
});
test('unprivileged account cannot see editor and shows bootstrap UID',async ({page}) => {
  await mock(page,{admin:true,denied:true});await ready(page,'#/admin/info');
  await expect(page.locator('.info-uid')).toHaveText('test-uid');await expect(page.locator('#infoEditForm')).toHaveCount(0);
});
test('dirty form guards links and browser back',async ({page}) => {
  await mock(page,{admin:true});await ready(page,'#/info');await page.locator('a[href="#/admin/info"]').click();
  await page.locator('[data-info-edit="sources"]').click();await page.getByLabel('제목',{exact:true}).fill('미저장 내용');
  page.on('dialog',dialog=>dialog.dismiss());
  await page.locator('[data-nav=sites]').click();await expect(page.getByLabel('제목',{exact:true})).toHaveValue('미저장 내용');
  await page.goBack();await expect(page.getByLabel('제목',{exact:true})).toHaveValue('미저장 내용');
});
test('information failure does not break catalog and missing config is recoverable',async ({page}) => {
  await mock(page,{fail:true});await ready(page);await expect(page.locator('#infoSurface')).toContainText('불러오지 못했어요');
  await page.locator('[data-nav=sites]').click();await expect(page.locator('.site-card')).toHaveCount(12);
  await page.unroute('**/js/info/data.module.js');
  await page.route('**/js/info/firebase-client.module.js', route=>route.fulfill({contentType:'application/javascript',body:"export function client(){throw new Error('Firebase 연결 준비 중입니다.');}"}));
  await ready(page);await expect(page.locator('#infoSurface')).toContainText('Firebase 연결 준비');
});
test('Sheets failure leaves information readable',async ({page}) => {
  await mock(page);await page.route('**/data/sheet-snapshot.json',route=>route.abort());
  await page.goto('/index.html#/info/average');await expect(page.locator('.info-article')).toContainText('평균');
  await expect(page.locator('#retryLoad')).toBeVisible();await expect(page.locator('.info-body')).toContainText('150분');
});
for(const width of [320,390,768,1440]) test(`information layout ${width}`,async ({page}) => {
  await mock(page,{admin:true});await page.setViewportSize({width,height:1000});
  for(const hash of ['#/info','#/info/average','#/admin/info']) {
    await ready(page,hash);await expect(page.locator('#infoSurface')).toHaveAttribute('aria-busy','false');
    if(hash.includes('admin')) await page.locator('[data-info-edit="average"]').click();
    await page.evaluate(()=>document.body.classList.add('dark','font-large'));
    expect(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    if([390,1440].includes(width)) await page.screenshot({path:`test-results/screens/info-${width}-${hash.includes('admin')?'admin':hash.includes('average')?'article':'list'}.png`,fullPage:true});
  }
});

test('article back restores the loaded list card focus',async({page})=>{await mock(page);await ready(page);const card=page.locator('.info-card').nth(5);await card.scrollIntoViewIfNeeded();await card.focus();const y=await page.evaluate(()=>scrollY);await card.click();await expect(page.locator('.info-article')).toBeVisible();await page.goBack();await expect(card).toBeFocused();await expect.poll(()=>page.evaluate(()=>scrollY)).toBeCloseTo(y,0);});
