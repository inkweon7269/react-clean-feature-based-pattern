import { createRouter } from '@tanstack/react-router';
import { rootRoute } from './rootRoute';
import { authRoutes } from './authRoutes';
import { postsRoutes } from './postsRoutes';
import { oauthRoutes } from './oauthRoutes';

const routeTree = rootRoute.addChildren([...authRoutes, ...postsRoutes, ...oauthRoutes]);

export const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
