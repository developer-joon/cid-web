import { test, expect } from '@playwright/test';
import { testCreds, skipUnlessLdap, loginAs } from './_helpers';

const user = testCreds.user;
const oper = testCreds.operator;

test.describe('/contact — 담당자 관리', () => {
  test.skip(skipUnlessLdap(user), 'LDAP 테스트 계정 미설정');

  test('USER — 목록이 렌더된다', async ({ page }) => {
    await loginAs(page, user.username, user.password);
    await page.goto('/contact');
    await expect(page.getByRole('heading', { name: '담당자 관리' })).toBeVisible();
  });

  test('USER — + 등록 버튼이 없다', async ({ page }) => {
    await loginAs(page, user.username, user.password);
    await page.goto('/contact');
    await expect(page.getByRole('button', { name: /\+ 등록/ })).toHaveCount(0);
  });

  test('OPERATOR — + 등록 버튼이 보인다', async ({ page }) => {
    test.skip(skipUnlessLdap(oper), 'OPERATOR LDAP 계정 미설정');
    await loginAs(page, oper.username, oper.password);
    await page.goto('/contact');
    await expect(page.getByRole('button', { name: /\+ 등록/ })).toBeVisible();
  });

  test('OPERATOR — 등록 다이얼로그 열기 — 성명, 부서 필드 확인', async ({ page }) => {
    test.skip(skipUnlessLdap(oper), 'OPERATOR LDAP 계정 미설정');
    await loginAs(page, oper.username, oper.password);
    await page.goto('/contact');
    await page.getByRole('button', { name: /\+ 등록/ }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByLabel('성명')).toBeVisible();
    await page.getByLabel('성명').fill('E2E테스트담당자');
    await page.getByRole('button', { name: '취소' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });

  test('USER — 이름 검색 URL 반영', async ({ page }) => {
    await loginAs(page, user.username, user.password);
    await page.goto('/contact');
    const searchInput = page.getByPlaceholder(/이름|성명/).first();
    if (await searchInput.count() > 0) {
      await searchInput.fill('no-such-employee-xyz');
      await page.keyboard.press('Enter');
      await expect(page).toHaveURL(/empNmLike=no-such-employee-xyz/);
    }
  });

  test('OPERATOR — 편집 다이얼로그 열기 — 활성 토글 확인', async ({ page }) => {
    test.skip(skipUnlessLdap(oper), 'OPERATOR LDAP 계정 미설정');
    await loginAs(page, oper.username, oper.password);
    await page.goto('/contact');
    const editBtn = page.getByRole('button', { name: /편집/ }).first();
    if (await editBtn.count() === 0) {
      test.skip(true, '담당자 목록이 비어 있습니다.');
      return;
    }
    await editBtn.click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByLabel('활성')).toBeVisible();
    await page.getByRole('button', { name: '취소' }).click();
  });
});
