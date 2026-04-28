import { useMutation } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { AuthApiRepository } from '@/infrastructure/api/auth/AuthApiRepository';
import type { RegisterCredentials } from '@/domain/auth/entities';

export function useRegister() {
  const repo = new AuthApiRepository();
  const router = useRouter();

  return useMutation({
    mutationFn: (credentials: RegisterCredentials) => repo.register(credentials),
    onSuccess: () => {
      router.navigate({ to: '/login' });
    },
  });
}
