import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { useAuthStore } from '@/infrastructure/store/auth/authStore';

const IDEMPOTENT_ROUTES: ReadonlyArray<{ method: string; urlPattern: RegExp }> = [
  { method: 'post', urlPattern: /^\/v1\/posts\/?$/ },
];

function needsIdempotencyKey(method: string | undefined, url: string | undefined): boolean {
  if (!method || !url) return false;
  return IDEMPOTENT_ROUTES.some(
    (route) => route.method === method.toLowerCase() && route.urlPattern.test(url),
  );
}

interface RetriableRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
  _skipAuth?: boolean;
}

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  const { accessToken } = useAuthStore.getState();
  const cfg = config as RetriableRequestConfig;
  if (accessToken && !cfg._skipAuth) {
    cfg.headers.Authorization = `Bearer ${accessToken}`;
  }
  if (needsIdempotencyKey(cfg.method, cfg.url) && !cfg.headers['Idempotency-Key']) {
    cfg.headers['Idempotency-Key'] = uuidv4();
  }
  return cfg;
});

let refreshPromise: Promise<string> | null = null;

async function performRefresh(): Promise<string> {
  const { refreshToken, setTokens, clearTokens } = useAuthStore.getState();
  if (!refreshToken) {
    clearTokens();
    throw new Error('인증이 만료되었습니다');
  }

  try {
    const response = await apiClient.post<{ accessToken: string; refreshToken: string }>(
      '/v1/auth/refresh',
      { refreshToken },
      { _skipAuth: true } as RetriableRequestConfig,
    );
    setTokens(response.data);
    return response.data.accessToken;
  } catch (error) {
    clearTokens();
    throw error;
  }
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<{ message?: string | string[] }>) => {
    const originalConfig = error.config as RetriableRequestConfig | undefined;
    const status = error.response?.status;

    const isRefreshCall = originalConfig?.url?.includes('/v1/auth/refresh');

    if (status === 401 && originalConfig && !originalConfig._retry && !isRefreshCall) {
      originalConfig._retry = true;
      try {
        refreshPromise ??= performRefresh().finally(() => {
          refreshPromise = null;
        });
        const newAccessToken = await refreshPromise;
        originalConfig.headers.Authorization = `Bearer ${newAccessToken}`;
        return apiClient(originalConfig);
      } catch (refreshError) {
        return Promise.reject(refreshError instanceof Error ? refreshError : new Error('인증이 만료되었습니다'));
      }
    }

    const data = error.response?.data;
    let message = '요청에 실패했습니다';

    if (data?.message) {
      message = Array.isArray(data.message) ? data.message.join(', ') : data.message;
    }

    return Promise.reject(new Error(message));
  },
);
