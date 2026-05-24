import { createRoute, redirect } from '@tanstack/react-router';
import { rootRoute } from './rootRoute';
import { TagsPage } from '@/pages/TagsPage';
import { useAuthStore } from '@/infrastructure/store/auth/authStore';

function requireAuth() {
  const { isAuthenticated } = useAuthStore.getState();
  if (!isAuthenticated) {
    throw redirect({ to: '/login' });
  }
}

export const tagsListRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/tags',
  beforeLoad: requireAuth,
  component: TagsPage,
});

export const tagsRoutes = [tagsListRoute];
