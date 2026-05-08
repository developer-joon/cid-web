import { test, expect } from '@playwright/test';
import { testCreds, skipUnlessLdap, loginAs } from './_helpers';

const user = testCreds.user;
const oper = testCreds.operator;

test.describe('/rack — 렉 관리', () => {
  test.skip(skipUnlessLdap(user), 'LDAP 테스트 계정 미설정');

  test('USER — 목록이 렌더된다', async ({ page }) => {
    await loginAs(page, user.username, user.password);
    await page.goto('/rack');
    await expect(page.getByRole('heading', { name: '렉 관리' })).toBeVisible();
  });

  test('USER — + 등록 버튼이 없다', async ({ page }) => {
    await loginAs(page, user.username, user.password);
    await page.goto('/rack');
    await expect(page.getByRole('button', { name: /\+ 등록/ })).toHaveCount(0);
  });

  test('OPERATOR — + 등록 버튼이 보인다', async ({ page }) => {
    test.skip(skipUnlessLdap(oper), 'OPERATOR LDAP 계정 미설정');
    await loginAs(page, oper.username, oper.password);
    await page.goto('/rack');
    await expect(page.getByRole('button', { name: /\+ 등록/ })).toBeVisible();
  });

  test('OPERATOR — 등록 다이얼로그가 열린다', async ({ page }) => {
    test.skip(skipUnlessLdap(oper), 'OPERATOR LDAP 계정 미설정');
    await loginAs(page, oper.username, oper.password);
    await page.goto('/rack');
    await page.getByRole('button', { name: /\+ 등록/ }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('heading', { name: '렉 등록' })).toBeVisible();
    await expect(page.getByLabel('렉 코드')).toBeVisible();
  });

  test('OPERATOR — 렉 코드 입력 후 취소', async ({ page }) => {
    test.skip(skipUnlessLdap(oper), 'OPERATOR LDAP 계정 미설정');
    await loginAs(page, oper.username, oper.password);
    await page.goto('/rack');
    await page.getByRole('button', { name: /\+ 등록/ }).click();
    await page.getByLabel('렉 코드').fill('E2E-RACK-TEST');
    await page.getByRole('button', { name: '취소' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });

  test('OPERATOR — 행 편집 버튼이 보인다', async ({ page }) => {
    test.skip(skipUnlessLdap(oper), 'OPERATOR LDAP 계정 미설정');
    await loginAs(page, oper.username, oper.password);
    await page.goto('/rack');
    const editBtn = page.getByRole('button', { name: /편집/ }).first();
    if (await editBtn.count() === 0) {
      test.skip(true, '렉 목록이 비어 있습니다.');
      return;
    }
    await editBtn.click();
    await expect(page.getByRole('dialog')).toBeVisible();
  });
});
