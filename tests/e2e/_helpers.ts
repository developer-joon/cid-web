import type { Page } from '@playwright/test';

export async function loginAs(page: Page, username: string, password: string) {
  await page.goto('/login');
  await page.getByLabel(/아이디/).fill(username);
  await page.getByLabel(/비밀번호/).fill(password);
  await page.getByRole('button', { name: /로그인/ }).click();
  await page.waitForURL((u) => !u.pathname.startsWith('/login'));
}

export const testCreds = {
  user: {
    username: process.env.LDAP_TEST_USER_USER ?? '',
    password: process.env.LDAP_TEST_USER_USER_PASS ?? '',
  },
  operator: {
    username: process.env.LDAP_TEST_USER_OPERATOR ?? '',
    password: process.env.LDAP_TEST_USER_OPERATOR_PASS ?? '',
  },
  admin: {
    username: process.env.LDAP_TEST_USER_ADMIN ?? '',
    password: process.env.LDAP_TEST_USER_ADMIN_PASS ?? '',
  },
};

export function skipUnlessLdap(creds: { username: string; password: string }) {
  return !creds.username || !creds.password;
}

/**
 * Returns the roles list of the currently logged-in user, parsed from the
 * dashboard "권한: USER, OPERATOR, ..." line. Caller must already be on
 * a page that renders the dashboard (i.e. just landed after `loginAs`).
 */
export async function getMyRoles(page: Page): Promise<string[]> {
  await page.goto('/');
  const roleLine = page.locator('p').filter({ hasText: /^권한:/ }).first();
  if ((await roleLine.count()) === 0) return [];
  const text = (await roleLine.textContent()) ?? '';
  return text.replace(/^권한:\s*/, '').split(',').map((s) => s.trim()).filter(Boolean);
}
