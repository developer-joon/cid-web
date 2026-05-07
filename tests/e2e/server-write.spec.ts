import { test, expect } from '@playwright/test';
import { loginAs } from './_helpers';

const OPER = process.env.LDAP_TEST_USER_OPERATOR ?? '';
const OPER_PW = process.env.LDAP_TEST_USER_OPERATOR_PASS ?? '';
const ADMIN = process.env.LDAP_TEST_USER_ADMIN ?? '';
const ADMIN_PW = process.env.LDAP_TEST_USER_ADMIN_PASS ?? '';
const USER = process.env.LDAP_TEST_USER_USER ?? '';
const USER_PW = process.env.LDAP_TEST_USER_USER_PASS ?? '';

test.describe('/servers/new', () => {
  test.skip(!OPER, 'LDAP test accounts not configured');

  test('OPERATOR can navigate to /servers/new', async ({ page }) => {
    await loginAs(page, OPER, OPER_PW);
    await page.goto('/servers');
    await page.getByRole('link', { name: /\+ 등록/ }).click();
    await expect(page).toHaveURL(/\/servers\/new/);
    await expect(page.getByLabel('CI 명')).toBeVisible();
  });

  test('USER hitting /servers/new is redirected', async ({ page }) => {
    test.skip(!USER, 'USER LDAP test account not configured');
    await loginAs(page, USER, USER_PW);
    await page.goto('/servers/new');
    await expect(page).toHaveURL(/\/servers(\?|$)/);  // not /new
  });
});

test.describe('decommission dialog', () => {
  test.skip(!ADMIN, 'ADMIN LDAP test account not configured');

  test('ADMIN sees 폐기 button on detail', async ({ page }) => {
    await loginAs(page, ADMIN, ADMIN_PW);
    await page.goto('/servers');
    const firstRow = page.locator('a[href^="/servers/"]').first();
    await firstRow.click();
    await expect(page.getByRole('button', { name: '폐기' })).toBeVisible();
  });

  test('OPERATOR does not see 폐기 button', async ({ page }) => {
    await loginAs(page, OPER, OPER_PW);
    await page.goto('/servers');
    const firstRow = page.locator('a[href^="/servers/"]').first();
    await firstRow.click();
    await expect(page.getByRole('button', { name: '폐기' })).toHaveCount(0);
  });
});
