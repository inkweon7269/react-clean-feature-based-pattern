import { describe, it, expect } from 'vitest';
import { tagSchema } from '../tagSchema';

describe('tagSchema', () => {
  it('유효한 태그 이름을 통과시킨다', () => {
    const result = tagSchema.safeParse({ name: 'nestjs' });
    expect(result.success).toBe(true);
  });

  it('앞뒤 공백을 제거한다', () => {
    const result = tagSchema.safeParse({ name: '  react  ' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('react');
    }
  });

  it('빈 문자열은 거부한다', () => {
    const result = tagSchema.safeParse({ name: '' });
    expect(result.success).toBe(false);
  });

  it('공백만 있는 값은 거부한다', () => {
    const result = tagSchema.safeParse({ name: '   ' });
    expect(result.success).toBe(false);
  });

  it('50자를 초과하면 거부한다', () => {
    const result = tagSchema.safeParse({ name: 'a'.repeat(51) });
    expect(result.success).toBe(false);
  });

  it('50자는 허용한다', () => {
    const result = tagSchema.safeParse({ name: 'a'.repeat(50) });
    expect(result.success).toBe(true);
  });
});
