import { useMutation } from '@tanstack/react-query';
import { AuthApiRepository } from '@/infrastructure/api/auth/AuthApiRepository';

export function useStartGoogleLink() {
  const repo = new AuthApiRepository();

  return useMutation({
    mutationFn: () => repo.startGoogleLink(),
    onSuccess: ({ authorizationUrl }) => {
      window.location.href = authorizationUrl;
    },
  });
}
