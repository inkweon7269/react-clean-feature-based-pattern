import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useSearch } from '@tanstack/react-router';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { loginSchema, type LoginFormValues } from './loginSchema';
import { useLogin } from './useLogin';
import { GoogleLoginButton } from './GoogleLoginButton';

const oauthErrorMessages: Record<string, string> = {
  email_already_exists:
    '이미 가입된 이메일입니다. 비밀번호로 로그인해주세요.',
  email_not_verified:
    'Google 계정 이메일이 검증되지 않았습니다. 다른 계정으로 시도해주세요.',
  unknown: '로그인 처리 중 오류가 발생했습니다.',
};

export function LoginForm() {
  const search = useSearch({ from: '/login' });
  const oauthError = search.error;
  const prefilledEmail = search.email ?? '';

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: prefilledEmail,
      password: '',
    },
  });

  const loginMutation = useLogin();

  const onSubmit = (data: LoginFormValues) => {
    loginMutation.mutate(data);
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl">로그인</CardTitle>
        <CardDescription>이메일과 비밀번호를 입력해주세요</CardDescription>
      </CardHeader>
      <CardContent>
        {oauthError && (
          <div
            role="alert"
            className="mb-4 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
          >
            {oauthErrorMessages[oauthError] ?? oauthErrorMessages.unknown}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              이메일
            </label>
            <Input
              id="email"
              type="email"
              placeholder="user@example.com"
              {...register('email')}
            />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium">
              비밀번호
            </label>
            <Input
              id="password"
              type="password"
              placeholder="비밀번호"
              {...register('password')}
            />
            {errors.password && (
              <p className="text-sm text-destructive">{errors.password.message}</p>
            )}
          </div>

          {loginMutation.isError && (
            <p className="text-sm text-destructive">
              {loginMutation.error instanceof Error
                ? loginMutation.error.message
                : '로그인에 실패했습니다'}
            </p>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={isSubmitting || loginMutation.isPending}
          >
            {loginMutation.isPending ? '로그인 중...' : '로그인'}
          </Button>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">또는</span>
            </div>
          </div>

          <GoogleLoginButton />

          <p className="text-sm text-center text-muted-foreground">
            아직 계정이 없으신가요?{' '}
            <Link to="/register" className="text-primary underline-offset-4 hover:underline">
              회원가입
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
