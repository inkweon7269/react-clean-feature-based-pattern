import { useQuery } from '@tanstack/react-query';
import { PostsApiRepository } from '@/infrastructure/api/posts/PostsApiRepository';
import { postsQueryKeys } from '@/infrastructure/query/posts/postsQueryKeys';
import { useAuthStore } from '@/infrastructure/store/auth/authStore';
import type { PostsPaginationParams } from '@/domain/posts/entities';

export function usePosts(params: PostsPaginationParams) {
  const repo = new PostsApiRepository();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return useQuery({
    queryKey: postsQueryKeys.list(params),
    queryFn: () => repo.findAllPaginated(params),
    enabled: isAuthenticated,
  });
}
