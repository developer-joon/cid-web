import type { Page } from '@playwright/test';

export async function loginAs(page: Page, username: string, password: string) {
  await page.goto('/login');
  await page.getByLabel('아이디').fill(username);
  await page.getByLabel('비밀번호').fill(password);
  await page.getByRole('button', { name: /로그인/ }).click();
  await page.waitForURL((u) => !u.pathname.startsWith('/login'));
}
