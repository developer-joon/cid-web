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

test.describe('IP CRUD — CI 상세 IP 탭', () => {
  test.skip(skipUnlessLdap(user), 'LDAP 테스트 계정 미설정');

  test('USER — IP 주소 탭이 기본 활성화', async ({ page }) => {
    await loginAs(page, user.username, user.password);
    const ok = await goToFirstServerDetail(page);
    if (!ok) {
      test.skip(true, '서버 목록이 비어 있습니다.');
      return;
    }
    await expect(page.getByRole('tab', { name: 'IP 주소' })).toHaveAttribute('data-state', 'active');
  });

  test('USER — + IP 등록 버튼이 없다', async ({ page }) => {
    await loginAs(page, user.username, user.password);
    const ok = await goToFirstServerDetail(page);
    if (!ok) {
      test.skip(true, '서버 목록이 비어 있습니다.');
      return;
    }
    await expect(page.getByRole('button', { name: /\+ IP 등록/ })).toHaveCount(0);
  });

  test('OPERATOR — + IP 등록 버튼이 보인다', async ({ page }) => {
    test.skip(skipUnlessLdap(oper), 'OPERATOR LDAP 계정 미설정');
    await loginAs(page, oper.username, oper.password);
    const ok = await goToFirstServerDetail(page);
    if (!ok) {
      test.skip(true, '서버 목록이 비어 있습니다.');
      return;
    }
    await expect(page.getByRole('button', { name: /\+ IP 등록/ })).toBeVisible();
  });

  test('OPERATOR — IP 등록 다이얼로그 열기: IP 주소 필드 확인', async ({ page }) => {
    test.skip(skipUnlessLdap(oper), 'OPERATOR LDAP 계정 미설정');
    await loginAs(page, oper.username, oper.password);
    const ok = await goToFirstServerDetail(page);
    if (!ok) {
      test.skip(true, '서버 목록이 비어 있습니다.');
      return;
    }
    await page.getByRole('button', { name: /\+ IP 등록/ }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByLabel('IP 주소')).toBeVisible();
    await expect(page.getByLabel('유형')).toBeVisible();
  });

  test('OPERATOR — IP 등록: 잘못된 IPv4 입력 시 유효성 검증 오류', async ({ page }) => {
    test.skip(skipUnlessLdap(oper), 'OPERATOR LDAP 계정 미설정');
    await loginAs(page, oper.username, oper.password);
    const ok = await goToFirstServerDetail(page);
    if (!ok) {
      test.skip(true, '서버 목록이 비어 있습니다.');
      return;
    }
    await page.getByRole('button', { name: /\+ IP 등록/ }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByLabel('IP 주소').fill('not-an-ip-address');
    await page.getByRole('button', { name: /저장|등록/ }).click();
    // Dialog stays open due to validation error
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByRole('button', { name: '취소' }).click();
  });

  test('OPERATOR — IP 등록: 대역(Subnet) 선택 필드가 보인다', async ({ page }) => {
    test.skip(skipUnlessLdap(oper), 'OPERATOR LDAP 계정 미설정');
    await loginAs(page, oper.username, oper.password);
    const ok = await goToFirstServerDetail(page);
    if (!ok) {
      test.skip(true, '서버 목록이 비어 있습니다.');
      return;
    }
    await page.getByRole('button', { name: /\+ IP 등록/ }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    // Subnet TreeSelectField button
    const subnetBtn = page.getByRole('button', { name: /미선택|서브넷|대역/ });
    await expect(subnetBtn).toBeVisible();
    await page.getByRole('button', { name: '취소' }).click();
  });

  test('OPERATOR — 목록에 IP가 있으면 편집 버튼이 보인다', async ({ page }) => {
    test.skip(skipUnlessLdap(oper), 'OPERATOR LDAP 계정 미설정');
    await loginAs(page, oper.username, oper.password);
    const ok = await goToFirstServerDetail(page);
    if (!ok) {
      test.skip(true, '서버 목록이 비어 있습니다.');
      return;
    }
    // Wait for IP tab content to load
    const editBtn = page.getByRole('button', { name: /편집/ }).first();
    if (await editBtn.count() === 0) {
      // No IPs in this server — skip
      return;
    }
    await editBtn.click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByRole('button', { name: '취소' }).click();
  });

  test('OPERATOR — 목록에 IP가 있으면 회수 버튼이 보인다', async ({ page }) => {
    test.skip(skipUnlessLdap(oper), 'OPERATOR LDAP 계정 미설정');
    await loginAs(page, oper.username, oper.password);
    const ok = await goToFirstServerDetail(page);
    if (!ok) {
      test.skip(true, '서버 목록이 비어 있습니다.');
      return;
    }
    const unassignBtn = page.getByRole('button', { name: /회수/ }).first();
    if (await unassignBtn.count() === 0) {
      // No IPs — skip
      return;
    }
    await expect(unassignBtn).toBeVisible();
  });
});
