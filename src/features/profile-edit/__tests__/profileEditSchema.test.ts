import { describe, it, expect } from 'vitest';
import { profileEditSchema } from '../profileEditSchema';

describe('profileEditSchema', () => {
  it('최소 1자 이름을 통과시킨다', () => {
    const result = profileEditSchema.safeParse({ name: 'a' });
    expect(result.success).toBe(true);
  });

  it('최대 30자 이름을 통과시킨다', () => {
    const result = profileEditSchema.safeParse({ name: 'a'.repeat(30) });
    expect(result.success).toBe(true);
  });

  it('빈 문자열을 거부한다', () => {
    const result = profileEditSchema.safeParse({ name: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('이름을 입력해주세요');
    }
  });

  it('공백만 있는 문자열을 거부한다 (trim 후 min 위반)', () => {
    const result = profileEditSchema.safeParse({ name: '   ' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('이름을 입력해주세요');
    }
  });

  it('31자 이름을 거부한다', () => {
    const result = profileEditSchema.safeParse({ name: 'a'.repeat(31) });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('이름은 30자 이하여야 합니다');
    }
  });

  it('앞뒤 공백이 포함된 입력은 trim 후 통과시키며 data가 trim된 값을 가진다', () => {
    const result = profileEditSchema.safeParse({ name: '  홍길동  ' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('홍길동');
    }
  });

  it('trim 후 30자가 되는 입력(공백+30자+공백)을 통과시킨다', () => {
    const result = profileEditSchema.safeParse({ name: `  ${'a'.repeat(30)}  ` });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('a'.repeat(30));
    }
  });
});
