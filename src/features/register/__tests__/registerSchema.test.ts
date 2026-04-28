import { describe, it, expect } from 'vitest';
import { registerSchema } from '../registerSchema';

describe('registerSchema', () => {
  it('유효한 입력을 통과시킨다', () => {
    const result = registerSchema.safeParse({
      email: 'user@example.com',
      password: 'password123',
      name: '홍길동',
    });
    expect(result.success).toBe(true);
  });

  it('잘못된 이메일을 거부한다', () => {
    const result = registerSchema.safeParse({
      email: 'invalid',
      password: 'password123',
      name: '홍길동',
    });
    expect(result.success).toBe(false);
  });

  it('8자 미만의 비밀번호를 거부한다', () => {
    const result = registerSchema.safeParse({
      email: 'user@example.com',
      password: 'short',
      name: '홍길동',
    });
    expect(result.success).toBe(false);
  });

  it('빈 이름을 거부한다', () => {
    const result = registerSchema.safeParse({
      email: 'user@example.com',
      password: 'password123',
      name: '',
    });
    expect(result.success).toBe(false);
  });
});
