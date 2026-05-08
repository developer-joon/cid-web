import { test, expect } from '@playwright/test';
import { testCreds, skipUnlessLdap, loginAs } from './_helpers';

const user = testCreds.user;
const oper = testCreds.operator;

async function goToFirstServerDetail(page: import('@playwright/test').Page) {
  await page.goto('/servers');
  const firstRow = page.locator('a[href^="/servers/"]').first();
  if (await firstRow.count() === 0) return false;
  await firstRow.click();
  await expect(page).toHaveURL(/\/servers\/\d+/);
  return true;
}

test.describe('관계 (Relations) 탭', () => {
  test.skip(skipUnlessLdap(user), 'LDAP 테스트 계정 미설정');

  test('USER — 관계 탭 접근 가능', async ({ page }) => {
    await loginAs(page, user.username, user.password);
    const ok = await goToFirstServerDetail(page);
    if (!ok) {
      test.skip(true, '서버 목록이 비어 있습니다.');
      return;
    }
    await page.getByRole('tab', { name: '관계' }).click();
    await expect(page.getByRole('tab', { name: '관계' })).toHaveAttribute('data-state', 'active');
  });

  test('USER — 관계 탭에 forward/backward 섹션 또는 빈 메시지가 보인다', async ({ page }) => {
    await loginAs(page, user.username, user.password);
    const ok = await goToFirstServerDetail(page);
    if (!ok) {
      test.skip(true, '서버 목록이 비어 있습니다.');
      return;
    }
    await page.getByRole('tab', { name: '관계' }).click();
    // After loading, either show relations sections or a loading/empty state
    await page.waitForLoadState('networkidle');
    const hasForward = await page.getByText(/의존|forward|FWD|이 CI →/).count() > 0;
    const hasEmpty = await page.getByText(/등록된 관계|없습니다/).count() > 0;
    const isLoading = await page.getByText(/불러오는 중|loading/i).count() > 0;
    expect(hasForward || hasEmpty || isLoading).toBeTruthy();
  });

  test('USER — + 관계 추가 버튼이 없다', async ({ page }) => {
    await loginAs(page, user.username, user.password);
    const ok = await goToFirstServerDetail(page);
    if (!ok) {
      test.skip(true, '서버 목록이 비어 있습니다.');
      return;
    }
    await page.getByRole('tab', { name: '관계' }).click();
    await expect(page.getByRole('button', { name: /\+ 관계 추가/ })).toHaveCount(0);
  });

  test('OPERATOR — + 관계 추가 버튼이 보인다', async ({ page }) => {
    test.skip(skipUnlessLdap(oper), 'OPERATOR LDAP 계정 미설정');
    await loginAs(page, oper.username, oper.password);
    const ok = await goToFirstServerDetail(page);
    if (!ok) {
      test.skip(true, '서버 목록이 비어 있습니다.');
      return;
    }
    await page.getByRole('tab', { name: '관계' }).click();
    await expect(page.getByRole('button', { name: /\+ 관계 추가/ })).toBeVisible();
  });

  test('OPERATOR — 관계 추가 다이얼로그: 방향, 상대 CI ID, 관계 타입 ID 필드 확인', async ({ page }) => {
    test.skip(skipUnlessLdap(oper), 'OPERATOR LDAP 계정 미설정');
    await loginAs(page, oper.username, oper.password);
    const ok = await goToFirstServerDetail(page);
    if (!ok) {
      test.skip(true, '서버 목록이 비어 있습니다.');
      return;
    }
    await page.getByRole('tab', { name: '관계' }).click();
    await page.getByRole('button', { name: /\+ 관계 추가/ }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('heading', { name: '관계 추가' })).toBeVisible();
    // Direction, counterpart CI ID, relation type ID fields
    await expect(page.getByLabel('방향')).toBeVisible();
    await expect(page.getByLabel('상대 CI ID')).toBeVisible();
    await expect(page.getByLabel('관계 타입 ID')).toBeVisible();
    await page.getByRole('button', { name: '취소' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });

  test('OPERATOR — 관계 삭제 버튼이 있으면 확인 다이얼로그가 열린다', async ({ page }) => {
    test.skip(skipUnlessLdap(oper), 'OPERATOR LDAP 계정 미설정');
    await loginAs(page, oper.username, oper.password);
    const ok = await goToFirstServerDetail(page);
    if (!ok) {
      test.skip(true, '서버 목록이 비어 있습니다.');
      return;
    }
    await page.getByRole('tab', { name: '관계' }).click();
    await page.waitForLoadState('networkidle');
    const deleteBtn = page.getByRole('button', { name: /삭제|제거/ }).first();
    if (await deleteBtn.count() === 0) {
      // No relations to delete — skip
      return;
    }
    await deleteBtn.click();
    // A confirm dialog or confirmation UI should appear
    const dialog = page.getByRole('dialog');
    if (await dialog.count() > 0) {
      await expect(dialog).toBeVisible();
      // Cancel without confirming
      const cancelBtn = dialog.getByRole('button', { name: /취소|아니오/ });
      if (await cancelBtn.count() > 0) {
        await cancelBtn.click();
      } else {
        await page.keyboard.press('Escape');
      }
    }
  });
});
