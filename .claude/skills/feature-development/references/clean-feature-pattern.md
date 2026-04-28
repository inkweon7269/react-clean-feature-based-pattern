# Clean Architecture + Feature-Based 조합 패턴 상세 가이드

## 코드 패턴 예시

### Entity

```typescript
// src/domain/entities/Todo.ts
export interface Todo {
  id: string;
  title: string;
  completed: boolean;
  createdAt: Date;
}

export function validateTodoTitle(title: string): boolean {
  return title.trim().length >= 1 && title.trim().length <= 100;
}

export function filterTodos(todos: Todo[], completed?: boolean): Todo[] {
  if (completed === undefined) return todos;
  return todos.filter(todo => todo.completed === completed);
}
```

### Repository Port

```typescript
// src/domain/repositories/TodoRepository.ts
import type { Todo } from '../entities/Todo';

export interface TodoRepository {
  getAll(): Promise<Todo[]>;
  getById(id: string): Promise<Todo>;
  create(data: { title: string }): Promise<Todo>;
  update(id: string, data: Partial<Todo>): Promise<Todo>;
  delete(id: string): Promise<void>;
}
```

### Use Case

```typescript
// src/domain/usecases/CreateTodo.ts
import type { Todo } from '../entities/Todo';
import { validateTodoTitle } from '../entities/Todo';
import type { TodoRepository } from '../repositories/TodoRepository';

export class CreateTodo {
  constructor(private readonly repository: TodoRepository) {}

  async execute(data: { title: string }): Promise<Todo> {
    if (!validateTodoTitle(data.title)) {
      throw new Error('제목은 1~100자 사이여야 합니다');
    }
    return this.repository.create(data);
  }
}
```

### API Repository (Adapter)

```typescript
// src/infrastructure/api/TodoApiRepository.ts
import type { Todo } from '@/domain/entities/Todo';
import type { TodoRepository } from '@/domain/repositories/TodoRepository';

const API_BASE = '/api/todos';

export class TodoApiRepository implements TodoRepository {
  async getAll(): Promise<Todo[]> {
    const response = await fetch(API_BASE);
    if (!response.ok) throw new Error('Failed to fetch todos');
    return response.json();
  }

  async create(data: { title: string }): Promise<Todo> {
    const response = await fetch(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create todo');
    return response.json();
  }

  // ... 나머지 메서드
}
```

### Query Key Factory

```typescript
// src/infrastructure/query/todoQueryKeys.ts
export const todoQueryKeys = {
  all: ['todos'] as const,
  lists: () => [...todoQueryKeys.all, 'list'] as const,
  detail: (id: string) => [...todoQueryKeys.all, 'detail', id] as const,
};
```

### Zustand UI Store

```typescript
// src/infrastructure/store/todoUIStore.ts
import { create } from 'zustand';

interface TodoUIState {
  filter: 'all' | 'active' | 'completed';
  setFilter: (filter: 'all' | 'active' | 'completed') => void;
}

export const useTodoUIStore = create<TodoUIState>((set) => ({
  filter: 'all',
  setFilter: (filter) => set({ filter }),
}));
```

### Feature Hook

```typescript
// src/features/todos/useTodos.ts
import { useQuery } from '@tanstack/react-query';
import { GetTodos } from '@/domain/usecases/GetTodos';
import { TodoApiRepository } from '@/infrastructure/api/TodoApiRepository';
import { todoQueryKeys } from '@/infrastructure/query/todoQueryKeys';

export function useTodos() {
  // react-compiler가 자동 메모이제이션하므로 수동 useMemo 불필요
  const getTodos = new GetTodos(new TodoApiRepository());

  return useQuery({
    queryKey: todoQueryKeys.lists(),
    queryFn: () => getTodos.execute(),
  });
}
```

### Feature Component

```typescript
// src/features/todos/TodoList.tsx
import { ErrorBoundary } from 'react-error-boundary';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Skeleton } from '@/shared/ui/skeleton';
import { ErrorFallback } from '@/shared/ErrorFallback';
import { useTodos } from './useTodos';
import { TodoItem } from './TodoItem';

export function TodoList() {
  const { data: todos, isLoading, error } = useTodos();

  if (isLoading) return <Skeleton className="h-48 w-full" />;
  if (error) throw error;

  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <Card>
        <CardHeader>
          <CardTitle>할 일 목록</CardTitle>
        </CardHeader>
        <CardContent>
          {todos?.map(todo => (
            <TodoItem key={todo.id} todo={todo} />
          ))}
        </CardContent>
      </Card>
    </ErrorBoundary>
  );
}
```

## 테스트 패턴

### Domain 테스트 (순수)

```typescript
// src/test/domain/todo-entity.test.ts
import { describe, it, expect } from 'vitest';
import { validateTodoTitle, filterTodos } from '@/domain/entities/Todo';

describe('validateTodoTitle', () => {
  it('빈 문자열은 유효하지 않다', () => {
    expect(validateTodoTitle('')).toBe(false);
  });

  it('100자 이하 문자열은 유효하다', () => {
    expect(validateTodoTitle('테스트')).toBe(true);
  });
});
```

### Use Case 테스트 (mock repository)

```typescript
// src/test/domain/usecases.test.ts
import { describe, it, expect, vi } from 'vitest';
import { CreateTodo } from '@/domain/usecases/CreateTodo';

describe('CreateTodo', () => {
  it('유효한 제목으로 Todo를 생성한다', async () => {
    const mockRepo = {
      create: vi.fn().mockResolvedValue({ id: '1', title: '테스트', completed: false }),
      getAll: vi.fn(), getById: vi.fn(), update: vi.fn(), delete: vi.fn(),
    };
    const usecase = new CreateTodo(mockRepo);
    const result = await usecase.execute({ title: '테스트' });
    expect(result.title).toBe('테스트');
    expect(mockRepo.create).toHaveBeenCalledWith({ title: '테스트' });
  });

  it('빈 제목이면 에러를 던진다', async () => {
    const mockRepo = { create: vi.fn(), getAll: vi.fn(), getById: vi.fn(), update: vi.fn(), delete: vi.fn() };
    const usecase = new CreateTodo(mockRepo);
    await expect(usecase.execute({ title: '' })).rejects.toThrow();
  });
});
```

### Feature 컴포넌트 테스트 (MSW + Testing Library)

```typescript
// src/features/todos/__tests__/TodoList.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TodoList } from '../TodoList';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe('TodoList', () => {
  it('로딩 상태를 표시한다', () => {
    render(<TodoList />, { wrapper: createWrapper() });
    // Skeleton 또는 로딩 UI가 표시되는지 확인
  });
});
```
