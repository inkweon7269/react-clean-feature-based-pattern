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

export interface PostsPaginationParams {
  page?: number;
  limit?: number;
  isPublished?: boolean;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  totalElements: number;
  totalPages: number;
  isFirst: boolean;
  isLast: boolean;
}

export interface PaginatedResult<T> {
  items: T[];
  meta: PaginationMeta;
}

export interface CreatePostResult {
  id: number;
}
