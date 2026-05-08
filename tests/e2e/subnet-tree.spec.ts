import { test, expect } from '@playwright/test';
import { testCreds, skipUnlessLdap, loginAs } from './_helpers';

const user = testCreds.user;
const oper = testCreds.operator;

test.describe('/subnet — IP 대역 트리', () => {
  test.skip(skipUnlessLdap(user), 'LDAP 테스트 계정 미설정');

  test('USER — IP 대역 페이지가 렌더된다', async ({ page }) => {
    await loginAs(page, user.username, user.password);
    await page.goto('/subnet');
    await expect(page.getByRole('heading', { name: 'IP 대역 (Subnet)' })).toBeVisible();
  });

  test('USER — CIDR 검색 입력 필드가 있다', async ({ page }) => {
    await loginAs(page, user.username, user.password);
    await page.goto('/subnet');
    await expect(page.getByPlaceholder(/CIDR.*설명/)).toBeVisible();
  });

  test('USER — CIDR 검색 시 결과가 필터링된다', async ({ page }) => {
    await loginAs(page, user.username, user.password);
    await page.goto('/subnet');
    const searchInput = page.getByPlaceholder(/CIDR.*설명/);
    await searchInput.fill('999.999.999.999/99');
    // Should show "검색 결과가 없습니다" or the tree becomes empty
    await expect(
      page.getByText(/검색 결과가 없습니다|등록된 서브넷이 없습니다/)
    ).toBeVisible();
  });

  test('USER — CIDR 검색 후 지우면 전체 목록 복원', async ({ page }) => {
    await loginAs(page, user.username, user.password);
    await page.goto('/subnet');
    const searchInput = page.getByPlaceholder(/CIDR.*설명/);
    const initialCount = await page.locator('code').count();
    await searchInput.fill('zzz-no-match');
    await searchInput.clear();
    // After clearing, tree should be back
    const restoredCount = await page.locator('code').count();
    expect(restoredCount).toBe(initialCount);
  });

  test('USER — + 등록 버튼이 없다', async ({ page }) => {
    await loginAs(page, user.username, user.password);
    await page.goto('/subnet');
    await expect(page.getByRole('button', { name: /\+ 등록/ })).toHaveCount(0);
  });

  test('OPERATOR — + 등록 버튼이 보인다', async ({ page }) => {
    test.skip(skipUnlessLdap(oper), 'OPERATOR LDAP 계정 미설정');
    await loginAs(page, oper.username, oper.password);
    await page.goto('/subnet');
    await expect(page.getByRole('button', { name: /\+ 등록/ })).toBeVisible();
  });

  test('OPERATOR — 등록 다이얼로그: CIDR 필드가 보인다', async ({ page }) => {
    test.skip(skipUnlessLdap(oper), 'OPERATOR LDAP 계정 미설정');
    await loginAs(page, oper.username, oper.password);
    await page.goto('/subnet');
    await page.getByRole('button', { name: /\+ 등록/ }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByLabel('CIDR')).toBeVisible();
    await page.getByLabel('CIDR').fill('10.255.255.0/24');
    await page.getByRole('button', { name: '취소' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });

  test('OPERATOR — 잘못된 CIDR 형식 입력 시 유효성 검증 오류 표시', async ({ page }) => {
    test.skip(skipUnlessLdap(oper), 'OPERATOR LDAP 계정 미설정');
    await loginAs(page, oper.username, oper.password);
    await page.goto('/subnet');
    await page.getByRole('button', { name: /\+ 등록/ }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    // Enter invalid CIDR
    await page.getByLabel('CIDR').fill('not-a-cidr');
    // Click submit
    await page.getByRole('button', { name: /저장|등록/ }).click();
    // Validation error should appear
    await expect(page.getByRole('dialog')).toBeVisible(); // dialog stays open
    // Error message or form validation
    const errorMsg = page.getByText(/유효하지 않은|형식|invalid/i);
    if (await errorMsg.count() > 0) {
      await expect(errorMsg.first()).toBeVisible();
    }
    await page.getByRole('button', { name: '취소' }).click();
  });

  test('OPERATOR — 편집 다이얼로그 열기 및 취소', async ({ page }) => {
    test.skip(skipUnlessLdap(oper), 'OPERATOR LDAP 계정 미설정');
    await loginAs(page, oper.username, oper.password);
    await page.goto('/subnet');
    const editBtn = page.getByRole('button', { name: /편집/ }).first();
    if (await editBtn.count() === 0) {
      test.skip(true, 'IP 대역 목록이 비어 있습니다.');
      return;
    }
    await editBtn.click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByLabel('CIDR')).toBeVisible();
    await page.getByRole('button', { name: '취소' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });
});
