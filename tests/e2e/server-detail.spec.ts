import { test, expect } from '@playwright/test';
import { loginAs } from './_helpers';

const USER = process.env.LDAP_TEST_USER_USER ?? '';
const USER_PW = process.env.LDAP_TEST_USER_USER_PASS ?? '';

test.describe('/servers/[ciId] detail', () => {
  test.skip(!USER, 'LDAP test accounts not configured');

  test('clicking a row goes to detail and IP tab loads', async ({ page }) => {
    await loginAs(page, USER, USER_PW);
    await page.goto('/servers');
    const firstRow = page.locator('a[href^="/servers/"]').first();
    await firstRow.click();
    await expect(page).toHaveURL(/\/servers\/\d+/);
    await expect(page.getByText('기본 정보 (CI 공통)')).toBeVisible();
    await expect(page.getByRole('tab', { name: 'IP 주소' })).toHaveAttribute('data-state', 'active');
  });

  test('non-existent ciId shows not-found UI', async ({ page }) => {
    await loginAs(page, USER, USER_PW);
    await page.goto('/servers/9999999');
    await expect(page.getByText(/서버를 찾을 수 없습니다/)).toBeVisible();
  });
});
