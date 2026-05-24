import type { TagsPaginationParams } from '@/domain/tags/entities';

export const tagsQueryKeys = {
  all: ['tags'] as const,
  lists: () => [...tagsQueryKeys.all, 'list'] as const,
  list: (params: TagsPaginationParams) => [...tagsQueryKeys.lists(), params] as const,
  details: () => [...tagsQueryKeys.all, 'detail'] as const,
  detail: (id: number) => [...tagsQueryKeys.details(), id] as const,
};
