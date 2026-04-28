import { describe, it, expect } from 'vitest';
import { isValidEmail, isValidPassword } from '@/domain/auth/entities';

describe('isValidEmail', () => {
  it('올바른 이메일 형식을 유효하다고 판단한다', () => {
    expect(isValidEmail('user@example.com')).toBe(true);
    expect(isValidEmail('test@gmail.com')).toBe(true);
  });

  it('잘못된 이메일 형식을 유효하지 않다고 판단한다', () => {
    expect(isValidEmail('')).toBe(false);
    expect(isValidEmail('invalid')).toBe(false);
    expect(isValidEmail('user@')).toBe(false);
    expect(isValidEmail('@example.com')).toBe(false);
    expect(isValidEmail('user @example.com')).toBe(false);
  });
});

describe('isValidPassword', () => {
  it('8자 이상의 비밀번호를 유효하다고 판단한다', () => {
    expect(isValidPassword('password')).toBe(true);
    expect(isValidPassword('password123')).toBe(true);
  });

  it('8자 미만의 비밀번호를 유효하지 않다고 판단한다', () => {
    expect(isValidPassword('')).toBe(false);
    expect(isValidPassword('short')).toBe(false);
    expect(isValidPassword('1234567')).toBe(false);
  });
});
