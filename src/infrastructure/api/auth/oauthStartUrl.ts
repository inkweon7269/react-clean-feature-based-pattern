export function getGoogleOAuthStartUrl(): string {
  return `${import.meta.env.VITE_API_BASE_URL}/v1/auth/google`;
}
