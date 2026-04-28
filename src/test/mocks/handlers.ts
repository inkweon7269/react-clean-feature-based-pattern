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
      return HttpResponse.json(
        { statusCode: 401, message: 'Unauthorized', error: 'Unauthorized' },
        { status: 401 },
      );
    }
    return new HttpResponse(null, { status: 204 });
  }),

  http.get('*/v1/auth/profile', ({ request }) => {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return HttpResponse.json(
        { statusCode: 401, message: 'Unauthorized', error: 'Unauthorized' },
        { status: 401 },
      );
    }
    return HttpResponse.json(mockUser);
  }),
];
