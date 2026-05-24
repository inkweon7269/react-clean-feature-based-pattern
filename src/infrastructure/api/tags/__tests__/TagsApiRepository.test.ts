import { describe, it, expect, beforeEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { TagsApiRepository } from '../TagsApiRepository';
import { useAuthStore } from '@/infrastructure/store/auth/authStore';
import { server } from '@/test/mocks/server';
import { resetMockTags } from '@/test/mocks/handlers';

const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe('TagsApiRepository', () => {
  const repo = new TagsApiRepository();

  beforeEach(() => {
    resetMockTags();
    useAuthStore.getState().setTokens({
      accessToken: 'mock-access-token',
      refreshToken: 'mock-refresh-token',
    });
  });

  describe('create', () => {
    it('태그를 생성하면 id를 반환한다', async () => {
      const result = await repo.create({ name: 'nestjs' });
      expect(result).toEqual({ id: 1 });
    });

    it('createTag 호출 시 Idempotency-Key 헤더가 UUID v4로 자동 주입된다', async () => {
      let capturedKey: string | null = null;
      server.use(
        http.post('*/v1/tags', ({ request }) => {
          capturedKey = request.headers.get('Idempotency-Key');
          return HttpResponse.json({ id: 99 }, { status: 201 });
        }),
      );

      await repo.create({ name: 'idempotent' });

      expect(capturedKey).not.toBeNull();
      expect(capturedKey).toMatch(UUID_V4_REGEX);
    });

    it('같은 이름으로 다시 생성하면 409 에러를 던진다', async () => {
      await repo.create({ name: 'duplicate' });
      await expect(repo.create({ name: 'duplicate' })).rejects.toThrow();
    });
  });

  describe('findAllPaginated', () => {
    it('빈 목록을 반환한다', async () => {
      const result = await repo.findAllPaginated({ page: 1, limit: 10 });
      expect(result.items).toHaveLength(0);
      expect(result.meta.totalElements).toBe(0);
      expect(result.meta.isFirst).toBe(true);
      expect(result.meta.isLast).toBe(true);
    });

    it('최신 생성 순(id DESC)으로 페이지네이션 메타를 반환한다', async () => {
      for (let i = 0; i < 25; i++) {
        await repo.create({ name: `tag-${i}` });
      }
      const page1 = await repo.findAllPaginated({ page: 1, limit: 10 });
      expect(page1.items).toHaveLength(10);
      expect(page1.items[0].name).toBe('tag-24');
      expect(page1.meta).toEqual({
        page: 1,
        limit: 10,
        totalElements: 25,
        totalPages: 3,
        isFirst: true,
        isLast: false,
      });

      const page3 = await repo.findAllPaginated({ page: 3, limit: 10 });
      expect(page3.items).toHaveLength(5);
      expect(page3.meta.isLast).toBe(true);
    });
  });

  describe('getById', () => {
    it('id로 태그를 조회한다', async () => {
      const { id } = await repo.create({ name: 'typescript' });
      const tag = await repo.getById(id);
      expect(tag.id).toBe(id);
      expect(tag.name).toBe('typescript');
      expect(tag.userId).toBe(1);
    });

    it('존재하지 않는 id는 404 에러를 던진다', async () => {
      await expect(repo.getById(9999)).rejects.toThrow();
    });
  });

  describe('update', () => {
    it('태그 이름을 수정한다', async () => {
      const { id } = await repo.create({ name: 'orig' });
      await repo.update(id, { name: 'updated' });
      const tag = await repo.getById(id);
      expect(tag.name).toBe('updated');
    });

    it('존재하지 않는 id를 수정하면 404 에러를 던진다', async () => {
      await expect(repo.update(9999, { name: 'x' })).rejects.toThrow();
    });
  });

  describe('delete', () => {
    it('태그를 삭제한다', async () => {
      const { id } = await repo.create({ name: 'tobe-deleted' });
      await repo.delete(id);
      await expect(repo.getById(id)).rejects.toThrow();
    });

    it('존재하지 않는 id를 삭제하면 404 에러를 던진다', async () => {
      await expect(repo.delete(9999)).rejects.toThrow();
    });
  });
});
