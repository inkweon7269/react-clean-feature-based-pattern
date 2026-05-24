import type { PaginationParams } from '@/domain/common/pagination';
import type { Tag } from '@/domain/tags/entities';

export interface Post {
  id: number;
  userId: number;
  title: string;
  content: string;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
  tags: Tag[];
}

export interface CreatePostInput {
  title: string;
  content: string;
  isPublished?: boolean;
  tagIds?: number[];
}

export interface UpdatePostInput {
  title: string;
  content: string;
  isPublished: boolean;
  tagIds?: number[];
}

export interface PostsPaginationParams extends PaginationParams {
  isPublished?: boolean;
  tagId?: number;
}

export interface CreatePostResult {
  id: number;
}
