import { Link, useSearch } from '@tanstack/react-router';
import { ApiError } from '@/infrastructure/api/apiClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Skeleton } from '@/shared/ui/skeleton';
import { Button, buttonVariants } from '@/shared/ui/button';
import { useProfile } from './useProfile';
import { useLogout } from './useLogout';
import { useUnlinkGoogle } from './useUnlinkGoogle';
import { useStartGoogleLink } from './useStartGoogleLink';

const oauthMessages: Record<string, { tone: 'success' | 'error'; text: string }> = {
  link_success: {
    tone: 'success',
    text: 'Google 계정이 연결되었습니다.',
  },
  link_conflict: {
    tone: 'error',
    text: '이미 다른 사용자에 연결됐거나 이 계정에 이미 Google이 연결되어 있습니다.',
  },
  email_not_verified: {
    tone: 'error',
    text: 'Google 이메일이 검증되지 않아 연결할 수 없습니다.',
  },
};

export function ProfileCard() {
  const search = useSearch({ from: '/' });
  const { data: user, isLoading, error } = useProfile();
  const logoutMutation = useLogout();
  const unlinkMutation = useUnlinkGoogle();
  const startLinkMutation = useStartGoogleLink();

  const oauthBanner =
    (search.linked === '1' ? oauthMessages.link_success : undefined) ??
    (search.error ? oauthMessages[search.error] : undefined);

  if (isLoading) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </CardContent>
      </Card>
    );
  }

  if (error) throw error;
  if (!user) return null;

  const unlinkErrorMessage = (() => {
    if (!unlinkMutation.isError) return null;
    const e = unlinkMutation.error;
    if (e instanceof ApiError && e.status === 404) {
      return '연결된 Google 계정이 없습니다.';
    }
    return e instanceof Error ? e.message : 'Google 계정 연결 해제에 실패했습니다.';
  })();

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-xl">{user.name}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {oauthBanner && (
          <div
            role="status"
            className={
              oauthBanner.tone === 'success'
                ? 'rounded-md border border-primary/40 bg-primary/10 p-3 text-sm text-primary'
                : 'rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive'
            }
          >
            {oauthBanner.text}
          </div>
        )}

        <div className="text-sm">
          <span className="text-muted-foreground">이메일: </span>
          <span>{user.email}</span>
        </div>
        <div className="text-sm">
          <span className="text-muted-foreground">가입일: </span>
          <span>{new Date(user.createdAt).toLocaleDateString('ko-KR')}</span>
        </div>
        <div className="text-sm">
          <span className="text-muted-foreground">마케팅 수신 동의: </span>
          <span>{user.marketingConsent ? '동의함' : '동의 안 함'}</span>
        </div>

        <Link
          to="/profile/edit"
          className={buttonVariants({ variant: 'outline' }) + ' w-full mt-4'}
        >
          프로필 수정
        </Link>

        <Link to="/posts" className={buttonVariants({ variant: 'default' }) + ' w-full'}>
          내 게시글 보기
        </Link>

        <div className="border-t pt-3 mt-2 space-y-2">
          <p className="text-sm font-medium">Google 계정 관리</p>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => startLinkMutation.mutate()}
            disabled={startLinkMutation.isPending}
          >
            {startLinkMutation.isPending ? '연결 시작 중...' : 'Google 계정 연결'}
          </Button>
          {startLinkMutation.isError && (
            <p className="text-sm text-destructive">
              {startLinkMutation.error instanceof Error
                ? startLinkMutation.error.message
                : 'Google 연결을 시작할 수 없습니다.'}
            </p>
          )}

          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => unlinkMutation.mutate()}
            disabled={unlinkMutation.isPending}
          >
            {unlinkMutation.isPending ? '연결 해제 중...' : 'Google 계정 연결 해제'}
          </Button>
          {unlinkMutation.isSuccess && (
            <p className="text-sm text-primary">Google 계정 연결이 해제되었습니다.</p>
          )}
          {unlinkErrorMessage && (
            <p className="text-sm text-destructive">{unlinkErrorMessage}</p>
          )}
        </div>

        <Button
          variant="outline"
          className="w-full"
          onClick={() => logoutMutation.mutate()}
          disabled={logoutMutation.isPending}
        >
          {logoutMutation.isPending ? '로그아웃 중...' : '로그아웃'}
        </Button>
      </CardContent>
    </Card>
  );
}
