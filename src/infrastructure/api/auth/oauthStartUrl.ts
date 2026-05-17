export function getGoogleOAuthStartUrl(): string {
  return new URL('/v1/auth/google', import.meta.env.VITE_API_BASE_URL).toString();
}
