import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthStore } from '../authStore';

describe('authStore', () => {
  beforeEach(() => {
    useAuthStore.getState().clearTokens();
  });

  it('초기 상태는 인증되지 않은 상태이다', () => {
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.accessToken).toBeNull();
    expect(state.refreshToken).toBeNull();
  });

  it('setTokens로 토큰을 설정하면 인증 상태가 된다', () => {
    useAuthStore.getState().setTokens({
      accessToken: 'access-123',
      refreshToken: 'refresh-456',
    });

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.accessToken).toBe('access-123');
    expect(state.refreshToken).toBe('refresh-456');
  });

  it('clearTokens로 토큰을 제거하면 비인증 상태가 된다', () => {
    useAuthStore.getState().setTokens({
      accessToken: 'access-123',
      refreshToken: 'refresh-456',
    });
    useAuthStore.getState().clearTokens();

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.accessToken).toBeNull();
    expect(state.refreshToken).toBeNull();
  });
});
