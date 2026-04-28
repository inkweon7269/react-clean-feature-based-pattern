import { useQuery } from '@tanstack/react-query';
import { AuthApiRepository } from '@/infrastructure/api/auth/AuthApiRepository';
import { authQueryKeys } from '@/infrastructure/query/auth/authQueryKeys';
import { useAuthStore } from '@/infrastructure/store/auth/authStore';

export function useProfile() {
  const repo = new AuthApiRepository();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return useQuery({
    queryKey: authQueryKeys.profile(),
    queryFn: () => repo.getProfile(),
    enabled: isAuthenticated,
  });
}
