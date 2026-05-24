import type { PaginatedResult } from '@/domain/common/pagination';
import type {
  CreateTagInput,
  CreateTagResult,
  Tag,
  TagsPaginationParams,
  UpdateTagInput,
} from './entities';

export interface TagsCommands {
  create(input: CreateTagInput): Promise<CreateTagResult>;
  update(id: number, input: UpdateTagInput): Promise<void>;
  delete(id: number): Promise<void>;
}

export interface TagsQueries {
  findAllPaginated(params: TagsPaginationParams): Promise<PaginatedResult<Tag>>;
  getById(id: number): Promise<Tag>;
}

export type TagsRepository = TagsCommands & TagsQueries;
