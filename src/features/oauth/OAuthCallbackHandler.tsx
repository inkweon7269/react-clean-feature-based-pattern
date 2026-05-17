import { useOAuthCallback } from './useOAuthCallback';

export function OAuthCallbackHandler() {
  useOAuthCallback();

  return (
    <div className="text-center" role="status" aria-live="polite">
      <p className="text-muted-foreground">로그인 처리 중...</p>
    </div>
  );
}
