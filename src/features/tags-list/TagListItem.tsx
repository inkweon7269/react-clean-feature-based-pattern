import { useState } from 'react';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Badge } from '@/shared/ui/badge';
import type { Tag } from '@/domain/tags/entities';
import { tagSchema } from './tagSchema';
import { useUpdateTag } from './useUpdateTag';
import { useDeleteTag } from './useDeleteTag';

interface TagListItemProps {
  tag: Tag;
}

export function TagListItem({ tag }: TagListItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(tag.name);
  const [error, setError] = useState<string | null>(null);

  const updateMutation = useUpdateTag(tag.id);
  const deleteMutation = useDeleteTag(tag.id);
  const isPending = updateMutation.isPending || deleteMutation.isPending;

  const startEdit = () => {
    setName(tag.name);
    setError(null);
    setIsEditing(true);
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setError(null);
  };

  const save = () => {
    const parsed = tagSchema.safeParse({ name });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? '잘못된 입력입니다');
      return;
    }
    updateMutation.mutate(
      { name: parsed.data.name },
      { onSuccess: () => setIsEditing(false) },
    );
  };

  const handleDelete = () => {
    if (window.confirm(`'${tag.name}' 태그를 삭제하시겠어요? 게시글에서도 제거됩니다.`)) {
      deleteMutation.mutate();
    }
  };

  const mutationError = updateMutation.error || deleteMutation.error;

  return (
    <li className="flex flex-col gap-1 rounded-md border px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        {isEditing ? (
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            aria-label="태그 이름"
            className="h-8"
            disabled={updateMutation.isPending}
            autoFocus
          />
        ) : (
          <Badge variant="secondary" className="text-sm">
            {tag.name}
          </Badge>
        )}

        <div className="flex shrink-0 gap-2">
          {isEditing ? (
            <>
              <Button size="sm" onClick={save} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? '저장 중...' : '저장'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={cancelEdit}
                disabled={updateMutation.isPending}
              >
                취소
              </Button>
            </>
          ) : (
            <>
              <Button size="sm" variant="outline" onClick={startEdit} disabled={isPending}>
                수정
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={handleDelete}
                disabled={isPending}
              >
                {deleteMutation.isPending ? '삭제 중...' : '삭제'}
              </Button>
            </>
          )}
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {!error && mutationError && (
        <p className="text-sm text-destructive">
          {mutationError instanceof Error ? mutationError.message : '요청에 실패했습니다'}
        </p>
      )}
    </li>
  );
}
