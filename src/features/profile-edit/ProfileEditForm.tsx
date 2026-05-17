import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from '@tanstack/react-router';
import { Button, buttonVariants } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { ApiError } from '@/infrastructure/api/apiClient';
import { profileEditSchema, type ProfileEditFormValues } from './profileEditSchema';
import { useUpdateProfile } from './useUpdateProfile';

interface ProfileEditFormProps {
  initial: { name: string };
}

export function ProfileEditForm({ initial }: ProfileEditFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProfileEditFormValues>({
    resolver: zodResolver(profileEditSchema),
    defaultValues: { name: initial.name },
  });

  const updateMutation = useUpdateProfile();

  const onSubmit = (data: ProfileEditFormValues) => updateMutation.mutate(data);

  const errorMessage = (() => {
    if (!updateMutation.isError) return null;
    const e = updateMutation.error;
    if (e instanceof ApiError) return e.message;
    return e instanceof Error ? e.message : '프로필 수정에 실패했습니다.';
  })();

  const isPending = updateMutation.isPending;

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl">프로필 수정</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">이름</Label>
            <Input id="name" type="text" autoComplete="name" {...register('name')} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>

          {errorMessage && <p className="text-sm text-destructive">{errorMessage}</p>}

          <div className="flex items-center justify-end gap-2 pt-2">
            <Link to="/" className={buttonVariants({ variant: 'outline' })}>
              취소
            </Link>
            <Button type="submit" disabled={isSubmitting || isPending}>
              {isPending ? '저장 중...' : '저장'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
