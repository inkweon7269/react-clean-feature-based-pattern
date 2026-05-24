import { useParams } from '@tanstack/react-router';
import { Card, CardContent, CardHeader } from '@/shared/ui/card';
import { Skeleton } from '@/shared/ui/skeleton';
import { usePost } from '@/features/posts-detail/usePost';
import { EditPostForm } from '@/features/posts-edit/EditPostForm';

export function PostEditPage() {
  const { id } = useParams({ from: '/posts/$id/edit' });
  const numericId = Number(id);
  const { data: post, isLoading, error } = usePost(numericId);

  if (error) throw error;

  return (
    <div className="py-4">
      {isLoading || !post ? (
        <Card className="w-full max-w-3xl mx-auto">
          <CardHeader>
            <Skeleton className="h-7 w-1/2" />
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
      ) : (
        <EditPostForm
          id={numericId}
          initial={{
            title: post.title,
            content: post.content,
            isPublished: post.isPublished,
            tagIds: post.tags.map((tag) => tag.id),
          }}
        />
      )}
    </div>
  );
}
