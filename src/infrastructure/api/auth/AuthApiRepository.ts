import type {
  AuthTokens,
  LoginCredentials,
  RegisterCredentials,
  RegisterResult,
  UpdateProfileInput,
  User,
} from '@/domain/auth/entities';
import type { AuthRepository, GoogleLinkInitiateResult } from '@/domain/auth/repository';
import { apiClient } from '../apiClient';

export class AuthApiRepository implements AuthRepository {
  async register(credentials: RegisterCredentials): Promise<RegisterResult> {
    const { data } = await apiClient.post<RegisterResult>('/v1/auth/register', credentials);
    return data;
  }

  async login(credentials: LoginCredentials): Promise<AuthTokens> {
    const { data } = await apiClient.post<AuthTokens>('/v1/auth/login', credentials);
    return data;
  }

  async refresh(refreshToken: string): Promise<AuthTokens> {
    const { data } = await apiClient.post<AuthTokens>('/v1/auth/refresh', { refreshToken });
    return data;
  }

  async logout(): Promise<void> {
    await apiClient.post<void>('/v1/auth/logout');
  }

  async getProfile(): Promise<User> {
    const { data } = await apiClient.get<User>('/v1/auth/profile');
    return data;
  }

  async updateProfile(input: UpdateProfileInput): Promise<void> {
    await apiClient.patch<void>('/v1/auth/profile', input);
  }

  async unlinkGoogle(): Promise<void> {
    await apiClient.delete<void>('/v1/auth/google/unlink');
  }

  async startGoogleLink(): Promise<GoogleLinkInitiateResult> {
    const { data } = await apiClient.post<GoogleLinkInitiateResult>('/v1/auth/google/link');
    return data;
  }
}
