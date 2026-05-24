import { useMutation, useQueryClient } from '@tanstack/react-query';
import { TagsApiRepository } from '@/infrastructure/api/tags/TagsApiRepository';
import { tagsQueryKeys } from '@/infrastructure/query/tags/tagsQueryKeys';
import { postsQueryKeys } from '@/infrastructure/query/posts/postsQueryKeys';
import type { UpdateTagInput } from '@/domain/tags/entities';

export function useUpdateTag(id: number) {
  const repo = new TagsApiRepository();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateTagInput) => repo.update(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tagsQueryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: tagsQueryKeys.detail(id) });
      // 게시글에 표시되는 태그 이름이 갱신되어야 하므로 posts 캐시도 무효화
      queryClient.invalidateQueries({ queryKey: postsQueryKeys.all });
    },
  });
}
