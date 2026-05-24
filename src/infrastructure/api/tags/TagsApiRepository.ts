import type { PaginatedResult } from '@/domain/common/pagination';
import type {
  CreateTagInput,
  CreateTagResult,
  Tag,
  TagsPaginationParams,
  UpdateTagInput,
} from '@/domain/tags/entities';
import type { TagsRepository } from '@/domain/tags/repository';
import { apiClient } from '../apiClient';

export class TagsApiRepository implements TagsRepository {
  async create(input: CreateTagInput): Promise<CreateTagResult> {
    const { data } = await apiClient.post<CreateTagResult>('/v1/tags', input);
    return data;
  }

  async update(id: number, input: UpdateTagInput): Promise<void> {
    await apiClient.patch<void>(`/v1/tags/${id}`, input);
  }

  async delete(id: number): Promise<void> {
    await apiClient.delete<void>(`/v1/tags/${id}`);
  }

  async findAllPaginated(params: TagsPaginationParams): Promise<PaginatedResult<Tag>> {
    const { data } = await apiClient.get<PaginatedResult<Tag>>('/v1/tags', {
      params: {
        page: params.page,
        limit: params.limit,
      },
    });
    return data;
  }

  async getById(id: number): Promise<Tag> {
    const { data } = await apiClient.get<Tag>(`/v1/tags/${id}`);
    return data;
  }
}
