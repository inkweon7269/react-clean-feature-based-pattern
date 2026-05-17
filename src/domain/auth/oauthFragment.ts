import type { OAuthCallbackResult } from '@/domain/auth/entities';

export function parseOAuthFragment(hash: string): OAuthCallbackResult {
  const params = new URLSearchParams(hash.replace(/^#/, ''));

  if (params.get('linked') === 'true') {
    return { kind: 'link_success' };
  }

  const error = params.get('error');
  if (error === 'email_already_exists') {
    return { kind: 'error', code: 'email_already_exists', email: params.get('email') ?? '' };
  }
  if (error === 'email_not_verified') {
    return { kind: 'error', code: 'email_not_verified' };
  }
  if (error === 'link_conflict') {
    return { kind: 'error', code: 'link_conflict' };
  }

  const accessToken = params.get('accessToken');
  const refreshToken = params.get('refreshToken');
  if (accessToken && refreshToken) {
    return { kind: 'login_success', tokens: { accessToken, refreshToken } };
  }

  return { kind: 'error', code: 'unknown' };
}
