import { createRouter } from '@tanstack/react-router';
import { rootRoute } from './rootRoute';
import { authRoutes } from './authRoutes';

const routeTree = rootRoute.addChildren([...authRoutes]);

export const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
