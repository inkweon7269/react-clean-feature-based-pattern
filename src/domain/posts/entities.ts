import type { PaginationParams } from '@/domain/common/pagination';

export interface Post {
  id: number;
  userId: number;
  title: string;
  content: string;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePostInput {
  title: string;
  content: string;
  isPublished?: boolean;
}

export interface UpdatePostInput {
  title: string;
  content: string;
  isPublished: boolean;
}

export interface PostsPaginationParams extends PaginationParams {
  isPublished?: boolean;
}

export interface CreatePostResult {
  id: number;
}
