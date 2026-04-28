import type { PaginatedResult } from '@/domain/common/pagination';
import type {
  CreatePostInput,
  CreatePostResult,
  Post,
  PostsPaginationParams,
  UpdatePostInput,
} from '@/domain/posts/entities';
import type { PostsRepository } from '@/domain/posts/repository';
import { apiClient } from '../apiClient';

export class PostsApiRepository implements PostsRepository {
  async create(input: CreatePostInput): Promise<CreatePostResult> {
    const { data } = await apiClient.post<CreatePostResult>('/v1/posts', input);
    return data;
  }

  async update(id: number, input: UpdatePostInput): Promise<void> {
    await apiClient.patch<void>(`/v1/posts/${id}`, input);
  }

  async delete(id: number): Promise<void> {
    await apiClient.delete<void>(`/v1/posts/${id}`);
  }

  async findAllPaginated(params: PostsPaginationParams): Promise<PaginatedResult<Post>> {
    const { data } = await apiClient.get<PaginatedResult<Post>>('/v1/posts', {
      params: {
        page: params.page,
        limit: params.limit,
        ...(params.isPublished !== undefined && { isPublished: params.isPublished }),
      },
    });
    return data;
  }

  async getById(id: number): Promise<Post> {
    const { data } = await apiClient.get<Post>(`/v1/posts/${id}`);
    return data;
  }
}
