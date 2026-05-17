import { createRoute, redirect } from '@tanstack/react-router';
import { z } from 'zod';
import { rootRoute } from './rootRoute';
import { LoginPage } from '@/pages/LoginPage';
import { RegisterPage } from '@/pages/RegisterPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { ProfileEditPage } from '@/pages/ProfileEditPage';
import { useAuthStore } from '@/infrastructure/store/auth/authStore';

const loginSearchSchema = z.object({
  error: z.enum(['email_already_exists', 'email_not_verified', 'unknown']).optional(),
  email: z.string().email().optional(),
});

const profileSearchSchema = z.object({
  linked: z.literal('1').optional(),
  error: z.enum(['link_conflict', 'email_not_verified']).optional(),
});

export const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  validateSearch: loginSearchSchema,
  beforeLoad: () => {
    const { isAuthenticated } = useAuthStore.getState();
    if (isAuthenticated) {
      throw redirect({ to: '/' });
    }
  },
  component: LoginPage,
});

export const registerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/register',
  beforeLoad: () => {
    const { isAuthenticated } = useAuthStore.getState();
    if (isAuthenticated) {
      throw redirect({ to: '/' });
    }
  },
  component: RegisterPage,
});

export const profileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  validateSearch: profileSearchSchema,
  beforeLoad: () => {
    const { isAuthenticated } = useAuthStore.getState();
    if (!isAuthenticated) {
      throw redirect({ to: '/login' });
    }
  },
  component: ProfilePage,
});

export const profileEditRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/profile/edit',
  beforeLoad: () => {
    const { isAuthenticated } = useAuthStore.getState();
    if (!isAuthenticated) {
      throw redirect({ to: '/login' });
    }
  },
  component: ProfileEditPage,
});

export const authRoutes = [loginRoute, registerRoute, profileRoute, profileEditRoute];
