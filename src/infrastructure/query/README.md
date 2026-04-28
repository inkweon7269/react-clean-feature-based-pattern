# Query Key 컨벤션

새 도메인 추가 시 아래 패턴을 따른다.

## 기본 구조

```typescript
export const {domain}QueryKeys = {
  all: ['{domain}'] as const,
  lists: () => [...{domain}QueryKeys.all, 'list'] as const,
  list: (params: Params) => [...{domain}QueryKeys.lists(), params] as const,
  details: () => [...{domain}QueryKeys.all, 'detail'] as const,
  detail: (id: string) => [...{domain}QueryKeys.details(), id] as const,
};
```

## 하위 리소스

```typescript
// 주문의 아이템 목록
items: (orderId: string) => [...orderQueryKeys.detail(orderId), 'items'] as const,
```

## Invalidation 계층

```typescript
// 도메인 전체 (목록 + 상세 모두)
queryClient.invalidateQueries({ queryKey: orderQueryKeys.all });

// 목록만 (상세는 유지)
queryClient.invalidateQueries({ queryKey: orderQueryKeys.lists() });

// 특정 항목만
queryClient.invalidateQueries({ queryKey: orderQueryKeys.detail('1') });
```

## 규칙

- 도메인 이름은 단수형 사용 (`order`, `product`, `auth`)
- 파일명: `{domain}QueryKeys.ts`
- 위치: `src/infrastructure/query/{domain}/`
