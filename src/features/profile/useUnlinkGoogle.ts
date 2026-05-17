import { useMutation } from '@tanstack/react-query';
import { AuthApiRepository } from '@/infrastructure/api/auth/AuthApiRepository';

export function useUnlinkGoogle() {
  const repo = new AuthApiRepository();

  return useMutation({
    mutationFn: () => repo.unlinkGoogle(),
  });
}
