import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Skeleton } from '@/shared/ui/skeleton';
import { Button } from '@/shared/ui/button';
import { useProfile } from './useProfile';
import { useLogout } from './useLogout';

export function ProfileCard() {
  const { data: user, isLoading, error } = useProfile();
  const logoutMutation = useLogout();

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

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-xl">{user.name}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="text-sm">
          <span className="text-muted-foreground">이메일: </span>
          <span>{user.email}</span>
        </div>
        <div className="text-sm">
          <span className="text-muted-foreground">가입일: </span>
          <span>{new Date(user.createdAt).toLocaleDateString('ko-KR')}</span>
        </div>
        <Button
          variant="outline"
          className="w-full mt-4"
          onClick={() => logoutMutation.mutate()}
          disabled={logoutMutation.isPending}
        >
          {logoutMutation.isPending ? '로그아웃 중...' : '로그아웃'}
        </Button>
      </CardContent>
    </Card>
  );
}
