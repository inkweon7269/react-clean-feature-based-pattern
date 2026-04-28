import { useMutation } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { AuthApiRepository } from '@/infrastructure/api/auth/AuthApiRepository';
import { useAuthStore } from '@/infrastructure/store/auth/authStore';
import type { LoginCredentials } from '@/domain/auth/entities';

export function useLogin() {
  const repo = new AuthApiRepository();
  const setTokens = useAuthStore((state) => state.setTokens);
  const router = useRouter();

  return useMutation({
    mutationFn: (credentials: LoginCredentials) => repo.login(credentials),
    onSuccess: (tokens) => {
      setTokens(tokens);
      router.navigate({ to: '/' });
    },
  });
}
