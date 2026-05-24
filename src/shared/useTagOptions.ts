import { useQuery } from '@tanstack/react-query';
import { TagsApiRepository } from '@/infrastructure/api/tags/TagsApiRepository';
import { tagsQueryKeys } from '@/infrastructure/query/tags/tagsQueryKeys';
import { useAuthStore } from '@/infrastructure/store/auth/authStore';
import type { TagsPaginationParams } from '@/domain/tags/entities';

// 선택 UI에서 사용할 태그 목록 (백엔드 limit 최대치)
const OPTIONS_PARAMS: TagsPaginationParams = { page: 1, limit: 100 };

export function useTagOptions() {
  const repo = new TagsApiRepository();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return useQuery({
    queryKey: tagsQueryKeys.list(OPTIONS_PARAMS),
    queryFn: () => repo.findAllPaginated(OPTIONS_PARAMS),
    enabled: isAuthenticated,
    select: (data) => data.items,
  });
}
