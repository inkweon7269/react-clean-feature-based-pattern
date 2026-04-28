import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { PostsApiRepository } from '@/infrastructure/api/posts/PostsApiRepository';
import { postsQueryKeys } from '@/infrastructure/query/posts/postsQueryKeys';
import type { UpdatePostInput } from '@/domain/posts/entities';

export function useUpdatePost(id: number) {
  const repo = new PostsApiRepository();
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: (input: UpdatePostInput) => repo.update(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: postsQueryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: postsQueryKeys.detail(id) });
      router.navigate({ to: '/posts/$id', params: { id: String(id) } });
    },
  });
}
