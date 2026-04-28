import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { PostsApiRepository } from '@/infrastructure/api/posts/PostsApiRepository';
import { postsQueryKeys } from '@/infrastructure/query/posts/postsQueryKeys';
import type { CreatePostInput } from '@/domain/posts/entities';

export function useCreatePost() {
  const repo = new PostsApiRepository();
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: (input: CreatePostInput) => repo.create(input),
    onSuccess: ({ id }) => {
      queryClient.invalidateQueries({ queryKey: postsQueryKeys.lists() });
      router.navigate({ to: '/posts/$id', params: { id: String(id) } });
    },
  });
}
