import { describe, it, expect, beforeEach } from 'vitest';
import { AuthApiRepository } from '../AuthApiRepository';
import { useAuthStore } from '@/infrastructure/store/auth/authStore';

describe('AuthApiRepository', () => {
  const repo = new AuthApiRepository();

  beforeEach(() => {
    useAuthStore.getState().clearTokens();
  });

  it('회원가입 요청 시 생성된 사용자 ID와 마케팅 동의 여부를 반환한다', async () => {
    const result = await repo.register({
      email: 'new@example.com',
      password: 'password123',
      name: '신규유저',
      marketingConsent: true,
    });
    expect(result).toEqual({ id: 1, marketingConsent: true });
  });

  it('이메일 중복 시 회원가입은 에러를 던진다', async () => {
    await expect(
      repo.register({
        email: 'duplicate@example.com',
        password: 'password123',
        name: '중복',
        marketingConsent: false,
      }),
    ).rejects.toThrow();
  });

  it('올바른 자격증명으로 로그인하면 토큰을 반환한다', async () => {
    const result = await repo.login({ email: 'user@example.com', password: 'password123' });
    expect(result).toHaveProperty('accessToken');
    expect(result).toHaveProperty('refreshToken');
  });

  it('잘못된 자격증명으로 로그인하면 에러를 던진다', async () => {
    await expect(
      repo.login({ email: 'wrong@email.com', password: 'wrong' }),
    ).rejects.toThrow();
  });

  it('refresh token으로 새 토큰을 발급한다', async () => {
    const result = await repo.refresh('mock-refresh-token');
    expect(result).toHaveProperty('accessToken');
    expect(result).toHaveProperty('refreshToken');
  });

  it('인증된 상태에서 프로필을 조회한다', async () => {
    useAuthStore.getState().setTokens({
      accessToken: 'mock-access-token',
      refreshToken: 'mock-refresh-token',
    });

    const user = await repo.getProfile();
    expect(user).toHaveProperty('id');
    expect(user).toHaveProperty('email');
    expect(user).toHaveProperty('name');
    expect(user).toHaveProperty('marketingConsent');
    expect(user).toHaveProperty('createdAt');
  });

  it('인증된 상태에서 로그아웃을 호출한다', async () => {
    useAuthStore.getState().setTokens({
      accessToken: 'mock-access-token',
      refreshToken: 'mock-refresh-token',
    });

    await expect(repo.logout()).resolves.toBeUndefined();
  });

  it('인증된 상태에서 startGoogleLink는 authorizationUrl을 반환한다', async () => {
    useAuthStore.getState().setTokens({
      accessToken: 'mock-access-token',
      refreshToken: 'mock-refresh-token',
    });

    const result = await repo.startGoogleLink();
    expect(result.authorizationUrl).toMatch(/^https:\/\/accounts\.google\.com\//);
  });

  it('미인증 상태에서 startGoogleLink는 에러를 던진다', async () => {
    await expect(repo.startGoogleLink()).rejects.toThrow();
  });

  it('인증된 상태에서 unlinkGoogle을 호출하면 정상 종료된다', async () => {
    useAuthStore.getState().setTokens({
      accessToken: 'mock-access-token',
      refreshToken: 'mock-refresh-token',
    });

    await expect(repo.unlinkGoogle()).resolves.toBeUndefined();
  });
});
