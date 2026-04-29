import { createRoute } from '@tanstack/react-router';
import { rootRoute } from './rootRoute';
import { OAuthCallbackPage } from '@/pages/OAuthCallbackPage';

export const oauthCallbackRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/oauth/callback',
  component: OAuthCallbackPage,
});

export const oauthRoutes = [oauthCallbackRoute];
