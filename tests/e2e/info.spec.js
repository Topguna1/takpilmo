import { expect, test } from '@playwright/test';

async function mock(page, options = {}) {
  await page.route('**/script.google.com/**', route => route.abort());
  await page.route('https://www.google.com/s2/**', route => route.abort());
  await page.route('**/js/info/data.module.js', route => route.fulfill({contentType:'application/javascript',body:`
    import { SEED_ARTICLES } from './seed.module.js';
    let items = SEED_ARTICLES.map(item => ({...item,status:'published'}));
    export async function articles() {
      ${options.fail ? "throw Error('network');" : ''}
      return ${options.empty ? '[]' : "items.filter(item => item.status === 'published')"};
    }
    export const latestArticles = async () => (await articles()).slice(0,3);
    export const article = async id => items.find(item => item.id === id && item.status === 'published');
  `}));
}
async function ready(page, hash = '#/info') {
  await page.goto('/index.html' + hash);
  await page.waitForFunction(() => !!window.ddakpilmo?.hub);
}
test('library filters, search, direct article, related site and old URL redirects', async ({page}) => {
  await mock(page);await ready(page);
  await expect(page.locator('.info-card')).toHaveCount(11);
  await page.getByRole('link',{name:'사이트 활용',exact:true}).click();
  await expect(page.locator('.info-card')).toHaveCount(5);
  await page.reload();await expect(page.locator('.info-card')).toHaveCount(5);
  await page.getByLabel('정보 글 검색').fill('RISS');await page.locator('#infoSearch button').click();
  await expect(page.locator('.info-card')).toHaveCount(1);
  await page.locator('.info-card').click();await expect(page.locator('.info-article h1')).toContainText('RISS');
  await page.reload();await expect(page.locator('.info-article')).toContainText('기억할 내용');
  await page.locator('.info-article a[href="#site=RISS"]').click();await expect(page.locator('h1')).toHaveText('RISS');
  await page.goBack();await expect(page.locator('.info-article')).toBeVisible();
  for (const hash of ['#/guide','#/guide/result?purpose=papers','#/tips/guide/old','#/practice/presentation']) {
    await ready(page,hash);await expect(page).toHaveURL(/#\/info\?moved=1/);await expect(page.locator('.info-card')).toHaveCount(11);
  }
  await ready(page,'#/info/missing');await expect(page.getByRole('heading',{name:'글을 찾을 수 없어요'})).toBeVisible();
});
test('footer has no admin entry and old admin URLs redirect to public information',async ({page}) => {
  await mock(page);await ready(page, '#/');
  await expect(page.locator('.site-footer a[href="#/admin/info"]')).toHaveCount(0);
  await expect(page.getByRole('link', {name:'정보 관리',exact:true})).toHaveCount(0);
  for (const hash of ['#/admin/info', '#/admin/info?edit=sources', '#/admin/info/']) {
    await ready(page,hash);
    await expect(page).toHaveURL(/#\/info$/);
    await expect(page.locator('.info-card')).toHaveCount(11);
    await expect(page.getByRole('button',{name:'Google 로그인'})).toHaveCount(0);
    await expect(page.locator('#infoEditForm,[data-info-new],[data-info-seed]')).toHaveCount(0);
    await page.reload();
    await expect(page).toHaveURL(/#\/info$/);
    await expect(page.locator('.info-card')).toHaveCount(11);
  }
});

test('information failure does not break catalog and missing config is recoverable',async ({page}) => {
  await mock(page,{fail:true});await ready(page);await expect(page.locator('#infoSurface')).toContainText('불러오지 못했어요');
  await page.locator('[data-nav=sites]').click();await expect(page.locator('.site-card')).toHaveCount(12);
  await page.unroute('**/js/info/data.module.js');
  await page.route('**/js/info/firebase-config.module.js', route=>route.fulfill({contentType:'application/javascript',body:'export const firebaseConfig = {};'}));
  await ready(page);await expect(page.locator('#infoSurface')).toContainText('Firebase 연결 준비');
});
test('Sheets failure leaves information readable',async ({page}) => {
  await mock(page);await page.route('**/data/sheet-snapshot.json',route=>route.abort());
  await page.goto('/index.html#/info/average');await expect(page.locator('.info-article')).toContainText('평균');
  await expect(page.locator('#retryLoad')).toBeVisible();await expect(page.locator('.info-body')).toContainText('150분');
});
for(const width of [320,390,768,1440]) test(`information layout ${width}`,async ({page}) => {
  await mock(page);await page.setViewportSize({width,height:1000});
  for(const hash of ['#/info','#/info/average','#/admin/info']) {
    await ready(page,hash);await expect(page.locator('#infoSurface')).toHaveAttribute('aria-busy','false');
    if(hash.includes('admin')) await expect(page).toHaveURL(/#\/info$/);
    await page.evaluate(()=>document.body.classList.add('dark','font-large'));
    expect(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    if([390,1440].includes(width)) await page.screenshot({path:`test-results/screens/info-${width}-${hash.includes('admin')?'admin':hash.includes('average')?'article':'list'}.png`,fullPage:true});
  }
});
