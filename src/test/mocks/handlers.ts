import { http, HttpResponse } from 'msw';

export const mockUser = {
  id: 1,
  email: 'user@example.com',
  name: '홍길동',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

export const mockTokens = {
  accessToken: 'mock-access-token',
  refreshToken: 'mock-refresh-token',
};

interface MockPost {
  id: number;
  userId: number;
  title: string;
  content: string;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

const mockPosts: MockPost[] = [];
let nextPostId = 1;

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

function unauthorized() {
  return HttpResponse.json(
    { statusCode: 401, message: 'Unauthorized', error: 'Unauthorized' },
    { status: 401 },
  );
}

export const handlers = [
  http.post('*/v1/auth/register', async ({ request }) => {
    const body = (await request.json()) as { email: string; password: string; name: string };

    if (!body.email || !body.password || !body.name) {
      return HttpResponse.json(
        { statusCode: 400, message: '필수 필드가 누락되었습니다', error: 'Bad Request' },
        { status: 400 },
      );
    }

    if (body.email === 'duplicate@example.com') {
      return HttpResponse.json(
        { statusCode: 409, message: '이미 사용 중인 이메일입니다', error: 'Conflict' },
        { status: 409 },
      );
    }

    return HttpResponse.json({ id: 1 }, { status: 201 });
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
    };

    if (!body.title || !body.content) {
      return HttpResponse.json(
        { statusCode: 400, message: 'title과 content는 필수입니다', error: 'Bad Request' },
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

    let filtered = mockPosts.filter((p) => p.userId === mockUser.id);
    if (isPublished !== undefined) {
      filtered = filtered.filter((p) => p.isPublished === isPublished);
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
    };
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
