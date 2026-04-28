import type { PaginatedResult } from '@/domain/common/pagination';
import type {
  CreatePostInput,
  CreatePostResult,
  Post,
  PostsPaginationParams,
  UpdatePostInput,
} from './entities';

export interface PostsCommands {
  create(input: CreatePostInput): Promise<CreatePostResult>;
  update(id: number, input: UpdatePostInput): Promise<void>;
  delete(id: number): Promise<void>;
}

export interface PostsQueries {
  findAllPaginated(params: PostsPaginationParams): Promise<PaginatedResult<Post>>;
  getById(id: number): Promise<Post>;
}

export type PostsRepository = PostsCommands & PostsQueries;
