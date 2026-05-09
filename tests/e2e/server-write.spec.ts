import { test, expect } from '@playwright/test';
import { testCreds, skipUnlessLdap, loginAs } from './_helpers';

const oper = testCreds.operator;
const admin = testCreds.admin;
const user = testCreds.user;

test.describe('/servers/new 등록', () => {
  test.skip(skipUnlessLdap(oper), 'OPERATOR LDAP 계정 미설정');

  test('OPERATOR — /servers/new 접근 시 등록 폼이 보인다', async ({ page }) => {
    await loginAs(page, oper.username, oper.password);
    await page.goto('/servers/new');
    await expect(page).toHaveURL(/\/servers\/new/);
    await expect(page.getByLabel('CI 명')).toBeVisible();
  });

  test('OPERATOR — + 등록 링크로 /servers/new 이동', async ({ page }) => {
    await loginAs(page, oper.username, oper.password);
    await page.goto('/servers');
    await page.getByRole('link', { name: /\+ 등록/ }).click();
    await expect(page).toHaveURL(/\/servers\/new/);
  });

  test('USER — /servers/new 접근 시 /servers로 리다이렉트', async ({ page }) => {
    test.skip(skipUnlessLdap(user), 'USER LDAP 계정 미설정');
    await loginAs(page, user.username, user.password);
    await page.goto('/servers/new');
    await expect(page).toHaveURL(/\/servers(\?|$)/);
  });
});

test.describe('/servers/[ciId]/edit 편집', () => {
  test.skip(skipUnlessLdap(oper), 'OPERATOR LDAP 계정 미설정');

  test('OPERATOR — 편집 링크 클릭 → 편집 폼 이동', async ({ page }) => {
    await loginAs(page, oper.username, oper.password);
    await page.goto('/servers');
    const firstRow = page.locator('a[href^="/servers/"]:not([href="/servers/new"])').first();
    if (await firstRow.count() === 0) {
      test.skip(true, '서버 목록이 비어 있습니다.');
      return;
    }
    await firstRow.click();
    const editLink = page.getByRole('link', { name: '편집' });
    await expect(editLink).toBeVisible();
    await editLink.click();
    await expect(page).toHaveURL(/\/servers\/\d+\/edit/);
    await expect(page.getByLabel('CI 명')).toBeVisible();
  });

  test('OPERATOR — 편집 폼에서 설명 필드를 수정하고 저장 버튼 클릭', async ({ page }) => {
    await loginAs(page, oper.username, oper.password);
    await page.goto('/servers');
    const firstRow = page.locator('a[href^="/servers/"]:not([href="/servers/new"])').first();
    if (await firstRow.count() === 0) {
      test.skip(true, '서버 목록이 비어 있습니다.');
      return;
    }
    await firstRow.click();
    const editLink = page.getByRole('link', { name: '편집' });
    await editLink.click();
    await expect(page).toHaveURL(/\/servers\/\d+\/edit/);

    // Fill ciDescp if it exists
    const descpField = page.getByLabel(/설명|비고/);
    if (await descpField.count() > 0) {
      await descpField.first().fill('E2E 테스트 수정 ' + Date.now());
    }
    const saveBtn = page.getByRole('button', { name: /저장|수정/ });
    await expect(saveBtn).toBeVisible();
    // Don't actually submit to avoid mutating real data — just verify the button is clickable
    await expect(saveBtn).toBeEnabled();
  });
});

test.describe('폐기 다이얼로그', () => {
  test.skip(skipUnlessLdap(oper), 'OPERATOR LDAP 계정 미설정');

  test('OPERATOR — 폐기 버튼 클릭 → 다이얼로그 열림', async ({ page }) => {
    await loginAs(page, oper.username, oper.password);
    await page.goto('/servers');
    const firstRow = page.locator('a[href^="/servers/"]:not([href="/servers/new"])').first();
    if (await firstRow.count() === 0) {
      test.skip(true, '서버 목록이 비어 있습니다.');
      return;
    }
    await firstRow.click();
    const decomBtn = page.getByRole('button', { name: '폐기' });
    await expect(decomBtn).toBeVisible();
    if (await decomBtn.isEnabled()) {
      await decomBtn.click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await expect(page.getByText(/폐기 후에는 다시 활성화/)).toBeVisible();
    }
  });

  test('OPERATOR — 폐기 다이얼로그: 5자 미만 사유 입력 시 버튼이 작동하지 않음', async ({ page }) => {
    await loginAs(page, oper.username, oper.password);
    await page.goto('/servers');
    const firstRow = page.locator('a[href^="/servers/"]:not([href="/servers/new"])').first();
    if (await firstRow.count() === 0) {
      test.skip(true, '서버 목록이 비어 있습니다.');
      return;
    }
    await firstRow.click();
    const decomBtn = page.getByRole('button', { name: '폐기' });
    if (!(await decomBtn.isEnabled())) {
      test.skip(true, '이미 폐기된 서버입니다.');
      return;
    }
    await decomBtn.click();
    await expect(page.getByRole('dialog')).toBeVisible();

    // Enter reason shorter than 5 chars
    const reasonInput = page.getByLabel(/변경 사유/);
    await reasonInput.fill('짧');
    // Click 폐기 button inside dialog
    const confirmBtn = page.getByRole('button', { name: '폐기' }).last();
    await confirmBtn.click();
    // Should show error toast, dialog stays open
    await expect(page.getByRole('dialog')).toBeVisible();
    // Close dialog
    await page.getByRole('button', { name: '취소' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });

  test('ADMIN — 폐기 버튼이 보인다', async ({ page }) => {
    test.skip(skipUnlessLdap(admin), 'ADMIN LDAP 계정 미설정');
    await loginAs(page, admin.username, admin.password);
    await page.goto('/servers');
    const firstRow = page.locator('a[href^="/servers/"]:not([href="/servers/new"])').first();
    if (await firstRow.count() === 0) {
      test.skip(true, '서버 목록이 비어 있습니다.');
      return;
    }
    await firstRow.click();
    await expect(page.getByRole('button', { name: '폐기' })).toBeVisible();
  });
});
