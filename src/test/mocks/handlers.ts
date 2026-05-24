import { http, HttpResponse } from 'msw';

export const mockUser = {
  id: 1,
  email: 'user@example.com',
  name: '홍길동',
  marketingConsent: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

export const mockTokens = {
  accessToken: 'mock-access-token',
  refreshToken: 'mock-refresh-token',
};

interface MockTag {
  id: number;
  userId: number;
  name: string;
  createdAt: string;
  updatedAt: string;
}

interface MockPost {
  id: number;
  userId: number;
  title: string;
  content: string;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
  tags: MockTag[];
}

const mockPosts: MockPost[] = [];
let nextPostId = 1;

const mockTags: MockTag[] = [];
let nextTagId = 1;

const idempotencyCache = new Map<
  string,
  { statusCode: number; body: Record<string, unknown> }
>();

const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function resetMockPosts(): void {
  mockPosts.length = 0;
  nextPostId = 1;
  idempotencyCache.clear();
}

export function resetMockTags(): void {
  mockTags.length = 0;
  nextTagId = 1;
  idempotencyCache.clear();
}

/** 테스트에서 사용자의 태그를 미리 시드한다. */
export function seedMockTag(name: string): MockTag {
  const now = new Date().toISOString();
  const tag: MockTag = {
    id: nextTagId++,
    userId: mockUser.id,
    name,
    createdAt: now,
    updatedAt: now,
  };
  mockTags.push(tag);
  return tag;
}

function unauthorized() {
  return HttpResponse.json(
    { statusCode: 401, message: 'Unauthorized', error: 'Unauthorized' },
    { status: 401 },
  );
}

/**
 * tagIds를 사용자 소유 태그로 해석한다. 소유하지 않은 id가 있으면 ownershipError.
 * 백엔드 TagOwnershipValidator 동작을 모사한다.
 */
function resolveOwnedTags(
  tagIds: number[] | undefined,
): { tags: MockTag[] } | { ownershipError: true } {
  if (!tagIds || tagIds.length === 0) {
    return { tags: [] };
  }
  const uniqueIds = [...new Set(tagIds)];
  const found = mockTags.filter(
    (tag) => tag.userId === mockUser.id && uniqueIds.includes(tag.id),
  );
  if (found.length !== uniqueIds.length) {
    return { ownershipError: true };
  }
  return { tags: found };
}

export const handlers = [
  http.post('*/v1/auth/register', async ({ request }) => {
    const body = (await request.json()) as {
      email: string;
      password: string;
      name: string;
      marketingConsent?: boolean;
    };

    if (!body.email || !body.password || !body.name) {
      return HttpResponse.json(
        { statusCode: 400, message: '필수 필드가 누락되었습니다', error: 'Bad Request' },
        { status: 400 },
      );
    }

    if (typeof body.marketingConsent !== 'boolean') {
      return HttpResponse.json(
        { statusCode: 400, message: ['marketingConsent must be a boolean value'], error: 'Bad Request' },
        { status: 400 },
      );
    }

    if (body.email === 'duplicate@example.com') {
      return HttpResponse.json(
        { statusCode: 409, message: '이미 사용 중인 이메일입니다', error: 'Conflict' },
        { status: 409 },
      );
    }

    mockUser.email = body.email;
    mockUser.name = body.name;
    mockUser.marketingConsent = body.marketingConsent;
    mockUser.updatedAt = new Date().toISOString();

    return HttpResponse.json(
      { id: mockUser.id, marketingConsent: mockUser.marketingConsent },
      { status: 201 },
    );
  }),

  http.post('*/v1/auth/login', async ({ request }) => {
    const body = (await request.json()) as { email: string; password: string };

    if (body.email === 'user@example.com' && body.password === 'password123') {
      return HttpResponse.json(mockTokens);
    }

    return HttpResponse.json(
      { statusCode: 401, message: '이메일 또는 비밀번호가 일치하지 않습니다', error: 'Unauthorized' },
      { status: 401 },
    );
  }),

  http.post('*/v1/auth/refresh', async ({ request }) => {
    const body = (await request.json()) as { refreshToken: string };
    if (!body.refreshToken) {
      return HttpResponse.json(
        { statusCode: 401, message: '리프레시 토큰이 필요합니다', error: 'Unauthorized' },
        { status: 401 },
      );
    }
    return HttpResponse.json(mockTokens);
  }),

  http.post('*/v1/auth/logout', ({ request }) => {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return unauthorized();
    }
    return new HttpResponse(null, { status: 204 });
  }),

  http.get('*/v1/auth/profile', ({ request }) => {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return unauthorized();
    }
    return HttpResponse.json(mockUser);
  }),

  http.patch('*/v1/auth/profile', async ({ request }) => {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return unauthorized();
    }

    const body = (await request.json().catch(() => null)) as { name?: unknown } | null;

    if (!body || typeof body.name !== 'string') {
      return HttpResponse.json(
        {
          statusCode: 400,
          message: ['name must be a string'],
          error: 'Bad Request',
        },
        { status: 400 },
      );
    }

    const trimmed = body.name.trim();
    if (trimmed.length < 1 || trimmed.length > 30) {
      return HttpResponse.json(
        {
          statusCode: 400,
          message: ['name must be between 1 and 30 characters'],
          error: 'Bad Request',
        },
        { status: 400 },
      );
    }

    mockUser.name = trimmed;
    mockUser.updatedAt = new Date().toISOString();
    return new HttpResponse(null, { status: 204 });
  }),

  http.post('*/v1/auth/google/link', ({ request }) => {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return unauthorized();
    }
    return HttpResponse.json({
      authorizationUrl:
        'https://accounts.google.com/o/oauth2/v2/auth?client_id=mock&state=mock-state',
    });
  }),

  http.delete('*/v1/auth/google/unlink', ({ request }) => {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return unauthorized();
    }
    return new HttpResponse(null, { status: 204 });
  }),

  // ─── Tags ───

  http.post('*/v1/tags', async ({ request }) => {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return unauthorized();
    }

    const idempotencyKey = request.headers.get('Idempotency-Key');
    if (!idempotencyKey) {
      return HttpResponse.json(
        { statusCode: 400, message: 'Idempotency-Key header is required', error: 'Bad Request' },
        { status: 400 },
      );
    }
    if (!UUID_V4_REGEX.test(idempotencyKey)) {
      return HttpResponse.json(
        { statusCode: 400, message: 'Idempotency-Key must be a valid UUID', error: 'Bad Request' },
        { status: 400 },
      );
    }
    const cached = idempotencyCache.get(idempotencyKey);
    if (cached) {
      return HttpResponse.json(cached.body, { status: cached.statusCode });
    }

    const body = (await request.json()) as { name?: string };
    const name = body.name?.trim();
    if (!name) {
      return HttpResponse.json(
        { statusCode: 400, message: 'name은 필수입니다', error: 'Bad Request' },
        { status: 400 },
      );
    }

    if (mockTags.some((tag) => tag.userId === mockUser.id && tag.name === name)) {
      return HttpResponse.json(
        {
          statusCode: 409,
          message: `Tag with name '${name}' already exists`,
          error: 'Conflict',
        },
        { status: 409 },
      );
    }

    const tag = seedMockTag(name);
    const responseBody = { id: tag.id };
    idempotencyCache.set(idempotencyKey, { statusCode: 201, body: responseBody });
    return HttpResponse.json(responseBody, { status: 201 });
  }),

  http.get('*/v1/tags', ({ request }) => {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return unauthorized();
    }

    const url = new URL(request.url);
    const page = Number(url.searchParams.get('page') ?? '1');
    const limit = Number(url.searchParams.get('limit') ?? '10');

    const filtered = mockTags
      .filter((tag) => tag.userId === mockUser.id)
      .slice()
      .sort((a, b) => b.id - a.id);

    const totalElements = filtered.length;
    const totalPages = Math.max(1, Math.ceil(totalElements / limit));
    const start = (page - 1) * limit;
    const items = filtered.slice(start, start + limit);

    return HttpResponse.json({
      items,
      meta: {
        page,
        limit,
        totalElements,
        totalPages,
        isFirst: page === 1,
        isLast: page >= totalPages,
      },
    });
  }),

  http.get('*/v1/tags/:id', ({ request, params }) => {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return unauthorized();
    }
    const id = Number(params.id);
    const tag = mockTags.find((t) => t.id === id && t.userId === mockUser.id);
    if (!tag) {
      return HttpResponse.json(
        { statusCode: 404, message: `Tag with ID ${id} not found`, error: 'Not Found' },
        { status: 404 },
      );
    }
    return HttpResponse.json(tag);
  }),

  http.patch('*/v1/tags/:id', async ({ request, params }) => {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return unauthorized();
    }
    const id = Number(params.id);
    const tag = mockTags.find((t) => t.id === id && t.userId === mockUser.id);
    if (!tag) {
      return HttpResponse.json(
        { statusCode: 404, message: `Tag with ID ${id} not found`, error: 'Not Found' },
        { status: 404 },
      );
    }
    const body = (await request.json()) as { name?: string };
    const name = body.name?.trim();
    if (!name) {
      return HttpResponse.json(
        { statusCode: 400, message: 'name은 필수입니다', error: 'Bad Request' },
        { status: 400 },
      );
    }
    tag.name = name;
    tag.updatedAt = new Date().toISOString();
    // 게시글에 연결된 태그 스냅샷도 갱신
    for (const post of mockPosts) {
      const linked = post.tags.find((t) => t.id === id);
      if (linked) {
        linked.name = name;
        linked.updatedAt = tag.updatedAt;
      }
    }
    return new HttpResponse(null, { status: 204 });
  }),

  http.delete('*/v1/tags/:id', ({ request, params }) => {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return unauthorized();
    }
    const id = Number(params.id);
    const idx = mockTags.findIndex((t) => t.id === id && t.userId === mockUser.id);
    if (idx === -1) {
      return HttpResponse.json(
        { statusCode: 404, message: `Tag with ID ${id} not found`, error: 'Not Found' },
        { status: 404 },
      );
    }
    mockTags.splice(idx, 1);
    // 삭제된 태그를 모든 게시글에서 제거
    for (const post of mockPosts) {
      post.tags = post.tags.filter((t) => t.id !== id);
    }
    return new HttpResponse(null, { status: 204 });
  }),

  // ─── Posts ───

  http.post('*/v1/posts', async ({ request }) => {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return unauthorized();
    }

    const idempotencyKey = request.headers.get('Idempotency-Key');
    if (!idempotencyKey) {
      return HttpResponse.json(
        { statusCode: 400, message: 'Idempotency-Key header is required', error: 'Bad Request' },
        { status: 400 },
      );
    }
    if (!UUID_V4_REGEX.test(idempotencyKey)) {
      return HttpResponse.json(
        { statusCode: 400, message: 'Idempotency-Key must be a valid UUID', error: 'Bad Request' },
        { status: 400 },
      );
    }
    const cached = idempotencyCache.get(idempotencyKey);
    if (cached) {
      return HttpResponse.json(cached.body, { status: cached.statusCode });
    }

    const body = (await request.json()) as {
      title: string;
      content: string;
      isPublished?: boolean;
      tagIds?: number[];
    };

    if (!body.title || !body.content) {
      return HttpResponse.json(
        { statusCode: 400, message: 'title과 content는 필수입니다', error: 'Bad Request' },
        { status: 400 },
      );
    }

    const resolved = resolveOwnedTags(body.tagIds);
    if ('ownershipError' in resolved) {
      return HttpResponse.json(
        {
          statusCode: 400,
          message: 'One or more tags do not exist or are not owned by the user',
          error: 'Bad Request',
        },
        { status: 400 },
      );
    }

    if (mockPosts.some((p) => p.userId === mockUser.id && p.title === body.title)) {
      return HttpResponse.json(
        {
          statusCode: 409,
          message: `Post with title '${body.title}' already exists`,
          error: 'Conflict',
        },
        { status: 409 },
      );
    }

    const now = new Date().toISOString();
    const post: MockPost = {
      id: nextPostId++,
      userId: mockUser.id,
      title: body.title,
      content: body.content,
      isPublished: body.isPublished ?? false,
      createdAt: now,
      updatedAt: now,
      tags: resolved.tags,
    };
    mockPosts.push(post);

    const responseBody = { id: post.id };
    idempotencyCache.set(idempotencyKey, { statusCode: 201, body: responseBody });
    return HttpResponse.json(responseBody, { status: 201 });
  }),

  http.get('*/v1/posts', ({ request }) => {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return unauthorized();
    }

    const url = new URL(request.url);
    const page = Number(url.searchParams.get('page') ?? '1');
    const limit = Number(url.searchParams.get('limit') ?? '10');
    const isPublishedRaw = url.searchParams.get('isPublished');
    const isPublished =
      isPublishedRaw === null ? undefined : isPublishedRaw === 'true';
    const tagIdRaw = url.searchParams.get('tagId');
    const tagId = tagIdRaw === null ? undefined : Number(tagIdRaw);

    let filtered = mockPosts.filter((p) => p.userId === mockUser.id);
    if (isPublished !== undefined) {
      filtered = filtered.filter((p) => p.isPublished === isPublished);
    }
    if (tagId !== undefined) {
      filtered = filtered.filter((p) => p.tags.some((t) => t.id === tagId));
    }
    filtered = filtered.slice().sort((a, b) => b.id - a.id);

    const totalElements = filtered.length;
    const totalPages = Math.max(1, Math.ceil(totalElements / limit));
    const start = (page - 1) * limit;
    const items = filtered.slice(start, start + limit);

    return HttpResponse.json({
      items,
      meta: {
        page,
        limit,
        totalElements,
        totalPages,
        isFirst: page === 1,
        isLast: page >= totalPages,
      },
    });
  }),

  http.get('*/v1/posts/:id', ({ request, params }) => {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return unauthorized();
    }
    const id = Number(params.id);
    const post = mockPosts.find((p) => p.id === id && p.userId === mockUser.id);
    if (!post) {
      return HttpResponse.json(
        { statusCode: 404, message: `Post with ID ${id} not found`, error: 'Not Found' },
        { status: 404 },
      );
    }
    return HttpResponse.json(post);
  }),

  http.patch('*/v1/posts/:id', async ({ request, params }) => {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return unauthorized();
    }
    const id = Number(params.id);
    const post = mockPosts.find((p) => p.id === id && p.userId === mockUser.id);
    if (!post) {
      return HttpResponse.json(
        { statusCode: 404, message: `Post with ID ${id} not found`, error: 'Not Found' },
        { status: 404 },
      );
    }
    const body = (await request.json()) as {
      title: string;
      content: string;
      isPublished: boolean;
      tagIds?: number[];
    };

    if (body.tagIds !== undefined) {
      const resolved = resolveOwnedTags(body.tagIds);
      if ('ownershipError' in resolved) {
        return HttpResponse.json(
          {
            statusCode: 400,
            message: 'One or more tags do not exist or are not owned by the user',
            error: 'Bad Request',
          },
          { status: 400 },
        );
      }
      post.tags = resolved.tags;
    }

    post.title = body.title;
    post.content = body.content;
    post.isPublished = body.isPublished;
    post.updatedAt = new Date().toISOString();
    return new HttpResponse(null, { status: 204 });
  }),

  http.delete('*/v1/posts/:id', ({ request, params }) => {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return unauthorized();
    }
    const id = Number(params.id);
    const idx = mockPosts.findIndex((p) => p.id === id && p.userId === mockUser.id);
    if (idx === -1) {
      return HttpResponse.json(
        { statusCode: 404, message: `Post with ID ${id} not found`, error: 'Not Found' },
        { status: 404 },
      );
    }
    mockPosts.splice(idx, 1);
    return new HttpResponse(null, { status: 204 });
  }),
];
