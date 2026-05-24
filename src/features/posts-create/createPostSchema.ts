import { z } from 'zod';

export const createPostSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, '제목을 입력해주세요')
    .max(200, '제목은 200자 이하여야 합니다'),
  content: z
    .string()
    .min(1, '내용을 입력해주세요')
    .max(10_000, '내용은 10,000자 이하여야 합니다'),
  isPublished: z.boolean(),
  tagIds: z.array(z.number()),
});

export type CreatePostFormValues = z.infer<typeof createPostSchema>;
