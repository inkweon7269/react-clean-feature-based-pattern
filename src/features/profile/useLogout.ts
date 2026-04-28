import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { AuthApiRepository } from '@/infrastructure/api/auth/AuthApiRepository';
import { useAuthStore } from '@/infrastructure/store/auth/authStore';

export function useLogout() {
  const repo = new AuthApiRepository();
  const clearTokens = useAuthStore((state) => state.clearTokens);
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: () => repo.logout(),
    onSettled: () => {
      clearTokens();
      queryClient.clear();
      router.navigate({ to: '/login' });
    },
  });
}
