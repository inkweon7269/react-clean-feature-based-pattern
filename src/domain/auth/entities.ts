export interface User {
  id: number;
  email: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  email: string;
  password: string;
  name: string;
}

export interface RegisterResult {
  id: number;
}

export interface UpdateProfileInput {
  name: string;
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isValidPassword(password: string): boolean {
  return password.length >= 8;
}

export type OAuthErrorCode =
  | 'email_already_exists'
  | 'email_not_verified'
  | 'link_conflict'
  | 'unknown';

export type OAuthCallbackResult =
  | { kind: 'login_success'; tokens: AuthTokens }
  | { kind: 'link_success' }
  | { kind: 'error'; code: 'email_already_exists'; email: string }
  | { kind: 'error'; code: 'email_not_verified' }
  | { kind: 'error'; code: 'link_conflict' }
  | { kind: 'error'; code: 'unknown' };
