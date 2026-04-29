import { OAuthCallbackHandler } from '@/features/oauth/OAuthCallbackHandler';

export function OAuthCallbackPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <OAuthCallbackHandler />
    </div>
  );
}
