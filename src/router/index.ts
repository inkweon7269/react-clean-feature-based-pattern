import { createRouter } from '@tanstack/react-router';
import { rootRoute } from './rootRoute';
import { authRoutes } from './authRoutes';
import { postsRoutes } from './postsRoutes';
import { tagsRoutes } from './tagsRoutes';
import { oauthRoutes } from './oauthRoutes';

const routeTree = rootRoute.addChildren([
  ...authRoutes,
  ...postsRoutes,
  ...tagsRoutes,
  ...oauthRoutes,
]);

export const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
