import { test, expect } from '@playwright/test';

test.describe.configure({ mode: 'serial' });

const uniqueEmail = () => {
  const ts = Date.now();
  const rnd = Math.random().toString(36).slice(2, 8);
  return `e2e_${ts}_${rnd}@example.com`;
};

test.describe('인증 흐름 - UI 검증', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.context().clearCookies();
  });

  test('비인증 사용자는 / 접근 시 /login으로 리다이렉트된다', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/login$/);
  });

  test('로그인 폼이 올바르게 렌더링된다', async ({ page }) => {
    await page.goto('/login');

    await expect(page.getByLabel('이메일')).toBeVisible();
    await expect(page.getByLabel('비밀번호')).toBeVisible();
    await expect(page.getByRole('button', { name: '로그인' })).toBeVisible();
    await expect(page.getByRole('link', { name: '회원가입' })).toBeVisible();
  });

  test('빈 로그인 폼 제출 시 유효성 에러를 표시한다', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: '로그인' }).click();

    await expect(page.getByText('이메일을 입력해주세요')).toBeVisible();
    await expect(page.getByText('비밀번호를 입력해주세요', { exact: true })).toBeVisible();
  });

  test('회원가입 페이지로 이동할 수 있다', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('link', { name: '회원가입' }).click();

    await expect(page).toHaveURL(/\/register$/);
    await expect(page.getByRole('button', { name: '회원가입' })).toBeVisible();
  });

  test('빈 회원가입 폼 제출 시 유효성 에러를 표시한다', async ({ page }) => {
    await page.goto('/register');
    await page.getByRole('button', { name: '회원가입' }).click();

    await expect(page.getByText('이메일을 입력해주세요')).toBeVisible();
    await expect(page.getByText('이름을 입력해주세요')).toBeVisible();
    await expect(page.getByText('비밀번호는 8자 이상이어야 합니다')).toBeVisible();
  });

  test('짧은 비밀번호 입력 시 유효성 에러를 표시한다', async ({ page }) => {
    await page.goto('/register');
    await page.getByLabel('이메일').fill('test@example.com');
    await page.getByLabel('이름').fill('테스트');
    await page.getByLabel('비밀번호').fill('short');
    await page.getByRole('button', { name: '회원가입' }).click();

    await expect(page.getByText('비밀번호는 8자 이상이어야 합니다')).toBeVisible();
  });
});

test.describe('인증 흐름 - 백엔드 API 연동', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.context().clearCookies();
  });

  test('잘못된 자격증명으로 로그인 시 에러 메시지를 표시한다', async ({ page }) => {
    await page.goto('/login');

    await page.getByLabel('이메일').fill('nonexistent_user_xyz@example.com');
    await page.getByLabel('비밀번호').fill('wrongpassword');
    await page.getByRole('button', { name: '로그인' }).click();

    const errorMessage = page.locator('p.text-destructive').last();
    await expect(errorMessage).toBeVisible({ timeout: 10000 });
  });

  test('회원가입 → 로그인 → 프로필 → 로그아웃 전체 흐름', async ({ page }) => {
    const email = uniqueEmail();
    const password = 'password123';
    const name = '홍길동';

    // 1) 회원가입 (마케팅 수신 동의 포함)
    await page.goto('/register');
    await page.getByLabel('이메일').fill(email);
    await page.getByLabel('이름').fill(name);
    await page.getByLabel('비밀번호').fill(password);
    await page.getByRole('checkbox', { name: '마케팅 정보 수신에 동의합니다 (선택)' }).click();
    await page.getByRole('button', { name: '회원가입' }).click();

    // 회원가입 성공 시 /login으로 리다이렉트
    await expect(page).toHaveURL(/\/login$/, { timeout: 10000 });

    // 2) 방금 가입한 계정으로 로그인
    await page.getByLabel('이메일').fill(email);
    await page.getByLabel('비밀번호').fill(password);
    await page.getByRole('button', { name: '로그인' }).click();

    // 로그인 성공 시 / (프로필)로 이동
    await expect(page).toHaveURL(/\/$/, { timeout: 10000 });

    // 3) 프로필 정보 확인 (마케팅 동의 상태 포함)
    await expect(page.getByText(name)).toBeVisible();
    await expect(page.getByText(email)).toBeVisible();
    await expect(page.getByText('동의함')).toBeVisible();

    // 4) 로그아웃
    await page.getByRole('button', { name: '로그아웃' }).click();
    await expect(page).toHaveURL(/\/login$/, { timeout: 10000 });
  });

  test('인증된 사용자가 /login 접근 시 /로 리다이렉트된다', async ({ page }) => {
    const email = uniqueEmail();
    const password = 'password123';

    // 회원가입 + 로그인으로 인증 상태 만들기
    await page.goto('/register');
    await page.getByLabel('이메일').fill(email);
    await page.getByLabel('이름').fill('테스트');
    await page.getByLabel('비밀번호').fill(password);
    await page.getByRole('button', { name: '회원가입' }).click();
    await expect(page).toHaveURL(/\/login$/, { timeout: 10000 });

    await page.getByLabel('이메일').fill(email);
    await page.getByLabel('비밀번호').fill(password);
    await page.getByRole('button', { name: '로그인' }).click();
    await expect(page).toHaveURL(/\/$/, { timeout: 10000 });

    // 인증된 상태에서 /login 접근 시 /로 리다이렉트
    await page.goto('/login');
    await expect(page).toHaveURL(/\/$/);
  });
});
