import { z } from 'zod';

export const registerSchema = z.object({
  email: z
    .string()
    .min(1, '이메일을 입력해주세요')
    .email('올바른 이메일 형식이 아닙니다'),
  password: z
    .string()
    .min(8, '비밀번호는 8자 이상이어야 합니다'),
  name: z
    .string()
    .trim()
    .min(1, '이름을 입력해주세요')
    .max(50, '이름은 50자 이하여야 합니다'),
  marketingConsent: z.boolean(),
});

export type RegisterFormValues = z.infer<typeof registerSchema>;
