import { describe, it, expect, beforeEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { PostsApiRepository } from '../PostsApiRepository';
import { useAuthStore } from '@/infrastructure/store/auth/authStore';
import { server } from '@/test/mocks/server';
import { resetMockPosts, resetMockTags, seedMockTag } from '@/test/mocks/handlers';

const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe('PostsApiRepository', () => {
  const repo = new PostsApiRepository();

  beforeEach(() => {
    resetMockPosts();
    resetMockTags();
    useAuthStore.getState().setTokens({
      accessToken: 'mock-access-token',
      refreshToken: 'mock-refresh-token',
    });
  });

  describe('create', () => {
    it('게시글을 생성하면 id를 반환한다', async () => {
      const result = await repo.create({
        title: 'first post',
        content: 'hello',
        isPublished: true,
      });
      expect(result).toEqual({ id: 1 });
    });

    it('createPost 호출 시 Idempotency-Key 헤더가 UUID v4로 자동 주입된다', async () => {
      let capturedKey: string | null = null;
      server.use(
        http.post('*/v1/posts', ({ request }) => {
          capturedKey = request.headers.get('Idempotency-Key');
          return HttpResponse.json({ id: 99 }, { status: 201 });
        }),
      );

      await repo.create({ title: 'idempotent', content: 'x' });

      expect(capturedKey).not.toBeNull();
      expect(capturedKey).toMatch(UUID_V4_REGEX);
    });

    it('동일 사용자가 같은 제목으로 다시 생성하면 409 에러를 던진다', async () => {
      await repo.create({ title: 'duplicate', content: 'x' });
      await expect(repo.create({ title: 'duplicate', content: 'y' })).rejects.toThrow();
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

    it('페이지네이션 메타를 반환한다', async () => {
      for (let i = 0; i < 25; i++) {
        await repo.create({ title: `post-${i}`, content: `content-${i}` });
      }
      const page1 = await repo.findAllPaginated({ page: 1, limit: 10 });
      expect(page1.items).toHaveLength(10);
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

    it('isPublished 필터를 적용한다', async () => {
      await repo.create({ title: 'p1', content: 'x', isPublished: true });
      await repo.create({ title: 'p2', content: 'y', isPublished: false });
      await repo.create({ title: 'p3', content: 'z', isPublished: true });

      const published = await repo.findAllPaginated({
        page: 1,
        limit: 10,
        isPublished: true,
      });
      expect(published.items).toHaveLength(2);
      expect(published.items.every((p) => p.isPublished)).toBe(true);
    });
  });

  describe('getById', () => {
    it('id로 게시글을 조회한다', async () => {
      const { id } = await repo.create({ title: 'detail', content: 'body' });
      const post = await repo.getById(id);
      expect(post.id).toBe(id);
      expect(post.title).toBe('detail');
      expect(post.content).toBe('body');
    });

    it('존재하지 않는 id는 404 에러를 던진다', async () => {
      await expect(repo.getById(9999)).rejects.toThrow();
    });
  });

  describe('update', () => {
    it('게시글을 수정한다', async () => {
      const { id } = await repo.create({ title: 'orig', content: 'a' });
      await repo.update(id, { title: 'updated', content: 'b', isPublished: true });
      const post = await repo.getById(id);
      expect(post.title).toBe('updated');
      expect(post.content).toBe('b');
      expect(post.isPublished).toBe(true);
    });

    it('존재하지 않는 id를 수정하면 404 에러를 던진다', async () => {
      await expect(
        repo.update(9999, { title: 'x', content: 'y', isPublished: false }),
      ).rejects.toThrow();
    });
  });

  describe('delete', () => {
    it('게시글을 삭제한다', async () => {
      const { id } = await repo.create({ title: 'tobe-deleted', content: 'x' });
      await repo.delete(id);
      await expect(repo.getById(id)).rejects.toThrow();
    });

    it('존재하지 않는 id를 삭제하면 404 에러를 던진다', async () => {
      await expect(repo.delete(9999)).rejects.toThrow();
    });
  });

  describe('태그 연동', () => {
    it('tagIds로 생성하면 게시글에 태그가 연결된다', async () => {
      const tagA = seedMockTag('react');
      const tagB = seedMockTag('typescript');

      const { id } = await repo.create({
        title: 'tagged',
        content: 'x',
        tagIds: [tagA.id, tagB.id],
      });
      const post = await repo.getById(id);

      expect(post.tags.map((t) => t.name).sort()).toEqual(['react', 'typescript']);
    });

    it('태그 없이 생성하면 빈 배열을 반환한다', async () => {
      const { id } = await repo.create({ title: 'no-tags', content: 'x' });
      const post = await repo.getById(id);
      expect(post.tags).toEqual([]);
    });

    it('소유하지 않은 태그 id로 생성하면 400 에러를 던진다', async () => {
      await expect(
        repo.create({ title: 'bad-tag', content: 'x', tagIds: [9999] }),
      ).rejects.toThrow();
    });

    it('수정 시 tagIds를 전달하면 기존 태그를 대체한다', async () => {
      const tagA = seedMockTag('a');
      const tagB = seedMockTag('b');
      const { id } = await repo.create({ title: 'replace', content: 'x', tagIds: [tagA.id] });

      await repo.update(id, {
        title: 'replace',
        content: 'x',
        isPublished: false,
        tagIds: [tagB.id],
      });
      const post = await repo.getById(id);

      expect(post.tags.map((t) => t.id)).toEqual([tagB.id]);
    });

    it('tagId 필터로 해당 태그가 연결된 게시글만 조회한다', async () => {
      const tagA = seedMockTag('a');
      const tagB = seedMockTag('b');
      await repo.create({ title: 'p1', content: 'x', tagIds: [tagA.id] });
      await repo.create({ title: 'p2', content: 'y', tagIds: [tagB.id] });
      await repo.create({ title: 'p3', content: 'z', tagIds: [tagA.id] });

      const filtered = await repo.findAllPaginated({ page: 1, limit: 10, tagId: tagA.id });

      expect(filtered.items).toHaveLength(2);
      expect(filtered.items.every((p) => p.tags.some((t) => t.id === tagA.id))).toBe(true);
    });
  });
});
