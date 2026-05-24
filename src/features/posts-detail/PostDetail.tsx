import { Link } from '@tanstack/react-router';
import { buttonVariants } from '@/shared/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Skeleton } from '@/shared/ui/skeleton';
import { Badge } from '@/shared/ui/badge';
import { usePost } from './usePost';

interface PostDetailProps {
  id: number;
}

export function PostDetail({ id }: PostDetailProps) {
  const { data: post, isLoading, error } = usePost(id);

  if (error) throw error;

  if (isLoading) {
    return (
      <Card className="w-full max-w-3xl mx-auto">
        <CardHeader>
          <Skeleton className="h-7 w-1/2" />
          <Skeleton className="h-4 w-32" />
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </CardContent>
      </Card>
    );
  }

  if (!post) return null;

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <CardTitle className="text-2xl">{post.title}</CardTitle>
          <Badge variant={post.isPublished ? 'default' : 'secondary'}>
            {post.isPublished ? '공개' : '비공개'}
          </Badge>
        </div>
        <CardDescription>
          작성: {new Date(post.createdAt).toLocaleString('ko-KR')}
          {post.createdAt !== post.updatedAt && (
            <> · 수정: {new Date(post.updatedAt).toLocaleString('ko-KR')}</>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {post.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {post.tags.map((tag) => (
              <Badge key={tag.id} variant="outline" className="text-sm">
                {tag.name}
              </Badge>
            ))}
          </div>
        )}
        <p className="whitespace-pre-wrap text-sm">{post.content}</p>
        <div className="flex justify-end gap-2">
          <Link to="/posts" className={buttonVariants({ variant: 'outline' })}>
            목록으로
          </Link>
          <Link
            to="/posts/$id/edit"
            params={{ id: String(post.id) }}
            className={buttonVariants({ variant: 'default' })}
          >
            수정
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
