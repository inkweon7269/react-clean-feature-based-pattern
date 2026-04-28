import type { PostsPaginationParams } from '@/domain/posts/entities';

export const postsQueryKeys = {
  all: ['posts'] as const,
  lists: () => [...postsQueryKeys.all, 'list'] as const,
  list: (params: PostsPaginationParams) => [...postsQueryKeys.lists(), params] as const,
  details: () => [...postsQueryKeys.all, 'detail'] as const,
  detail: (id: number) => [...postsQueryKeys.details(), id] as const,
};
