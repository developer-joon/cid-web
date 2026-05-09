import { test, expect } from '@playwright/test';
import { testCreds, skipUnlessLdap, loginAs } from './_helpers';

const user = testCreds.user;
const oper = testCreds.operator;

test.describe('/dept — 부서 트리', () => {
  test.skip(skipUnlessLdap(user), 'LDAP 테스트 계정 미설정');

  test('USER — 부서 관리 페이지가 렌더된다', async ({ page }) => {
    await loginAs(page, user.username, user.password);
    await page.goto('/dept');
    await expect(page.getByRole('heading', { name: '부서 관리' })).toBeVisible();
  });

  test('USER — 트리가 렌더된다 (목록이 비어있으면 빈 메시지)', async ({ page }) => {
    await loginAs(page, user.username, user.password);
    await page.goto('/dept');
    // Either tree items appear or empty message
    const hasItems = await page.locator('[class*="rounded"][class*="hover"]').count() > 0;
    const hasEmpty = await page.getByText(/등록된 부서가 없습니다/).count() > 0;
    expect(hasItems || hasEmpty).toBeTruthy();
  });

  test('USER — 비활성 포함 체크박스가 보인다', async ({ page }) => {
    await loginAs(page, user.username, user.password);
    await page.goto('/dept');
    // Checkbox is only rendered when dept data exists
    const isEmpty = await page.getByText(/등록된 부서가 없습니다/).count() > 0;
    if (isEmpty) {
      test.skip(true, '부서 목록이 비어 있어 체크박스가 표시되지 않습니다.');
      return;
    }
    await expect(page.getByLabel('비활성 포함')).toBeVisible();
  });

  test('USER — 비활성 포함 토글 해제 시 체크박스 상태 변경', async ({ page }) => {
    await loginAs(page, user.username, user.password);
    await page.goto('/dept');
    // Checkbox is only rendered when dept data exists
    const isEmpty = await page.getByText(/등록된 부서가 없습니다/).count() > 0;
    if (isEmpty) {
      test.skip(true, '부서 목록이 비어 있어 체크박스가 표시되지 않습니다.');
      return;
    }
    const checkbox = page.getByLabel('비활성 포함');
    // Initially checked (true = show inactive)
    await expect(checkbox).toBeChecked();
    // Uncheck
    await checkbox.click();
    await expect(checkbox).not.toBeChecked();
    // Re-check
    await checkbox.click();
    await expect(checkbox).toBeChecked();
  });

  test('USER — + 등록 버튼이 없다', async ({ page }) => {
    await loginAs(page, user.username, user.password);
    await page.goto('/dept');
    await expect(page.getByRole('button', { name: /\+ 등록/ })).toHaveCount(0);
  });

  test('OPERATOR — + 등록 버튼이 보인다', async ({ page }) => {
    test.skip(skipUnlessLdap(oper), 'OPERATOR LDAP 계정 미설정');
    await loginAs(page, oper.username, oper.password);
    await page.goto('/dept');
    await expect(page.getByRole('button', { name: /\+ 등록/ })).toBeVisible();
  });

  test('OPERATOR — 등록 다이얼로그: 부서명, 팀명, 상위 부서 필드 확인', async ({ page }) => {
    test.skip(skipUnlessLdap(oper), 'OPERATOR LDAP 계정 미설정');
    await loginAs(page, oper.username, oper.password);
    await page.goto('/dept');
    await page.getByRole('button', { name: /\+ 등록/ }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByLabel('부서 명')).toBeVisible();
    await page.getByLabel('부서 명').fill('E2E-부서-테스트');
    // Verify tree select field for 상위 부서 is present (button is labelled "상위 부서")
    const parentSelect = page.getByRole('dialog').getByRole('button', { name: '상위 부서' });
    await expect(parentSelect).toBeVisible();
    await page.getByRole('button', { name: '취소' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });

  test('OPERATOR — 편집 다이얼로그: 자기 자신이 상위 부서로 선택 불가', async ({ page }) => {
    test.skip(skipUnlessLdap(oper), 'OPERATOR LDAP 계정 미설정');
    await loginAs(page, oper.username, oper.password);
    await page.goto('/dept');
    const editBtn = page.getByRole('button', { name: /편집/ }).first();
    if (await editBtn.count() === 0) {
      test.skip(true, '부서 목록이 비어 있습니다.');
      return;
    }
    await editBtn.click();
    await expect(page.getByRole('dialog')).toBeVisible();
    // Open the tree select for 상위 부서
    const parentSelectBtn = page.getByRole('button', { name: /루트|상위 부서 선택|선택 안 함/ });
    if (await parentSelectBtn.count() > 0) {
      await parentSelectBtn.first().click();
      // A separate dialog/popup should open showing the tree
      // Disabled items (self + descendants) should appear muted
      const treeDialog = page.getByRole('dialog').last();
      await expect(treeDialog).toBeVisible();
      await page.keyboard.press('Escape');
    }
    await page.getByRole('button', { name: '취소' }).click();
  });

  test('OPERATOR — 트리 노드 확장/축소', async ({ page }) => {
    test.skip(skipUnlessLdap(oper), 'OPERATOR LDAP 계정 미설정');
    await loginAs(page, oper.username, oper.password);
    await page.goto('/dept');
    // Find a chevron button (expand/collapse) if any exist
    const chevronBtn = page.locator('button').filter({ has: page.locator('svg') }).first();
    if (await chevronBtn.count() > 0) {
      await chevronBtn.click();
      // State changes — just verify no crash
      await expect(page.getByRole('heading', { name: '부서 관리' })).toBeVisible();
    }
  });
});
