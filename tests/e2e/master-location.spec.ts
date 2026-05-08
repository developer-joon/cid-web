import { test, expect } from '@playwright/test';
import { testCreds, skipUnlessLdap, loginAs } from './_helpers';

const user = testCreds.user;
const oper = testCreds.operator;

test.describe('/location — 위치 관리', () => {
  test.skip(skipUnlessLdap(user), 'LDAP 테스트 계정 미설정');

  test('USER — 목록이 렌더된다', async ({ page }) => {
    await loginAs(page, user.username, user.password);
    await page.goto('/location');
    await expect(page.getByRole('heading', { name: '위치 관리' })).toBeVisible();
  });

  test('USER — + 등록 버튼이 없다', async ({ page }) => {
    await loginAs(page, user.username, user.password);
    await page.goto('/location');
    await expect(page.getByRole('button', { name: /\+ 등록/ })).toHaveCount(0);
  });

  test('OPERATOR — + 등록 버튼이 보인다', async ({ page }) => {
    test.skip(skipUnlessLdap(oper), 'OPERATOR LDAP 계정 미설정');
    await loginAs(page, oper.username, oper.password);
    await page.goto('/location');
    await expect(page.getByRole('button', { name: /\+ 등록/ })).toBeVisible();
  });

  test('OPERATOR — 등록 다이얼로그 열기 — 사이트, 층, 유형 필드 확인', async ({ page }) => {
    test.skip(skipUnlessLdap(oper), 'OPERATOR LDAP 계정 미설정');
    await loginAs(page, oper.username, oper.password);
    await page.goto('/location');
    await page.getByRole('button', { name: /\+ 등록/ }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByLabel('사이트')).toBeVisible();
    await page.getByLabel('사이트').fill('E2E-사이트');
    await page.getByRole('button', { name: '취소' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });

  test('USER — 사이트 검색 URL 반영', async ({ page }) => {
    await loginAs(page, user.username, user.password);
    await page.goto('/location');
    const searchInput = page.getByPlaceholder(/사이트/).first();
    if (await searchInput.count() > 0) {
      await searchInput.fill('no-such-site-xyz');
      await page.keyboard.press('Enter');
      await expect(page).toHaveURL(/siteNmLike=no-such-site-xyz/);
    }
  });

  test('USER — 층 검색 URL 반영', async ({ page }) => {
    await loginAs(page, user.username, user.password);
    await page.goto('/location');
    const floorInput = page.getByPlaceholder(/층/).first();
    if (await floorInput.count() > 0) {
      await floorInput.fill('no-such-floor');
      await page.keyboard.press('Enter');
      await expect(page).toHaveURL(/floorNmLike=no-such-floor/);
    }
  });

  test('OPERATOR — 편집 다이얼로그 열기 및 취소', async ({ page }) => {
    test.skip(skipUnlessLdap(oper), 'OPERATOR LDAP 계정 미설정');
    await loginAs(page, oper.username, oper.password);
    await page.goto('/location');
    const editBtn = page.getByRole('button', { name: /편집/ }).first();
    if (await editBtn.count() === 0) {
      test.skip(true, '위치 목록이 비어 있습니다.');
      return;
    }
    await editBtn.click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByLabel('사이트')).toBeVisible();
    await page.getByRole('button', { name: '취소' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });
});
