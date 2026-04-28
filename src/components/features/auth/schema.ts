import { z } from 'zod';

export const loginSchema = z.object({
  username: z
    .string({ required_error: '아이디를 입력하세요.' })
    .min(1, '아이디를 입력하세요.'),
  password: z
    .string({ required_error: '비밀번호를 입력하세요.' })
    .min(1, '비밀번호를 입력하세요.'),
  persistent: z.boolean().default(false),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
