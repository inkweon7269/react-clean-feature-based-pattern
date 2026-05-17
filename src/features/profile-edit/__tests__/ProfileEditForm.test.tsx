import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse, delay } from 'msw';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router';
import { ProfileEditForm } from '../ProfileEditForm';
import { useAuthStore } from '@/infrastructure/store/auth/authStore';
import { server } from '@/test/mocks/server';

function renderWithRouter(initial: { name: string } = { name: '홍길동' }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  const rootRoute = createRootRoute();
  const profileEditRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/profile/edit',
    component: () => <ProfileEditForm initial={initial} />,
  });
  const homeRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: () => <div>home page</div>,
  });

  const router = createRouter({
    routeTree: rootRoute.addChildren([profileEditRoute, homeRoute]),
    history: createMemoryHistory({ initialEntries: ['/profile/edit'] }),
  });

  const utils = render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );

  return { ...utils, queryClient, router };
}

describe('ProfileEditForm', () => {
  beforeEach(() => {
    useAuthStore.getState().setTokens({
      accessToken: 'mock-access-token',
      refreshToken: 'mock-refresh-token',
    });
  });

  it('initial name이 input에 미리 채워진다', async () => {
    renderWithRouter({ name: '홍길동' });

    const input = (await screen.findByLabelText('이름')) as HTMLInputElement;
    expect(input.value).toBe('홍길동');
    expect(screen.getByRole('button', { name: '저장' })).toBeInTheDocument();
  });

  it('이름 변경 후 저장하면 성공하고 홈으로 이동한다', async () => {
    const user = userEvent.setup();
    const { queryClient } = renderWithRouter({ name: '홍길동' });
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const input = await screen.findByLabelText('이름');
    await user.clear(input);
    await user.type(input, '김철수');
    await user.click(screen.getByRole('button', { name: '저장' }));

    // 홈으로 navigate 됐는지 검증 (가장 안정적인 종단 검증)
    expect(await screen.findByText('home page')).toBeInTheDocument();

    // auth.profile 쿼리 invalidate 호출 검증
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['auth', 'profile'] });
  });

  it('31자 입력 시 클라이언트 validation 에러를 표시하고 mutation을 호출하지 않는다', async () => {
    const user = userEvent.setup();
    let serverCalled = false;
    server.use(
      http.patch('*/v1/auth/profile', () => {
        serverCalled = true;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    renderWithRouter({ name: '홍길동' });

    const input = await screen.findByLabelText('이름');
    await user.clear(input);
    await user.type(input, 'a'.repeat(31));
    await user.click(screen.getByRole('button', { name: '저장' }));

    expect(await screen.findByText('이름은 30자 이하여야 합니다')).toBeInTheDocument();

    // mutation이 발송되지 않아야 함 (validation에서 차단)
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(serverCalled).toBe(false);

    // 페이지가 그대로 유지됨 (홈으로 이동 X)
    expect(screen.queryByText('home page')).not.toBeInTheDocument();
  });

  it('mutation 진행 중 저장 버튼이 disabled 상태가 된다', async () => {
    server.use(
      http.patch('*/v1/auth/profile', async () => {
        await delay(300);
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const user = userEvent.setup();
    renderWithRouter({ name: '홍길동' });

    const input = await screen.findByLabelText('이름');
    await user.clear(input);
    await user.type(input, '김철수');
    await user.click(screen.getByRole('button', { name: '저장' }));

    // mutation pending 중 버튼 텍스트가 "저장 중..."으로 바뀌면서 disabled 상태가 됨
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /저장/ })).toBeDisabled();
    });
  });

  it('서버가 400을 반환하면 에러 메시지를 표시하고 페이지를 유지한다', async () => {
    const user = userEvent.setup();
    server.use(
      http.patch('*/v1/auth/profile', () =>
        HttpResponse.json(
          {
            statusCode: 400,
            message: ['name must be between 1 and 30 characters'],
            error: 'Bad Request',
          },
          { status: 400 },
        ),
      ),
    );
    renderWithRouter({ name: '홍길동' });

    const input = await screen.findByLabelText('이름');
    await user.clear(input);
    await user.type(input, '김철수');
    await user.click(screen.getByRole('button', { name: '저장' }));

    // 서버 에러 메시지 표시
    expect(
      await screen.findByText('name must be between 1 and 30 characters'),
    ).toBeInTheDocument();

    // 페이지가 그대로 유지됨 (navigate 안 됨)
    await waitFor(() => {
      expect(screen.queryByText('home page')).not.toBeInTheDocument();
    });
  });
});
