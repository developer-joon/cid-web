import { test, expect } from '@playwright/test';
import { testCreds, skipUnlessLdap, loginAs } from './_helpers';

const user = testCreds.user;
const oper = testCreds.operator;

test.describe('/servers/[ciId] 상세', () => {
  test.skip(skipUnlessLdap(user), 'LDAP 테스트 계정 미설정');

  test('존재하지 않는 ciId → not-found UI 표시', async ({ page }) => {
    await loginAs(page, user.username, user.password);
    await page.goto('/servers/9999999');
    await expect(page.getByText(/서버를 찾을 수 없습니다/)).toBeVisible();
  });

  test('목록 행 클릭 → 상세 페이지로 이동', async ({ page }) => {
    await loginAs(page, user.username, user.password);
    await page.goto('/servers');
    const firstRow = page.locator('a[href^="/servers/"]').first();
    const count = await firstRow.count();
    if (count === 0) {
      test.skip(true, '서버 목록이 비어 있습니다.');
      return;
    }
    await firstRow.click();
    await expect(page).toHaveURL(/\/servers\/\d+/);
  });

  test('기본 정보 카드가 보인다', async ({ page }) => {
    await loginAs(page, user.username, user.password);
    await page.goto('/servers');
    const firstRow = page.locator('a[href^="/servers/"]').first();
    if (await firstRow.count() === 0) {
      test.skip(true, '서버 목록이 비어 있습니다.');
      return;
    }
    await firstRow.click();
    await expect(page.getByText(/기본 정보/)).toBeVisible();
  });

  test('IP 주소 탭이 기본으로 활성화된다', async ({ page }) => {
    await loginAs(page, user.username, user.password);
    await page.goto('/servers');
    const firstRow = page.locator('a[href^="/servers/"]').first();
    if (await firstRow.count() === 0) {
      test.skip(true, '서버 목록이 비어 있습니다.');
      return;
    }
    await firstRow.click();
    const ipTab = page.getByRole('tab', { name: 'IP 주소' });
    await expect(ipTab).toBeVisible();
    await expect(ipTab).toHaveAttribute('data-state', 'active');
  });

  test('담당자 탭 클릭 시 탭 전환', async ({ page }) => {
    await loginAs(page, user.username, user.password);
    await page.goto('/servers');
    const firstRow = page.locator('a[href^="/servers/"]').first();
    if (await firstRow.count() === 0) {
      test.skip(true, '서버 목록이 비어 있습니다.');
      return;
    }
    await firstRow.click();
    await page.getByRole('tab', { name: '담당자' }).click();
    await expect(page.getByRole('tab', { name: '담당자' })).toHaveAttribute('data-state', 'active');
  });

  test('관계 탭 클릭 시 탭 전환', async ({ page }) => {
    await loginAs(page, user.username, user.password);
    await page.goto('/servers');
    const firstRow = page.locator('a[href^="/servers/"]').first();
    if (await firstRow.count() === 0) {
      test.skip(true, '서버 목록이 비어 있습니다.');
      return;
    }
    await firstRow.click();
    await page.getByRole('tab', { name: '관계' }).click();
    await expect(page.getByRole('tab', { name: '관계' })).toHaveAttribute('data-state', 'active');
  });

  test('이력 탭 클릭 시 탭 전환', async ({ page }) => {
    await loginAs(page, user.username, user.password);
    await page.goto('/servers');
    const firstRow = page.locator('a[href^="/servers/"]').first();
    if (await firstRow.count() === 0) {
      test.skip(true, '서버 목록이 비어 있습니다.');
      return;
    }
    await firstRow.click();
    await page.getByRole('tab', { name: '이력' }).click();
    await expect(page.getByRole('tab', { name: '이력' })).toHaveAttribute('data-state', 'active');
  });

  test('USER — 편집/폐기 버튼이 없다', async ({ page }) => {
    await loginAs(page, user.username, user.password);
    await page.goto('/servers');
    const firstRow = page.locator('a[href^="/servers/"]').first();
    if (await firstRow.count() === 0) {
      test.skip(true, '서버 목록이 비어 있습니다.');
      return;
    }
    await firstRow.click();
    await expect(page.getByRole('link', { name: '편집' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: '폐기' })).toHaveCount(0);
  });

  test('OPERATOR — 편집 링크와 폐기 버튼이 보인다', async ({ page }) => {
    test.skip(skipUnlessLdap(oper), 'OPERATOR LDAP 계정 미설정');
    await loginAs(page, oper.username, oper.password);
    await page.goto('/servers');
    const firstRow = page.locator('a[href^="/servers/"]').first();
    if (await firstRow.count() === 0) {
      test.skip(true, '서버 목록이 비어 있습니다.');
      return;
    }
    await firstRow.click();
    await expect(page.getByRole('link', { name: '편집' })).toBeVisible();
    await expect(page.getByRole('button', { name: '폐기' })).toBeVisible();
  });
});
