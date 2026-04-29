import type {
  AuthTokens,
  LoginCredentials,
  RegisterCredentials,
  RegisterResult,
  User,
} from './entities';

export interface GoogleLinkInitiateResult {
  authorizationUrl: string;
}

export interface AuthCommands {
  register(credentials: RegisterCredentials): Promise<RegisterResult>;
  login(credentials: LoginCredentials): Promise<AuthTokens>;
  refresh(refreshToken: string): Promise<AuthTokens>;
  logout(): Promise<void>;
  unlinkGoogle(): Promise<void>;
  startGoogleLink(): Promise<GoogleLinkInitiateResult>;
}

export interface AuthQueries {
  getProfile(): Promise<User>;
}

export type AuthRepository = AuthCommands & AuthQueries;
