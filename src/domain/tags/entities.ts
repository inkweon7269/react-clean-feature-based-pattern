import type { PaginationParams } from '@/domain/common/pagination';

export interface Tag {
  id: number;
  userId: number;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTagInput {
  name: string;
}

export interface UpdateTagInput {
  name: string;
}

export type TagsPaginationParams = PaginationParams;

export interface CreateTagResult {
  id: number;
}
