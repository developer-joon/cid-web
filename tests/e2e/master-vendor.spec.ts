import { test, expect } from '@playwright/test';
import { testCreds, skipUnlessLdap, loginAs } from './_helpers';

const user = testCreds.user;
const oper = testCreds.operator;

test.describe('/vendor — 벤더 관리', () => {
  test.skip(skipUnlessLdap(user), 'LDAP 테스트 계정 미설정');

  test('USER — 목록이 렌더된다', async ({ page }) => {
    await loginAs(page, user.username, user.password);
    await page.goto('/vendor');
    await expect(page.getByRole('heading', { name: '벤더 관리' })).toBeVisible();
  });

  test('USER — + 등록 버튼이 없다', async ({ page }) => {
    await loginAs(page, user.username, user.password);
    await page.goto('/vendor');
    await expect(page.getByRole('button', { name: /\+ 등록/ })).toHaveCount(0);
  });

  test('OPERATOR — + 등록 버튼이 보인다', async ({ page }) => {
    test.skip(skipUnlessLdap(oper), 'OPERATOR LDAP 계정 미설정');
    await loginAs(page, oper.username, oper.password);
    await page.goto('/vendor');
    await expect(page.getByRole('button', { name: /\+ 등록/ })).toBeVisible();
  });

  test('OPERATOR — 등록 다이얼로그 열기 및 취소', async ({ page }) => {
    test.skip(skipUnlessLdap(oper), 'OPERATOR LDAP 계정 미설정');
    await loginAs(page, oper.username, oper.password);
    await page.goto('/vendor');
    await page.getByRole('button', { name: /\+ 등록/ }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByLabel('벤더 명')).toBeVisible();
    await page.getByLabel('벤더 명').fill('E2E-벤더-테스트');
    await page.getByRole('button', { name: '취소' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });

  test('USER — 이름 검색 필터 URL 반영', async ({ page }) => {
    await loginAs(page, user.username, user.password);
    await page.goto('/vendor');
    const searchInput = page.getByPlaceholder(/벤더명|이름/).first();
    if (await searchInput.count() > 0) {
      await searchInput.fill('no-such-vendor');
      await page.keyboard.press('Enter');
      await expect(page).toHaveURL(/vendorNmLike=no-such-vendor/);
    }
  });

  test('OPERATOR — 편집 다이얼로그 열기 및 취소', async ({ page }) => {
    test.skip(skipUnlessLdap(oper), 'OPERATOR LDAP 계정 미설정');
    await loginAs(page, oper.username, oper.password);
    await page.goto('/vendor');
    const editBtn = page.getByRole('button', { name: /편집/ }).first();
    if (await editBtn.count() === 0) {
      test.skip(true, '벤더 목록이 비어 있습니다.');
      return;
    }
    await editBtn.click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByLabel('벤더 명')).toBeVisible();
    // Scope to dialog: list page also has a "비활성 포함" filter checkbox
    // whose label substring-matches '활성'.
    await expect(dialog.getByLabel('활성')).toBeVisible();
    await dialog.getByRole('button', { name: '취소' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });
});
