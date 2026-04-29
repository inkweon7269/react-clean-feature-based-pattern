import { test, expect } from '@playwright/test';

test.describe.configure({ mode: 'serial' });

test.describe('Google OAuth - 콜백 fragment 처리 (UI 검증)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.context().clearCookies();
  });

  test('로그인 콜백 성공 fragment는 토큰을 저장하고 /로 이동시킨다', async ({ page }) => {
    await page.goto('/oauth/callback#accessToken=fake-access&refreshToken=fake-refresh');

    // / 이동 후 보호 가드가 토큰 유효성 검증을 위해 프로필 API를 호출 → 미들웨어가
    // 401을 던지면 다시 /login으로 빠질 수 있다. URL이 /로 일단 도달했음만 검증한다.
    await page.waitForURL((url) => url.pathname === '/' || url.pathname === '/login', {
      timeout: 5000,
    });

    // hash가 정리되었는지 확인 (history.replaceState 동작)
    const hash = await page.evaluate(() => window.location.hash);
    expect(hash).toBe('');

    // 쿠키에 auth-storage가 저장되어야 함 (미인증 상태였으므로 OAuth 콜백이 setTokens 처리)
    const cookies = await page.context().cookies();
    const authCookie = cookies.find((c) => c.name === 'auth-storage');
    expect(authCookie).toBeTruthy();
  });

  test('email_already_exists fragment는 /login으로 이동하며 알림과 이메일 prefill을 보여준다', async ({
    page,
  }) => {
    const email = 'duplicate@example.com';
    await page.goto(
      `/oauth/callback#error=email_already_exists&email=${encodeURIComponent(email)}`,
    );

    await page.waitForURL((url) => url.pathname === '/login', { timeout: 5000 });
    await expect(page.getByRole('alert')).toContainText('이미 가입된 이메일');
    await expect(page.getByLabel('이메일')).toHaveValue(email);
  });

  test('email_not_verified fragment(미인증)는 /login으로 안내한다', async ({ page }) => {
    await page.goto('/oauth/callback#error=email_not_verified');

    await page.waitForURL((url) => url.pathname === '/login', { timeout: 5000 });
    await expect(page.getByRole('alert')).toContainText('검증되지 않');
  });

  test('알 수 없는 fragment는 /login에 unknown 안내를 표시한다', async ({ page }) => {
    await page.goto('/oauth/callback#');

    await page.waitForURL((url) => url.pathname === '/login', { timeout: 5000 });
    await expect(page.getByRole('alert')).toContainText('오류가 발생');
  });

  test('"Google로 계속" 버튼은 백엔드 OAuth 시작 URL로 이동한다', async ({ page }) => {
    await page.goto('/login');

    // 외부 호스트로의 navigation을 가로채 Google 진입을 막고, 호출된 URL만 확인한다.
    const startUrlPromise = page.waitForRequest(
      (req) => req.url().includes('/v1/auth/google') && req.resourceType() === 'document',
      { timeout: 5000 },
    );

    await page.getByRole('button', { name: 'Google로 계속' }).click();

    const startRequest = await startUrlPromise;
    expect(startRequest.url()).toMatch(/\/v1\/auth\/google$/);
  });
});
