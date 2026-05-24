import { useMutation, useQueryClient } from '@tanstack/react-query';
import { TagsApiRepository } from '@/infrastructure/api/tags/TagsApiRepository';
import { tagsQueryKeys } from '@/infrastructure/query/tags/tagsQueryKeys';
import type { CreateTagInput } from '@/domain/tags/entities';

export function useCreateTag() {
  const repo = new TagsApiRepository();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateTagInput) => repo.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tagsQueryKeys.lists() });
    },
  });
}
