import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Button, buttonVariants } from '@/shared/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Skeleton } from '@/shared/ui/skeleton';
import { Badge } from '@/shared/ui/badge';
import { useTagOptions } from '@/shared/useTagOptions';
import { usePosts } from './usePosts';

const PAGE_SIZE = 10;

export function PostsList() {
  const [page, setPage] = useState(1);
  const [tagId, setTagId] = useState<number | undefined>(undefined);
  const { data, isLoading, error } = usePosts({ page, limit: PAGE_SIZE, tagId });
  const { data: tagOptions } = useTagOptions();

  if (error) throw error;

  const selectTag = (next: number | undefined) => {
    setTagId(next);
    setPage(1);
  };

  return (
    <div className="w-full max-w-3xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">내 게시글</h1>
          <p className="text-sm text-muted-foreground">
            {data ? `총 ${data.meta.totalElements}건` : ' '}
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/" className={buttonVariants({ variant: 'outline' })}>
            프로필로
          </Link>
          <Link to="/tags" className={buttonVariants({ variant: 'outline' })}>
            태그 관리
          </Link>
          <Link to="/posts/new" className={buttonVariants({ variant: 'default' })}>
            새 글 작성
          </Link>
        </div>
      </div>

      {tagOptions && tagOptions.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">태그 필터</span>
          <button type="button" onClick={() => selectTag(undefined)} aria-pressed={tagId === undefined}>
            <Badge
              variant={tagId === undefined ? 'default' : 'outline'}
              className="cursor-pointer text-sm"
            >
              전체
            </Badge>
          </button>
          {tagOptions.map((tag) => (
            <button
              key={tag.id}
              type="button"
              onClick={() => selectTag(tag.id)}
              aria-pressed={tagId === tag.id}
            >
              <Badge
                variant={tagId === tag.id ? 'default' : 'outline'}
                className="cursor-pointer text-sm"
              >
                {tag.name}
              </Badge>
            </button>
          ))}
        </div>
      )}

      {isLoading && (
        <div className="space-y-2">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      )}

      {data && data.items.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            {tagId === undefined
              ? '아직 작성한 게시글이 없습니다.'
              : '이 태그로 작성된 게시글이 없습니다.'}
          </CardContent>
        </Card>
      )}

      {data && data.items.length > 0 && (
        <ul className="space-y-3">
          {data.items.map((post) => (
            <li key={post.id}>
              <Link to="/posts/$id" params={{ id: String(post.id) }} className="block">
                <Card className="transition-colors hover:bg-accent/40">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <CardTitle className="text-lg line-clamp-1">{post.title}</CardTitle>
                      <Badge variant={post.isPublished ? 'default' : 'secondary'}>
                        {post.isPublished ? '공개' : '비공개'}
                      </Badge>
                    </div>
                    <CardDescription>
                      {new Date(post.updatedAt).toLocaleString('ko-KR')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {post.content}
                    </p>
                    {post.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {post.tags.map((tag) => (
                          <Badge key={tag.id} variant="outline" className="text-xs">
                            {tag.name}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Link>
            </li>
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
