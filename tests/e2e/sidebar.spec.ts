import { test, expect } from '@playwright/test';
import { testCreds, skipUnlessLdap, loginAs } from './_helpers';

const user = testCreds.user;

test.describe('사이드바', () => {
  test.skip(skipUnlessLdap(user), 'LDAP 테스트 계정 미설정');

  test.beforeEach(async ({ page }) => {
    await loginAs(page, user.username, user.password);
  });

  test('모든 주요 메뉴 항목이 보인다', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('link', { name: /대시보드/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /서버/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /IP 대역/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /렉 관리/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /위치/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /벤더/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /담당자/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /부서/ })).toBeVisible();
  });

  test('/서버 접근 시 사이드바의 서버 항목이 active 상태', async ({ page }) => {
    await page.goto('/servers');
    const serverLink = page.getByRole('link', { name: /서버/ });
    await expect(serverLink).toBeVisible();
    // active class contains 'bg-primary'
    await expect(serverLink).toHaveClass(/bg-primary/);
  });

  test('/ 접근 시 대시보드 항목이 active 상태', async ({ page }) => {
    await page.goto('/');
    const dashLink = page.getByRole('link', { name: /대시보드/ });
    await expect(dashLink).toHaveClass(/bg-primary/);
    // 서버 링크는 active 아님
    const serverLink = page.getByRole('link', { name: /서버/ });
    await expect(serverLink).not.toHaveClass(/bg-primary/);
  });

  test('/servers/[ciId] 접근 시 서버 항목이 active 상태 (중첩 경로)', async ({ page }) => {
    await page.goto('/servers');
    // find first server link and navigate to it
    const firstServerRow = page.locator('a[href^="/servers/"]:not([href="/servers/new"])').first();
    if (await firstServerRow.count() === 0) {
      test.skip(true, '서버 목록이 비어 있어 중첩 경로 테스트를 스킵합니다.');
      return;
    }
    const href = await firstServerRow.getAttribute('href');
    if (!href) {
      test.skip(true, '서버 링크 href가 없어 스킵합니다.');
      return;
    }
    await page.goto(href);
    const serverLink = page.getByRole('link', { name: /서버/ });
    await expect(serverLink).toHaveClass(/bg-primary/);
  });

  test('disabled 항목은 링크가 아닌 span으로 렌더된다', async ({ page }) => {
    await page.goto('/');
    // IP 관리, 도메인, DNS 등은 disabled
    const ipSpan = page.locator('span[aria-disabled="true"]', { hasText: 'IP 관리' });
    await expect(ipSpan).toBeVisible();
  });

  test('서버 메뉴 클릭 시 /servers로 이동', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: /서버/ }).click();
    await expect(page).toHaveURL('/servers');
  });
});
