import { test, expect } from '@playwright/test';
import { testCreds, skipUnlessLdap, loginAs } from './_helpers';

const user = testCreds.user;
const oper = testCreds.operator;

test.describe('인증 — 로그인 / 로그아웃', () => {
  test('잘못된 자격증명은 에러 메시지를 표시한다', async ({ page }) => {
    test.skip(skipUnlessLdap(user), 'LDAP 테스트 계정 미설정');
    await page.goto('/login');
    await page.getByLabel(/아이디/).fill('invalid-user-xyz-notexist');
    await page.getByLabel(/비밀번호/).fill('wrong-password-abc');
    await page.getByRole('button', { name: /로그인/ }).click();
    // Stay on /login, show error (destructive alert, not the info banner)
    await expect(page).toHaveURL(/\/login/);
    await expect(page.locator('[role="alert"].text-destructive')).toBeVisible();
  });

  test('유효한 USER 로그인 → 대시보드로 이동', async ({ page }) => {
    test.skip(skipUnlessLdap(user), 'LDAP 테스트 계정 미설정');
    await loginAs(page, user.username, user.password);
    await expect(page).toHaveURL('/');
  });

  test('유효한 OPERATOR 로그인 → 대시보드로 이동', async ({ page }) => {
    test.skip(skipUnlessLdap(oper), 'LDAP 테스트 계정 미설정');
    await loginAs(page, oper.username, oper.password);
    await expect(page).toHaveURL('/');
  });

  test('로그아웃 후 /login으로 이동', async ({ page }) => {
    test.skip(skipUnlessLdap(user), 'LDAP 테스트 계정 미설정');
    await loginAs(page, user.username, user.password);
    // Click logout button in the header
    await page.getByRole('button', { name: /로그아웃/ }).click();
    await expect(page).toHaveURL(/\/login/);
  });

  test('미인증 상태에서 보호된 라우트 접근 시 /login으로 리다이렉트', async ({ page }) => {
    await page.goto('/servers');
    await expect(page).toHaveURL(/\/login/);
  });

  test('미인증 상태에서 /servers/123 접근 시 /login으로 리다이렉트', async ({ page }) => {
    await page.goto('/servers/123');
    await expect(page).toHaveURL(/\/login/);
  });
});
