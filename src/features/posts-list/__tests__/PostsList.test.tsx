import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router';
import { PostsList } from '../PostsList';
import { useAuthStore } from '@/infrastructure/store/auth/authStore';
import { resetMockPosts } from '@/test/mocks/handlers';
import { PostsApiRepository } from '@/infrastructure/api/posts/PostsApiRepository';

function renderWithRouter() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const rootRoute = createRootRoute();
  const postsRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/posts',
    component: PostsList,
  });
  const newRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/posts/new',
    component: () => <div>new</div>,
  });
  const detailRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/posts/$id',
    component: () => <div>detail</div>,
  });
  const homeRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: () => <div>home</div>,
  });

  const router = createRouter({
    routeTree: rootRoute.addChildren([postsRoute, newRoute, detailRoute, homeRoute]),
    history: createMemoryHistory({ initialEntries: ['/posts'] }),
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

describe('PostsList', () => {
  beforeEach(() => {
    resetMockPosts();
    useAuthStore.getState().setTokens({
      accessToken: 'mock-access-token',
      refreshToken: 'mock-refresh-token',
    });
  });

  it('빈 목록 메시지를 표시한다', async () => {
    renderWithRouter();
    expect(await screen.findByText('아직 작성한 게시글이 없습니다.')).toBeInTheDocument();
  });

  it('생성된 게시글이 목록에 표시된다', async () => {
    const repo = new PostsApiRepository();
    await repo.create({ title: '테스트 게시글', content: '본문', isPublished: true });
    renderWithRouter();
    expect(await screen.findByText('테스트 게시글')).toBeInTheDocument();
    expect(screen.getByText('총 1건')).toBeInTheDocument();
  });
});
