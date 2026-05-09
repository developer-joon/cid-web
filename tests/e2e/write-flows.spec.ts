import { test, expect, type Page } from '@playwright/test';
import { testCreds, skipUnlessLdap, loginAs } from './_helpers';

const oper = testCreds.operator;

// One stamp per spec run — used to make every created entity uniquely named
// so reruns don't collide and we can locate exactly what we created.
const STAMP = Date.now().toString().slice(-9);

const NAMES = {
  vendor: `E2E-V-${STAMP}`,
  locSite: `E2E-LOC-${STAMP}`,
  rackCd: `E2E-R-${STAMP}`.slice(0, 30),
  dept: `E2E-D-${STAMP}`,
  // CIDR uses third octet from stamp tail (0-255) to avoid duplicates across runs
  subnetCidr: `10.${(parseInt(STAMP.slice(-3), 10) % 200) + 20}.${
    (parseInt(STAMP.slice(-2), 10) % 200) + 1
  }.0/24`,
  server: `E2E-SRV-${STAMP}`,
  ip: `10.${(parseInt(STAMP.slice(-3), 10) % 200) + 20}.${
    (parseInt(STAMP.slice(-2), 10) % 200) + 1
  }.${(parseInt(STAMP.slice(-1), 10) % 50) + 10}`,
};

// Carry IDs/state across tests in this file
const ctx: { ciId?: string; subnetCreated?: boolean } = {};

async function expectToastSuccess(page: Page, fragment = '등록') {
  // Sonner toast: role="status" / aria-live region with the text "등록되었습니다."
  await expect(page.getByText(new RegExp(`${fragment}.*되었습니다`)).first()).toBeVisible({
    timeout: 10_000,
  });
}

test.describe.serial('저장 플로우 — 마스터부터 서버/IP까지', () => {
  test.skip(skipUnlessLdap(oper), 'OPERATOR LDAP 계정 미설정');

  test('벤더 저장', async ({ page }) => {
    await loginAs(page, oper.username, oper.password);
    await page.goto('/vendor');
    await page.getByRole('button', { name: /\+ 등록/ }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    await dialog.getByLabel('벤더 명').fill(NAMES.vendor);
    // Optional: select 유형 (HW)
    await dialog.getByRole('combobox').first().click();
    await page.getByRole('option', { name: 'HW' }).click();

    await dialog.getByRole('button', { name: '저장' }).click();
    await expectToastSuccess(page);
    await expect(dialog).toBeHidden();
    // 목록이 invalidate 후 새 벤더가 보임
    await expect(page.getByText(NAMES.vendor).first()).toBeVisible({ timeout: 10_000 });
  });

  test('위치 저장', async ({ page }) => {
    await loginAs(page, oper.username, oper.password);
    await page.goto('/location');
    await page.getByRole('button', { name: /\+ 등록/ }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    await dialog.getByLabel('사이트').fill(NAMES.locSite);
    await dialog.getByLabel('층').fill('1F');
    // 유형 (IDC)
    await dialog.getByRole('combobox').first().click();
    await page.getByRole('option', { name: 'IDC' }).click();

    await dialog.getByRole('button', { name: '저장' }).click();
    await expectToastSuccess(page);
    await expect(dialog).toBeHidden();
    await expect(page.getByText(NAMES.locSite).first()).toBeVisible({ timeout: 10_000 });
  });

  test('렉 저장 (위치 의존)', async ({ page }) => {
    await loginAs(page, oper.username, oper.password);
    await page.goto('/rack');
    await page.getByRole('button', { name: /\+ 등록/ }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    await dialog.getByLabel('렉 코드').fill(NAMES.rackCd);
    // 위치 셀렉트 — 우리가 만든 위치를 선택
    await dialog.getByRole('combobox').first().click();
    await page.getByRole('option', { name: new RegExp(NAMES.locSite) }).click();

    await dialog.getByRole('button', { name: '저장' }).click();
    await expectToastSuccess(page);
    await expect(dialog).toBeHidden();
    await expect(page.getByText(NAMES.rackCd).first()).toBeVisible({ timeout: 10_000 });
  });

  test('부서 저장', async ({ page }) => {
    await loginAs(page, oper.username, oper.password);
    await page.goto('/dept');
    await page.getByRole('button', { name: /\+ 등록/ }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    await dialog.getByLabel('부서 명').fill(NAMES.dept);
    await dialog.getByLabel('팀 명').fill('E2E팀');
    // 상위 부서는 기본값 (루트) — 그대로 둠
    await dialog.getByRole('button', { name: '저장' }).click();
    await expectToastSuccess(page);
    await expect(dialog).toBeHidden();
    await expect(page.getByText(NAMES.dept).first()).toBeVisible({ timeout: 10_000 });
  });

  test('서브넷 저장', async ({ page }) => {
    await loginAs(page, oper.username, oper.password);
    await page.goto('/subnet');
    await page.getByRole('button', { name: /\+ 등록/ }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    await dialog.getByLabel('CIDR').fill(NAMES.subnetCidr);
    await dialog.getByLabel('설명').fill(`E2E ${STAMP}`);

    await dialog.getByRole('button', { name: '저장' }).click();
    await expectToastSuccess(page);
    await expect(dialog).toBeHidden();
    await expect(page.getByText(NAMES.subnetCidr).first()).toBeVisible({ timeout: 10_000 });
    ctx.subnetCreated = true;
  });

  test('서버 저장 (ciNm만 필수)', async ({ page }) => {
    await loginAs(page, oper.username, oper.password);
    await page.goto('/servers/new');
    await expect(page).toHaveURL(/\/servers\/new/);

    await page.getByLabel('CI 명').fill(NAMES.server);
    // optional 필드 약간만 채움
    await page.getByLabel('업무영역').fill('E2E-WMS');

    await page.getByRole('button', { name: /^저장$/ }).click();
    // 저장 성공 시 /servers/{ciId} 로 리다이렉트
    await page.waitForURL(/\/servers\/\d+/, { timeout: 15_000 });

    const m = page.url().match(/\/servers\/(\d+)/);
    if (!m) throw new Error('ciId를 URL에서 찾지 못했습니다.');
    ctx.ciId = m[1];
    // 상세 페이지에 서버 명이 보임
    await expect(page.getByText(NAMES.server).first()).toBeVisible({ timeout: 10_000 });
  });

  test('IP 저장 (서버 의존)', async ({ page }) => {
    test.skip(!ctx.ciId, '서버 저장이 선행되지 않음');
    await loginAs(page, oper.username, oper.password);
    await page.goto(`/servers/${ctx.ciId}`);
    await page.getByRole('button', { name: /\+ IP 등록/ }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    await dialog.getByLabel('IP 주소').fill(NAMES.ip);
    // 호스트명 약간만
    await dialog.getByLabel('호스트명').fill(`e2e-host-${STAMP}`);

    await dialog.getByRole('button', { name: '저장' }).click();
    await expectToastSuccess(page, 'IP');
    await expect(dialog).toBeHidden();
    // IP 탭에 노출
    await expect(page.getByText(NAMES.ip).first()).toBeVisible({ timeout: 10_000 });
  });
});
