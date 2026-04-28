import type { FallbackProps } from 'react-error-boundary';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';

export function ErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  return (
    <Card className="m-4 border-destructive">
      <CardHeader>
        <CardTitle className="text-destructive">오류가 발생했습니다</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다'}
        </p>
        <Button onClick={resetErrorBoundary} variant="outline">
          다시 시도
        </Button>
      </CardContent>
    </Card>
  );
}
