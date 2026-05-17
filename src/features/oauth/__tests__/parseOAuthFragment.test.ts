import { describe, it, expect } from 'vitest';
import { parseOAuthFragment } from '@/domain/auth/oauthFragment';

describe('parseOAuthFragment', () => {
  it('정상 토큰 fragment를 login_success로 파싱한다', () => {
    const result = parseOAuthFragment('#accessToken=at-123&refreshToken=rt-456');
    expect(result).toEqual({
      kind: 'login_success',
      tokens: { accessToken: 'at-123', refreshToken: 'rt-456' },
    });
  });

  it('encodeURIComponent로 인코딩된 토큰을 디코딩한다', () => {
    const access = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.payload.sig==';
    const refresh = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.refresh.sig==';
    const hash = `#accessToken=${encodeURIComponent(access)}&refreshToken=${encodeURIComponent(refresh)}`;

    const result = parseOAuthFragment(hash);
    expect(result).toEqual({
      kind: 'login_success',
      tokens: { accessToken: access, refreshToken: refresh },
    });
  });

  it('linked=true를 link_success로 파싱한다', () => {
    expect(parseOAuthFragment('#linked=true')).toEqual({ kind: 'link_success' });
  });

  it('email_already_exists 에러와 인코딩된 이메일을 파싱한다', () => {
    const hash = `#error=email_already_exists&email=${encodeURIComponent('user@example.com')}`;
    expect(parseOAuthFragment(hash)).toEqual({
      kind: 'error',
      code: 'email_already_exists',
      email: 'user@example.com',
    });
  });

  it('email_already_exists에 email이 없으면 빈 문자열로 반환한다', () => {
    expect(parseOAuthFragment('#error=email_already_exists')).toEqual({
      kind: 'error',
      code: 'email_already_exists',
      email: '',
    });
  });

  it('email_not_verified 에러를 파싱한다', () => {
    expect(parseOAuthFragment('#error=email_not_verified')).toEqual({
      kind: 'error',
      code: 'email_not_verified',
    });
  });

  it('link_conflict 에러를 파싱한다', () => {
    expect(parseOAuthFragment('#error=link_conflict')).toEqual({
      kind: 'error',
      code: 'link_conflict',
    });
  });

  it('빈 hash는 unknown 에러로 반환한다', () => {
    expect(parseOAuthFragment('')).toEqual({ kind: 'error', code: 'unknown' });
    expect(parseOAuthFragment('#')).toEqual({ kind: 'error', code: 'unknown' });
  });

  it('accessToken만 있고 refreshToken이 없으면 unknown으로 반환한다', () => {
    expect(parseOAuthFragment('#accessToken=at-123')).toEqual({
      kind: 'error',
      code: 'unknown',
    });
  });

  it('알 수 없는 error 코드는 unknown으로 반환한다', () => {
    expect(parseOAuthFragment('#error=something_else')).toEqual({
      kind: 'error',
      code: 'unknown',
    });
  });
});
