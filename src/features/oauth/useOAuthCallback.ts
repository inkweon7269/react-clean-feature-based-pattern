import { useEffect, useRef } from 'react';
import { useRouter } from '@tanstack/react-router';
import { parseOAuthFragment } from '@/infrastructure/api/auth/oauthFragment';
import { useAuthStore } from '@/infrastructure/store/auth/authStore';

export function useOAuthCallback() {
  const router = useRouter();
  const setTokens = useAuthStore((state) => state.setTokens);
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    const result = parseOAuthFragment(window.location.hash);
    window.history.replaceState(null, '', window.location.pathname);

    if (result.kind === 'login_success') {
      setTokens(result.tokens);
      router.navigate({ to: '/' });
      return;
    }

    if (result.kind === 'link_success') {
      router.navigate({ to: '/', search: { linked: '1' } });
      return;
    }

    if (result.kind === 'error') {
      const isAuthenticated = useAuthStore.getState().isAuthenticated;

      if (result.code === 'email_already_exists') {
        router.navigate({
          to: '/login',
          search: { error: 'email_already_exists', email: result.email },
        });
        return;
      }

      if (result.code === 'link_conflict') {
        router.navigate({ to: '/', search: { error: 'link_conflict' } });
        return;
      }

      if (result.code === 'email_not_verified') {
        if (isAuthenticated) {
          router.navigate({ to: '/', search: { error: 'email_not_verified' } });
        } else {
          router.navigate({ to: '/login', search: { error: 'email_not_verified' } });
        }
        return;
      }

      router.navigate({ to: '/login', search: { error: 'unknown' } });
    }
  }, [router, setTokens]);
}
