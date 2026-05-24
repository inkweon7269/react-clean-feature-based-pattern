import { Link } from '@tanstack/react-router';
import { Badge } from '@/shared/ui/badge';
import { Skeleton } from '@/shared/ui/skeleton';
import { useTagOptions } from './useTagOptions';

interface TagMultiSelectProps {
  value: number[];
  onChange: (tagIds: number[]) => void;
  disabled?: boolean;
}

export function TagMultiSelect({ value, onChange, disabled }: TagMultiSelectProps) {
  const { data: tags, isLoading } = useTagOptions();

  const toggle = (id: number) => {
    if (disabled) return;
    onChange(value.includes(id) ? value.filter((tagId) => tagId !== id) : [...value, id]);
  };

  if (isLoading) {
    return <Skeleton className="h-8 w-full" />;
  }

  if (!tags || tags.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        사용할 수 있는 태그가 없습니다.{' '}
        <Link to="/tags" className="underline">
          태그 관리
        </Link>
        에서 먼저 만들어 주세요.
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {tags.map((tag) => {
        const selected = value.includes(tag.id);
        return (
          <button
            key={tag.id}
            type="button"
            onClick={() => toggle(tag.id)}
            disabled={disabled}
            aria-pressed={selected}
            className="rounded-4xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Badge
              variant={selected ? 'default' : 'outline'}
              className="cursor-pointer text-sm"
            >
              {tag.name}
            </Badge>
          </button>
        );
      })}
    </div>
  );
}
