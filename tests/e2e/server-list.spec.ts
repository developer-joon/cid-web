import { test, expect } from '@playwright/test';
import { loginAs } from './_helpers';

const USER = process.env.LDAP_TEST_USER_USER ?? '';
const USER_PW = process.env.LDAP_TEST_USER_USER_PASS ?? '';
const OPER = process.env.LDAP_TEST_USER_OPERATOR ?? '';
const OPER_PW = process.env.LDAP_TEST_USER_OPERATOR_PASS ?? '';

test.describe('/servers list', () => {
  test.skip(!USER || !OPER, 'LDAP test accounts not configured');

  test('USER sees list but no register button', async ({ page }) => {
    await loginAs(page, USER, USER_PW);
    await page.goto('/servers');
    await expect(page.getByRole('heading', { name: '서버 목록' })).toBeVisible();
    await expect(page.getByRole('button', { name: /\+ 등록/ })).toHaveCount(0);
  });

  test('OPERATOR sees disabled register button', async ({ page }) => {
    await loginAs(page, OPER, OPER_PW);
    await page.goto('/servers');
    const btn = page.getByRole('button', { name: /\+ 등록/ });
    await expect(btn).toBeVisible();
    await expect(btn).toBeDisabled();
  });

  test('search input changes URL and filters list', async ({ page }) => {
    await loginAs(page, USER, USER_PW);
    await page.goto('/servers');
    await page.getByPlaceholder(/호스트명으로 검색/).fill('zzz-no-such-host');
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/ciNm=zzz-no-such-host/);
    await expect(page.getByText(/조회된 서버가 없습니다|총 0건/)).toBeVisible();
  });
});
