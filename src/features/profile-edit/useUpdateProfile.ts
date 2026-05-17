import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { AuthApiRepository } from '@/infrastructure/api/auth/AuthApiRepository';
import { authQueryKeys } from '@/infrastructure/query/auth/authQueryKeys';
import type { UpdateProfileInput } from '@/domain/auth/entities';

export function useUpdateProfile() {
  const repo = new AuthApiRepository();
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: (input: UpdateProfileInput) => repo.updateProfile(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: authQueryKeys.profile() });
      router.navigate({ to: '/' });
    },
  });
}
