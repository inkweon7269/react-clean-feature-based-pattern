import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from '@tanstack/react-router';
import { Button, buttonVariants } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Skeleton } from '@/shared/ui/skeleton';
import { tagSchema, type TagFormValues } from './tagSchema';
import { useTags } from './useTags';
import { useCreateTag } from './useCreateTag';
import { TagListItem } from './TagListItem';

const PAGE_SIZE = 20;

export function TagsManager() {
  const [page, setPage] = useState(1);
  const { data, isLoading, error } = useTags({ page, limit: PAGE_SIZE });
  const createMutation = useCreateTag();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TagFormValues>({
    resolver: zodResolver(tagSchema),
    defaultValues: { name: '' },
  });

  if (error) throw error;

  const onCreate = (values: TagFormValues) => {
    createMutation.mutate(values, {
      onSuccess: () => {
        reset({ name: '' });
        setPage(1);
      },
    });
  };

  return (
    <div className="w-full max-w-3xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">태그 관리</h1>
          <p className="text-sm text-muted-foreground">
            {data ? `총 ${data.meta.totalElements}개` : ' '}
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/posts" className={buttonVariants({ variant: 'outline' })}>
            게시글로
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">새 태그</CardTitle>
          <CardDescription>게시글에 연결할 태그를 만듭니다 (최대 50자)</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onCreate)} className="space-y-2">
            <div className="flex gap-2">
              <Input placeholder="태그 이름" {...register('name')} />
              <Button type="submit" disabled={isSubmitting || createMutation.isPending}>
                {createMutation.isPending ? '추가 중...' : '추가'}
              </Button>
            </div>
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
            {createMutation.isError && (
              <p className="text-sm text-destructive">
                {createMutation.error instanceof Error
                  ? createMutation.error.message
                  : '태그를 생성하지 못했습니다'}
              </p>
            )}
          </form>
        </CardContent>
      </Card>

      {isLoading && (
        <div className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      )}

      {data && data.items.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            아직 만든 태그가 없습니다.
          </CardContent>
        </Card>
      )}

      {data && data.items.length > 0 && (
        <ul className="space-y-2">
          {data.items.map((tag) => (
            <TagListItem key={tag.id} tag={tag} />
          ))}
        </ul>
      )}

      {data && data.meta.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            disabled={data.meta.isFirst}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            이전
          </Button>
          <span className="text-sm text-muted-foreground">
            {data.meta.page} / {data.meta.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={data.meta.isLast}
            onClick={() => setPage((p) => p + 1)}
          >
            다음
          </Button>
        </div>
      )}
    </div>
  );
}
