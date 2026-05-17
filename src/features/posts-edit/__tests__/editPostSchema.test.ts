import { describe, it, expect } from 'vitest';
import { editPostSchema } from '../editPostSchema';

describe('editPostSchema', () => {
  it('유효한 입력을 통과시킨다', () => {
    const result = editPostSchema.safeParse({
      title: '제목',
      content: '내용',
      isPublished: true,
    });
    expect(result.success).toBe(true);
  });

  it('빈 제목을 거부한다', () => {
    const result = editPostSchema.safeParse({
      title: '',
      content: '내용',
      isPublished: false,
    });
    expect(result.success).toBe(false);
  });

  it('빈 내용을 거부한다', () => {
    const result = editPostSchema.safeParse({
      title: '제목',
      content: '',
      isPublished: false,
    });
    expect(result.success).toBe(false);
  });

  it('200자 제목은 통과시킨다', () => {
    const result = editPostSchema.safeParse({
      title: 'a'.repeat(200),
      content: '내용',
      isPublished: false,
    });
    expect(result.success).toBe(true);
  });

  it('201자 제목을 거부한다', () => {
    const result = editPostSchema.safeParse({
      title: 'a'.repeat(201),
      content: '내용',
      isPublished: false,
    });
    expect(result.success).toBe(false);
  });

  it('10,000자 내용은 통과시킨다', () => {
    const result = editPostSchema.safeParse({
      title: '제목',
      content: 'a'.repeat(10_000),
      isPublished: false,
    });
    expect(result.success).toBe(true);
  });

  it('10,001자 내용을 거부한다', () => {
    const result = editPostSchema.safeParse({
      title: '제목',
      content: 'a'.repeat(10_001),
      isPublished: false,
    });
    expect(result.success).toBe(false);
  });
});
