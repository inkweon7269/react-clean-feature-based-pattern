import { Card, CardContent, CardHeader } from '@/shared/ui/card';
import { Skeleton } from '@/shared/ui/skeleton';
import { useProfile } from '@/features/profile/useProfile';
import { ProfileEditForm } from './ProfileEditForm';

export function ProfileEditCard() {
  const { data: user, isLoading, error } = useProfile();

  if (error) throw error;

  if (isLoading || !user) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-1/2" />
        </CardContent>
      </Card>
    );
  }

  return <ProfileEditForm initial={{ name: user.name }} />;
}
