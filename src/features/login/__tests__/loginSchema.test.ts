import { describe, it, expect } from 'vitest';
import { loginSchema } from '../loginSchema';

describe('loginSchema', () => {
  it('유효한 이메일과 비밀번호를 통과시킨다', () => {
    const result = loginSchema.safeParse({ email: 'user@example.com', password: 'pass123' });
    expect(result.success).toBe(true);
  });

  it('빈 이메일을 거부한다', () => {
    const result = loginSchema.safeParse({ email: '', password: 'pass123' });
    expect(result.success).toBe(false);
  });

  it('잘못된 이메일 형식을 거부한다', () => {
    const result = loginSchema.safeParse({ email: 'invalid', password: 'pass123' });
    expect(result.success).toBe(false);
  });

  it('빈 비밀번호를 거부한다', () => {
    const result = loginSchema.safeParse({ email: 'user@example.com', password: '' });
    expect(result.success).toBe(false);
  });
});
