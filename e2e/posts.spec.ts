import { test, expect } from '@playwright/test';

test.describe.configure({ mode: 'serial' });

const uniqueEmail = () => {
  const ts = Date.now();
  const rnd = Math.random().toString(36).slice(2, 8);
  return `e2e_posts_${ts}_${rnd}@example.com`;
};

const uniqueTitle = () => {
  const ts = Date.now();
  const rnd = Math.random().toString(36).slice(2, 8);
  return `e2e-title-${ts}-${rnd}`;
};

async function registerAndLogin(page: import('@playwright/test').Page) {
  const email = uniqueEmail();
  const password = 'password123';

  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.context().clearCookies();

  await page.goto('/register');
  await page.getByLabel('이메일').fill(email);
  await page.getByLabel('이름').fill('테스트유저');
  await page.getByLabel('비밀번호').fill(password);
  await page.getByRole('button', { name: '회원가입' }).click();
  await expect(page).toHaveURL(/\/login$/, { timeout: 10000 });

  await page.getByLabel('이메일').fill(email);
  await page.getByLabel('비밀번호').fill(password);
  await page.getByRole('button', { name: '로그인' }).click();
  await expect(page).toHaveURL(/\/$/, { timeout: 10000 });
}

test.describe('게시글 CRUD 풀 플로우', () => {
  test('회원가입 → 로그인 → 게시글 생성/조회/수정/삭제', async ({ page }) => {
    await registerAndLogin(page);

    // ProfileCard에서 "내 게시글" 클릭
    await page.getByRole('link', { name: '내 게시글 보기' }).click();
    await expect(page).toHaveURL(/\/posts$/);
    await expect(page.getByText('아직 작성한 게시글이 없습니다.')).toBeVisible();

    // 게시글 생성
    const title = uniqueTitle();
    const content = '본문 내용입니다.\n두 줄도 가능합니다.';
    await page.getByRole('link', { name: '새 글 작성' }).click();
    await expect(page).toHaveURL(/\/posts\/new$/);

    await page.getByLabel('제목').fill(title);
    await page.getByLabel('내용').fill(content);
    await page.getByRole('button', { name: '작성', exact: true }).click();

    // 작성 후 상세 페이지로 이동
    await expect(page).toHaveURL(/\/posts\/\d+$/, { timeout: 10000 });
    await expect(page.getByText(title, { exact: true })).toBeVisible();
    await expect(page.getByText('본문 내용입니다.')).toBeVisible();

    // 수정 페이지로 이동
    await page.getByRole('link', { name: '수정' }).click();
    await expect(page).toHaveURL(/\/posts\/\d+\/edit$/);

    const updatedTitle = `${title}-updated`;
    await page.getByLabel('제목').fill(updatedTitle);
    await page.getByLabel('내용').fill('수정된 본문');
    await page.getByRole('button', { name: '저장', exact: true }).click();

    // 수정 후 상세 페이지로 복귀
    await expect(page).toHaveURL(/\/posts\/\d+$/, { timeout: 10000 });
    await expect(page.getByText(updatedTitle, { exact: true })).toBeVisible();
    await expect(page.getByText('수정된 본문')).toBeVisible();

    // 목록에 수정된 제목 표시 확인
    await page.getByRole('link', { name: '목록으로' }).click();
    await expect(page).toHaveURL(/\/posts$/);
    await expect(page.getByText(updatedTitle)).toBeVisible();
    await expect(page.getByText('총 1건')).toBeVisible();

    // 수정 페이지로 다시 진입해 삭제
    await page.getByText(updatedTitle).click();
    await expect(page).toHaveURL(/\/posts\/\d+$/);
    await page.getByRole('link', { name: '수정' }).click();

    page.once('dialog', (dialog) => dialog.accept());
    await page.getByRole('button', { name: '삭제' }).click();

    // 삭제 후 목록으로 이동, 빈 상태 확인
    await expect(page).toHaveURL(/\/posts$/, { timeout: 10000 });
    await expect(page.getByText('아직 작성한 게시글이 없습니다.')).toBeVisible();
  });

  test('비인증 사용자가 /posts 접근 시 /login으로 리다이렉트', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.context().clearCookies();

    await page.goto('/posts');
    await expect(page).toHaveURL(/\/login$/);
  });
});
