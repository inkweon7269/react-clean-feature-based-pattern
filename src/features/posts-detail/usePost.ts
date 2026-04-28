import { useQuery } from '@tanstack/react-query';
import { PostsApiRepository } from '@/infrastructure/api/posts/PostsApiRepository';
import { postsQueryKeys } from '@/infrastructure/query/posts/postsQueryKeys';
import { useAuthStore } from '@/infrastructure/store/auth/authStore';

export function usePost(id: number) {
  const repo = new PostsApiRepository();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return useQuery({
    queryKey: postsQueryKeys.detail(id),
    queryFn: () => repo.getById(id),
    enabled: isAuthenticated && Number.isFinite(id) && id > 0,
  });
}
