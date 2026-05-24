import { useMutation, useQueryClient } from '@tanstack/react-query';
import { TagsApiRepository } from '@/infrastructure/api/tags/TagsApiRepository';
import { tagsQueryKeys } from '@/infrastructure/query/tags/tagsQueryKeys';
import { postsQueryKeys } from '@/infrastructure/query/posts/postsQueryKeys';

export function useDeleteTag(id: number) {
  const repo = new TagsApiRepository();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => repo.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tagsQueryKeys.lists() });
      queryClient.removeQueries({ queryKey: tagsQueryKeys.detail(id) });
      // 삭제된 태그가 게시글에서도 제거되어야 하므로 posts 캐시 무효화
      queryClient.invalidateQueries({ queryKey: postsQueryKeys.all });
    },
  });
}
