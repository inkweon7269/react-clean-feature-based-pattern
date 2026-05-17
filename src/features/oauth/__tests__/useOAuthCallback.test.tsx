import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router';
import { z } from 'zod';
import { OAuthCallbackHandler } from '../OAuthCallbackHandler';
import { useAuthStore } from '@/infrastructure/store/auth/authStore';

function renderCallback(initialUrl: string) {
  // useOAuthCallback reads window.location.hash directly. createMemoryHistory's
  // initialEntries don't propagate to jsdom's window.location, so we set the
  // hash explicitly here to match what the browser would expose at runtime.
  const hashIndex = initialUrl.indexOf('#');
  const pathname = hashIndex >= 0 ? initialUrl.slice(0, hashIndex) : initialUrl;
  const hash = hashIndex >= 0 ? initialUrl.slice(hashIndex) : '';
  window.location.hash = hash;

  const rootRoute = createRootRoute();

  const oauthCallbackRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/oauth/callback',
    component: OAuthCallbackHandler,
  });

  const homeRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    validateSearch: z.object({
      linked: z.literal('1').optional(),
      error: z.enum(['link_conflict', 'email_not_verified']).optional(),
    }),
    component: () => <div data-testid="home">home</div>,
  });

  const loginRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/login',
    validateSearch: z.object({
      error: z
        .enum(['email_already_exists', 'email_not_verified', 'unknown'])
        .optional(),
      email: z.string().optional(),
    }),
    component: () => <div data-testid="login">login</div>,
  });

  const router = createRouter({
    routeTree: rootRoute.addChildren([oauthCallbackRoute, homeRoute, loginRoute]),
    history: createMemoryHistory({ initialEntries: [pathname] }),
  });

  return { ...render(<RouterProvider router={router} />), router };
}

describe('useOAuthCallback', () => {
  let replaceStateSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    useAuthStore.getState().clearTokens();
    window.location.hash = '';
    replaceStateSpy = vi.spyOn(window.history, 'replaceState');
  });

  afterEach(() => {
    replaceStateSpy.mockRestore();
    window.location.hash = '';
  });

  it('login_success 시 토큰을 저장하고 /로 이동한다', async () => {
    const { router } = renderCallback(
      '/oauth/callback#accessToken=at-1&refreshToken=rt-1',
    );

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/');
    });

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.accessToken).toBe('at-1');
    expect(state.refreshToken).toBe('rt-1');
    expect(replaceStateSpy).toHaveBeenCalled();
  });

  it('link_success 시 /로 이동하면서 linked=1 search를 단다', async () => {
    useAuthStore.getState().setTokens({ accessToken: 'a', refreshToken: 'r' });
    const { router } = renderCallback('/oauth/callback#linked=true');

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/');
      expect(router.state.location.search).toEqual({ linked: '1' });
    });
  });

  it('email_already_exists 시 /login으로 error+email을 단다', async () => {
    const email = 'duplicate@example.com';
    const { router } = renderCallback(
      `/oauth/callback#error=email_already_exists&email=${encodeURIComponent(email)}`,
    );

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/login');
      expect(router.state.location.search).toEqual({
        error: 'email_already_exists',
        email,
      });
    });
  });

  it('email_not_verified — 미인증 컨텍스트는 /login으로 이동한다', async () => {
    const { router } = renderCallback('/oauth/callback#error=email_not_verified');

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/login');
      expect(router.state.location.search).toEqual({ error: 'email_not_verified' });
    });
  });

  it('email_not_verified — 인증 컨텍스트는 /로 이동한다', async () => {
    useAuthStore.getState().setTokens({ accessToken: 'a', refreshToken: 'r' });
    const { router } = renderCallback('/oauth/callback#error=email_not_verified');

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/');
      expect(router.state.location.search).toEqual({ error: 'email_not_verified' });
    });
  });

  it('link_conflict 시 /로 이동하면서 error를 단다', async () => {
    useAuthStore.getState().setTokens({ accessToken: 'a', refreshToken: 'r' });
    const { router } = renderCallback('/oauth/callback#error=link_conflict');

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/');
      expect(router.state.location.search).toEqual({ error: 'link_conflict' });
    });
  });

  it('unknown fragment는 /login에 error=unknown으로 이동한다', async () => {
    const { router } = renderCallback('/oauth/callback#');

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/login');
      expect(router.state.location.search).toEqual({ error: 'unknown' });
    });
  });
});
