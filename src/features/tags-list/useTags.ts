import { useQuery } from '@tanstack/react-query';
import { TagsApiRepository } from '@/infrastructure/api/tags/TagsApiRepository';
import { tagsQueryKeys } from '@/infrastructure/query/tags/tagsQueryKeys';
import { useAuthStore } from '@/infrastructure/store/auth/authStore';
import type { TagsPaginationParams } from '@/domain/tags/entities';

export function useTags(params: TagsPaginationParams) {
  const repo = new TagsApiRepository();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return useQuery({
    queryKey: tagsQueryKeys.list(params),
    queryFn: () => repo.findAllPaginated(params),
    enabled: isAuthenticated,
  });
}
