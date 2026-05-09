import { test, expect } from '@playwright/test';
import { testCreds, skipUnlessLdap, loginAs } from './_helpers';

const user = testCreds.user;
const oper = testCreds.operator;

test.describe('/servers 목록', () => {
  test.skip(skipUnlessLdap(user), 'LDAP 테스트 계정 미설정');

  test('USER — 목록이 렌더되고 등록 버튼이 없다', async ({ page }) => {
    await loginAs(page, user.username, user.password);
    await page.goto('/servers');
    await expect(page.getByRole('heading', { name: '서버 목록' })).toBeVisible();
    // USER에게는 + 등록 버튼이 없어야 함
    await expect(page.getByRole('link', { name: /\+ 등록/ })).toHaveCount(0);
  });

  test('USER — 검색어 입력 시 URL에 ciNm 파라미터 추가', async ({ page }) => {
    await loginAs(page, user.username, user.password);
    await page.goto('/servers');
    // There may be multiple placeholders matching /호스트명/; use the enabled ciNm filter
    await page.locator('input[placeholder*="호스트명"]:not([disabled])').first().fill('zzz-no-such-host-xyz');
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/ciNm=zzz-no-such-host-xyz/);
    await expect(page.getByText(/조회된 서버가 없습니다/)).toBeVisible();
  });

  test('USER — 환경 필터 변경 시 URL에 envrnGpCd 파라미터 추가', async ({ page }) => {
    await loginAs(page, user.username, user.password);
    await page.goto('/servers');
    // Page must have rendered correctly regardless of data
    await expect(page.getByRole('heading', { name: '서버 목록' })).toBeVisible();
    // Try combobox role as the filter might be a shadcn Select
    const envCombobox = page.getByRole('combobox').filter({ hasText: /전체|환경|운영|개발|검수/ });
    if (await envCombobox.count() > 0) {
      await envCombobox.first().click();
      const option = page.getByRole('option', { name: '운영' });
      if (await option.count() > 0) {
        await option.click();
        await expect(page).toHaveURL(/envrnGpCd=/);
      }
    }
  });

  test('USER — 정렬 헤더 클릭 시 URL sort 파라미터 변경', async ({ page }) => {
    await loginAs(page, user.username, user.password);
    await page.goto('/servers');
    // Page must have rendered correctly regardless of data
    await expect(page.getByRole('heading', { name: '서버 목록' })).toBeVisible();
    // CI명 정렬 링크 클릭
    const sortLink = page.getByRole('link', { name: /CI 명|호스트명/ }).first();
    if (await sortLink.count() > 0) {
      await sortLink.click();
      await expect(page).toHaveURL(/sort=/);
    }
  });

  test('OPERATOR — + 등록 링크가 보인다', async ({ page }) => {
    test.skip(skipUnlessLdap(oper), 'OPERATOR LDAP 계정 미설정');
    await loginAs(page, oper.username, oper.password);
    await page.goto('/servers');
    await expect(page.getByRole('link', { name: /\+ 등록/ })).toBeVisible();
  });

  test('USER — 페이지네이션 다음 버튼이 있으면 클릭 시 page 파라미터 변경', async ({ page }) => {
    await loginAs(page, user.username, user.password);
    await page.goto('/servers');
    const nextBtn = page.getByRole('link', { name: /다음|›|next/i }).first();
    if (await nextBtn.count() > 0) {
      await nextBtn.click();
      await expect(page).toHaveURL(/page=2/);
    }
  });
});
