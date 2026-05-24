import { z } from 'zod';

export const tagSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, '태그 이름을 입력해주세요')
    .max(50, '태그 이름은 50자 이하여야 합니다'),
});

export type TagFormValues = z.infer<typeof tagSchema>;
