import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from '@tanstack/react-router';
import { Button, buttonVariants } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Textarea } from '@/shared/ui/textarea';
import { Label } from '@/shared/ui/label';
import { Checkbox } from '@/shared/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { editPostSchema, type EditPostFormValues } from './editPostSchema';
import { useUpdatePost } from './useUpdatePost';
import { useDeletePost } from './useDeletePost';

interface EditPostFormProps {
  id: number;
  initial: { title: string; content: string; isPublished: boolean };
}

export function EditPostForm({ id, initial }: EditPostFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<EditPostFormValues>({
    resolver: zodResolver(editPostSchema),
    defaultValues: {
      title: initial.title,
      content: initial.content,
      isPublished: initial.isPublished,
    },
  });

  const updateMutation = useUpdatePost(id);
  const deleteMutation = useDeletePost(id);

  const onSubmit = (data: EditPostFormValues) => updateMutation.mutate(data);

  const handleDelete = () => {
    if (window.confirm('정말 삭제하시겠어요? 되돌릴 수 없습니다.')) {
      deleteMutation.mutate();
    }
  };

  const isPublished = useWatch({ control, name: 'isPublished' });
  const isPending = updateMutation.isPending || deleteMutation.isPending;

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl">게시글 수정</CardTitle>
        <CardDescription>제목, 내용, 공개 여부를 수정할 수 있습니다</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">제목</Label>
            <Input id="title" type="text" {...register('title')} />
            {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="content">내용</Label>
            <Textarea id="content" rows={10} {...register('content')} />
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

          {(updateMutation.isError || deleteMutation.isError) && (
            <p className="text-sm text-destructive">
              {(updateMutation.error || deleteMutation.error) instanceof Error
                ? (updateMutation.error || deleteMutation.error)!.message
                : '요청에 실패했습니다'}
            </p>
          )}

          <div className="flex items-center justify-between pt-2">
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={isPending}
            >
              {deleteMutation.isPending ? '삭제 중...' : '삭제'}
            </Button>
            <div className="flex gap-2">
              <Link
                to="/posts/$id"
                params={{ id: String(id) }}
                className={buttonVariants({ variant: 'outline' })}
              >
                취소
              </Link>
              <Button type="submit" disabled={isSubmitting || isPending}>
                {updateMutation.isPending ? '저장 중...' : '저장'}
              </Button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
