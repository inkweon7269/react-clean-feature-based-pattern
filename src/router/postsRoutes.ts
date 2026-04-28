import { createRoute, redirect } from '@tanstack/react-router';
import { rootRoute } from './rootRoute';
import { PostsListPage } from '@/pages/PostsListPage';
import { PostCreatePage } from '@/pages/PostCreatePage';
import { PostDetailPage } from '@/pages/PostDetailPage';
import { PostEditPage } from '@/pages/PostEditPage';
import { useAuthStore } from '@/infrastructure/store/auth/authStore';

function requireAuth() {
  const { isAuthenticated } = useAuthStore.getState();
  if (!isAuthenticated) {
    throw redirect({ to: '/login' });
  }
}

export const postsListRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/posts',
  beforeLoad: requireAuth,
  component: PostsListPage,
});

export const postCreateRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/posts/new',
  beforeLoad: requireAuth,
  component: PostCreatePage,
});

export const postDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/posts/$id',
  beforeLoad: requireAuth,
  component: PostDetailPage,
});

export const postEditRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/posts/$id/edit',
  beforeLoad: requireAuth,
  component: PostEditPage,
});

export const postsRoutes = [postsListRoute, postCreateRoute, postDetailRoute, postEditRoute];
