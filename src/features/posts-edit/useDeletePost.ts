import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { PostsApiRepository } from '@/infrastructure/api/posts/PostsApiRepository';
import { postsQueryKeys } from '@/infrastructure/query/posts/postsQueryKeys';

export function useDeletePost(id: number) {
  const repo = new PostsApiRepository();
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: () => repo.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: postsQueryKeys.lists() });
      queryClient.removeQueries({ queryKey: postsQueryKeys.detail(id) });
      router.navigate({ to: '/posts' });
    },
  });
}
