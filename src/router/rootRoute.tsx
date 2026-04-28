import { createRootRoute, Outlet } from '@tanstack/react-router';
import { ErrorBoundary } from 'react-error-boundary';
import { ErrorFallback } from '@/shared/ErrorFallback';

export const rootRoute = createRootRoute({
  component: () => (
    <div className="min-h-screen bg-background">
      <ErrorBoundary FallbackComponent={ErrorFallback}>
        <div className="container mx-auto py-8 px-4">
          <Outlet />
        </div>
      </ErrorBoundary>
    </div>
  ),
});
