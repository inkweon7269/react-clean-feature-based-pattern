import { useParams } from '@tanstack/react-router';
import { PostDetail } from '@/features/posts-detail/PostDetail';

export function PostDetailPage() {
  const { id } = useParams({ from: '/posts/$id' });
  const numericId = Number(id);

  return (
    <div className="py-4">
      <PostDetail id={numericId} />
    </div>
  );
}
