import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
const sdk=readFileSync(new URL('../helpers/admin-firebase.txt',import.meta.url),'utf8');
async function setup(page) {
  await page.route('**/admin-test-sdk.js',route=>route.fulfill({contentType:'application/javascript',body:sdk}));
  await page.route('**/firebasejs/12.3.0/*',route=>route.fulfill({contentType:'application/javascript',body:'export * from "/admin-test-sdk.js";'}));
  await page.goto('/admin.html');
  await page.getByRole('button',{name:'새 글 쓰기',exact:true}).click();
}
const title=page=>page.locator('[data-f="title"]').first();
const save=page=>page.getByRole('button',{name:'저장',exact:true});
async function content(page) {
  await title(page).fill('검증 글');
  await page.locator('[data-f="summary"]').fill('요약');
  await page.getByRole('button',{name:'+ 글',exact:true}).click();
  await page.locator('textarea[data-f="text"]').fill('본문');
}
test('delayed save preserves newer input and failed save retains it',async({page})=>{
  await setup(page);await content(page);
  await page.evaluate(()=>window.__adminTest.delay=500);
  await save(page).click();await title(page).fill('저장 중 추가 입력');
  await expect(save(page)).toBeEnabled();
  await expect(title(page)).toHaveValue('저장 중 추가 입력');
  await expect(page.locator('.admin-msg')).toContainText('추가 변경');
  expect(await page.evaluate(()=>Object.keys(localStorage).some(k=>k.startsWith('takpilmo:editor:owner:id-')))).toBe(true);
  await page.evaluate(()=>{window.__adminTest.delay=0;window.__adminTest.failWrite=true;});
  await save(page).click();await expect(page.locator('.admin-msg')).toContainText('확인하지 못');
  await expect(title(page)).toHaveValue('저장 중 추가 입력');
});
test('long blocks and extra tags are rejected without losing input',async({page})=>{
  await setup(page);await content(page);
  await page.locator('textarea[data-f="text"]').fill('가'.repeat(20001));
  await save(page).click();await expect(page.locator('.admin-msg')).toContainText('20000');
  expect(await page.locator('textarea[data-f="text"]').inputValue()).toHaveLength(20001);
  expect(await page.evaluate(()=>window.__adminTest.writes)).toBe(0);
});
test('list failure after saving does not prevent a second update',async({page})=>{
  await setup(page);await content(page);
  await page.evaluate(()=>window.__adminTest.failList=true);
  await save(page).click();await expect(page.locator('.admin-msg')).toContainText('목록 갱신');
  await title(page).fill('두번째 저장');await save(page).click();
  await expect(page.locator('.admin-msg')).toContainText('저장했어요');
  expect(await page.evaluate(()=>Object.values(window.__adminTest.docs).find(d=>d.title==='두번째 저장')?.createdAt)).toBeTruthy();
});
test('incomplete drafts recover after reload and remain private',async({page})=>{
  await setup(page);await title(page).fill('미완성 초안');
  await page.getByRole('button',{name:'+ 이미지',exact:true}).click();
  await expect(page.locator('#saveState')).toContainText('임시 보관');
  page.on('dialog',d=>d.accept());await page.reload();
  await page.getByRole('button',{name:'새 글 쓰기',exact:true}).click();
  await expect(title(page)).toHaveValue('미완성 초안');
  await page.getByRole('button',{name:'초안 저장',exact:true}).click();
  await expect(page.locator('.admin-msg')).toContainText('저장했어요');
  expect(await page.evaluate(()=>Object.values(window.__adminTest.docs).some(d=>d.status==='published'))).toBe(false);
});
test('published draft stays separate, conflict is detected and history restores',async({page})=>{
  await setup(page);await content(page);await page.locator('[data-f="status"]').selectOption('published');
  await save(page).click();await expect(page.locator('.admin-msg')).toContainText('저장했어요');
  await title(page).fill('공개 전 수정');await page.getByRole('button',{name:'초안 저장',exact:true}).click();
  await expect(page.locator('.admin-msg')).toContainText('공개 본문을 유지');
  expect(await page.evaluate(()=>Object.values(window.__adminTest.docs).find(d=>d.status==='published')?.title)).toBe('검증 글');
  await page.getByRole('button',{name:'공개 변경 반영',exact:true}).click();
  await expect(page.locator('.admin-msg')).toContainText('저장했어요');
  await page.getByRole('button',{name:'이전 버전',exact:true}).click();
  await page.getByRole('button',{name:'이 버전 복원',exact:true}).first().click();
  await expect(title(page)).toHaveValue('검증 글');
  await page.evaluate(()=>{const d=Object.values(window.__adminTest.docs).find(d=>d.status==='published');d.revision++;});
  await page.getByRole('button',{name:'공개 변경 반영',exact:true}).click();
  await expect(page.locator('.admin-msg')).toContainText('다른 탭');
});
for(const width of [320,390,768,1440]) test(`admin layout ${width}`,async({page})=>{
  await page.setViewportSize({width,height:900});await setup(page);await content(page);
  await page.evaluate(()=>document.body.classList.add('font-large'));
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  if([320,1440].includes(width))await page.screenshot({path:`test-results/screens/admin-${width}.png`,fullPage:true});
});
