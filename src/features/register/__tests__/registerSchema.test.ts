import { describe, it, expect } from 'vitest';
import { registerSchema } from '../registerSchema';

describe('registerSchema', () => {
  it('유효한 입력을 통과시킨다', () => {
    const result = registerSchema.safeParse({
      email: 'user@example.com',
      password: 'password123',
      name: '홍길동',
      marketingConsent: true,
    });
    expect(result.success).toBe(true);
  });

  it('마케팅 미동의(false)도 통과시킨다', () => {
    const result = registerSchema.safeParse({
      email: 'user@example.com',
      password: 'password123',
      name: '홍길동',
      marketingConsent: false,
    });
    expect(result.success).toBe(true);
  });

  it('marketingConsent 누락을 거부한다', () => {
    const result = registerSchema.safeParse({
      email: 'user@example.com',
      password: 'password123',
      name: '홍길동',
    });
    expect(result.success).toBe(false);
  });

  it('marketingConsent가 boolean이 아니면 거부한다', () => {
    const result = registerSchema.safeParse({
      email: 'user@example.com',
      password: 'password123',
      name: '홍길동',
      marketingConsent: 'yes',
    });
    expect(result.success).toBe(false);
  });

  it('잘못된 이메일을 거부한다', () => {
    const result = registerSchema.safeParse({
      email: 'invalid',
      password: 'password123',
      name: '홍길동',
      marketingConsent: true,
    });
    expect(result.success).toBe(false);
  });

  it('8자 미만의 비밀번호를 거부한다', () => {
    const result = registerSchema.safeParse({
      email: 'user@example.com',
      password: 'short',
      name: '홍길동',
      marketingConsent: true,
    });
    expect(result.success).toBe(false);
  });

  it('빈 이름을 거부한다', () => {
    const result = registerSchema.safeParse({
      email: 'user@example.com',
      password: 'password123',
      name: '',
      marketingConsent: true,
    });
    expect(result.success).toBe(false);
  });

  it('공백만 있는 이름을 거부한다', () => {
    const result = registerSchema.safeParse({
      email: 'user@example.com',
      password: 'password123',
      name: '   ',
      marketingConsent: true,
    });
    expect(result.success).toBe(false);
  });

  it('50자 이름은 통과시킨다', () => {
    const result = registerSchema.safeParse({
      email: 'user@example.com',
      password: 'password123',
      name: 'a'.repeat(50),
      marketingConsent: true,
    });
    expect(result.success).toBe(true);
  });

  it('51자 이름을 거부한다', () => {
    const result = registerSchema.safeParse({
      email: 'user@example.com',
      password: 'password123',
      name: 'a'.repeat(51),
      marketingConsent: true,
    });
    expect(result.success).toBe(false);
  });
});
