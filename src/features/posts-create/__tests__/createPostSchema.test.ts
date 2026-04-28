import { describe, it, expect } from 'vitest';
import { createPostSchema } from '../createPostSchema';

describe('createPostSchema', () => {
  it('유효한 입력을 통과시킨다', () => {
    const result = createPostSchema.safeParse({
      title: '제목',
      content: '내용',
      isPublished: true,
    });
    expect(result.success).toBe(true);
  });

  it('빈 제목을 거부한다', () => {
    const result = createPostSchema.safeParse({
      title: '',
      content: '내용',
      isPublished: false,
    });
    expect(result.success).toBe(false);
  });

  it('빈 내용을 거부한다', () => {
    const result = createPostSchema.safeParse({
      title: '제목',
      content: '',
      isPublished: false,
    });
    expect(result.success).toBe(false);
  });

  it('isPublished 누락을 거부한다', () => {
    const result = createPostSchema.safeParse({
      title: '제목',
      content: '내용',
    });
    expect(result.success).toBe(false);
  });
});
