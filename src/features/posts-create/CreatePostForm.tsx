import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from '@tanstack/react-router';
import { Button, buttonVariants } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Textarea } from '@/shared/ui/textarea';
import { Label } from '@/shared/ui/label';
import { Checkbox } from '@/shared/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { createPostSchema, type CreatePostFormValues } from './createPostSchema';
import { useCreatePost } from './useCreatePost';

export function CreatePostForm() {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CreatePostFormValues>({
    resolver: zodResolver(createPostSchema),
    defaultValues: { title: '', content: '', isPublished: false },
  });

  const createMutation = useCreatePost();
  const onSubmit = (data: CreatePostFormValues) => createMutation.mutate(data);

  const isPublished = watch('isPublished');

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl">새 게시글</CardTitle>
        <CardDescription>제목과 내용을 입력하고 공개 여부를 선택하세요</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">제목</Label>
            <Input id="title" type="text" placeholder="제목을 입력하세요" {...register('title')} />
            {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="content">내용</Label>
            <Textarea
              id="content"
              rows={10}
              placeholder="내용을 입력하세요"
              {...register('content')}
            />
            {errors.content && (
              <p className="text-sm text-destructive">{errors.content.message}</p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="isPublished"
              checked={isPublished}
              onCheckedChange={(checked) => setValue('isPublished', checked === true)}
            />
            <Label htmlFor="isPublished" className="cursor-pointer">
              공개
            </Label>
          </div>

          {createMutation.isError && (
            <p className="text-sm text-destructive">
              {createMutation.error instanceof Error
                ? createMutation.error.message
                : '게시글을 작성하지 못했습니다'}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Link to="/posts" className={buttonVariants({ variant: 'outline' })}>
              취소
            </Link>
            <Button type="submit" disabled={isSubmitting || createMutation.isPending}>
              {createMutation.isPending ? '작성 중...' : '작성'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
