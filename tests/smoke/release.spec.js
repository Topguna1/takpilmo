import {test,expect} from '@playwright/test';
test('bundled release supports subpath navigation and lazy admin authentication',async({page,request})=>{
const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.route('**/script.google.com/**',route=>route.abort());
await page.route('**/firestore.googleapis.com/**',route=>route.abort());
await page.route('https://www.google.com/s2/**',route=>route.abort());
await page.goto('./#/sites');await expect(page.locator('.site-card')).toHaveCount(12);
await page.locator('.site-card a[data-detail]').first().click();await expect(page.locator('.detail-layout')).toBeVisible();
await page.reload();await expect(page.locator('.detail-layout')).toBeVisible();
await page.goto('./#/admin/info');await expect(page.getByRole('button',{name:'Google 로그인'})).toBeVisible();
const missing=await request.get('./missing-page');expect(missing.status()).toBe(404);
expect(errors).toEqual([]);
});
