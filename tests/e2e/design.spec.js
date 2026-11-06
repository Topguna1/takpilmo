import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
const catalog = JSON.parse(readFileSync('data/sheet-snapshot.json','utf8'));
test.beforeEach(async ({page}) => {
  await page.route('**/script.google.com/**',r=>r.fulfill({json:catalog}));
  await page.route('https://www.google.com/s2/**',r=>r.abort());
  await page.route('**/js/info/data.module.js',r=>r.fulfill({contentType:'application/javascript',body:`
    import {SEED_ARTICLES} from './seed.module.js';
    export const latestArticles=async()=>SEED_ARTICLES.slice(0,3);
    export const articles=async()=>SEED_ARTICLES;
    export const article=async id=>SEED_ARTICLES.find(item=>item.id===id);
  `}));
});
for(const mode of ['light','dark']) test(`indigo trial home and compact catalog in ${mode}`, async ({page}) => {
  await page.addInitScript(value=>localStorage.setItem('siteTheme',value),mode);
  await page.setViewportSize({width:1440,height:1000});
  await page.goto('/index.html');await page.waitForFunction(()=>!!window.ddakpilmo?.hub);
  await expect(page.locator('.info-shelf .info-card')).toHaveCount(3);
  await page.screenshot({path:`test-results/screens/design-home-${mode}.png`,fullPage:true});
  await page.screenshot({path:`test-results/screens/design-home-preview-${mode}.png`});
  await page.locator('[data-nav=sites]').click();
  const card = page.locator('.site-card').first();
  await expect(card.locator('.card-facts')).toHaveCount(0);
  await expect(card.locator('.card-tags .fee-tag')).toContainText('일부 유료');
  await expect(card.locator('.card-tags .fee-tag')).toHaveAttribute('title',/무료/);
  await expect(card.locator('.card-domain')).toContainText('ebs.co.kr');
  await expect(card.locator('.card-source')).toContainText('정보 확인');
  await card.hover();await expect.poll(()=>card.evaluate(node=>getComputedStyle(node).transform)).not.toBe('none');
  await page.screenshot({path:`test-results/screens/design-catalog-${mode}.png`,fullPage:true});
  await page.screenshot({path:`test-results/screens/design-catalog-preview-${mode}.png`});
  await page.emulateMedia({reducedMotion:'reduce'});
  await expect.poll(()=>card.evaluate(node=>getComputedStyle(node).transform)).toBe('none');
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.evaluate(()=>document.body.classList.add('anim-off'));
  await expect.poll(()=>card.evaluate(node=>getComputedStyle(node).transform)).toBe('none');
  await page.setViewportSize({width:768,height:1000});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.setViewportSize({width:390,height:844});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:`test-results/screens/design-mobile-catalog-${mode}.png`,fullPage:true});
  await page.locator('.brand').first().click();
  const bounds=await page.locator('#homeSearch').boundingBox();expect(bounds.y+bounds.height).toBeLessThan(844);
  await page.screenshot({path:`test-results/screens/design-mobile-home-${mode}.png`,fullPage:true});
});

for (const width of [390,1440]) test(`textbook category lists sheet sites at ${width}px`,async ({page}) => {
  await page.setViewportSize({width,height:1000});
  await page.goto('/index.html#/sites?group=study');
  const textbook=page.getByRole('navigation',{name:'세부 카테고리'}).getByRole('link',{name:'교과서',exact:true});
  await expect(textbook).toBeVisible();
  await textbook.click();
  await expect(page).toHaveURL(/category=textbook/);
  await expect(page.locator('#filteredCount')).toHaveText('6개');
  for (const name of ['에듀넷','아이스크림 교과서','미래엔','지학사','비상 교과서','동아출판 교과서']) {
    await expect(page.locator('.site-card h3').getByRole('link',{name,exact:true})).toBeVisible();
  }
  await page.reload();
  await expect(page.locator('#filteredCount')).toHaveText('6개');
  await page.locator('#searchInput').fill('미래엔');
  await expect(page.locator('.site-card')).toHaveCount(1);
  await page.locator('.site-card').getByText('상세정보 →').click();
  await expect(page.locator('h1')).toHaveText('미래엔');
});
