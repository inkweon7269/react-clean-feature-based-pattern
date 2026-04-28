import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createMemoryHistory, createRootRoute, createRoute, createRouter, RouterProvider } from '@tanstack/react-router';
import { LoginForm } from '../LoginForm';

function renderWithRouter() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  const rootRoute = createRootRoute();
  const loginRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/login',
    component: LoginForm,
  });
  const homeRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: () => <div>home</div>,
  });
  const registerRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/register',
    component: () => <div>register</div>,
  });

  const router = createRouter({
    routeTree: rootRoute.addChildren([loginRoute, homeRoute, registerRoute]),
    history: createMemoryHistory({ initialEntries: ['/login'] }),
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

describe('LoginForm', () => {
  it('이메일과 비밀번호 입력 필드를 렌더링한다', async () => {
    renderWithRouter();

    expect(await screen.findByLabelText('이메일')).toBeInTheDocument();
    expect(screen.getByLabelText('비밀번호')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '로그인' })).toBeInTheDocument();
  });

  it('빈 폼 제출 시 유효성 에러를 표시한다', async () => {
    const user = userEvent.setup();
    renderWithRouter();

    await user.click(await screen.findByRole('button', { name: '로그인' }));

    expect(await screen.findByText('이메일을 입력해주세요')).toBeInTheDocument();
    expect(await screen.findByText('비밀번호를 입력해주세요')).toBeInTheDocument();
  });

  it('회원가입 페이지 링크를 표시한다', async () => {
    renderWithRouter();

    expect(await screen.findByRole('link', { name: '회원가입' })).toBeInTheDocument();
  });
});
