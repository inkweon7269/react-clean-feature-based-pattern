import { z } from 'zod';

export const profileEditSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, '이름을 입력해주세요')
    .max(30, '이름은 30자 이하여야 합니다'),
});

export type ProfileEditFormValues = z.infer<typeof profileEditSchema>;
