---
name: commit
description: 변경 사항을 검증한 뒤 컨벤션에 맞춘 한국어 커밋 메시지로 커밋한다. 보호 브랜치(main/dev)에서는 푸시하지 않고 안내한다.
---

# Commit Skill

작업이 끝난 변경분을 검증·스테이징·커밋하는 표준 절차. 분석/재계획 없이 커밋만 수행한다.

## Workflow

1. **검증** — regression이 없는지 확인. 실패하면 중단하고 사용자에게 보고.
   ```bash
   pnpm typecheck
   pnpm lint        # shadcn(badge/button) 사전 이슈 2건은 무시 가능
   pnpm test
   pnpm build
   ```
   추가로 UI/라우팅/Repository 변경이 있고 NestJS 백엔드(`localhost:3000`)가 실행 중이면:
   ```bash
   pnpm test:e2e
   ```

2. **스테이징** — `git status`로 변경 파일을 확인하고 관련 파일만 명시적으로 추가한다. `git add .` / `git add -A`는 사용하지 않는다 (`coverage/`, `.env*`, `.mcp.json` 등이 이미 .gitignore에 있더라도 신중하게).

3. **커밋 메시지 작성** — Conventional Commits 한국어. 본문은 변경 이유 중심.

   ```
   <type>(<scope>): <한국어 요약 70자 이내>

   - 주요 변경 1
   - 주요 변경 2

   Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
   ```

   - `type`: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `ci`, `style`, `perf`
   - `scope`: 도메인/레이어 (`auth`, `posts`, `apiClient`, `router`, `e2e`, `docs` 등)

4. **보호 브랜치 가드** — `git branch --show-current`로 현재 브랜치 확인:
   - `main` 또는 `dev` → **푸시 중단**, 사용자에게 다음 안내:
     - "보호 브랜치입니다. PR을 통해 머지하세요. 작업 브랜치를 먼저 생성하시겠어요?"
     - 커밋 자체는 이미 만들어졌으므로 `git reset --soft HEAD~1`로 되돌릴지도 사용자에게 확인
   - 그 외 (`feat/*`, `fix/*`, `chore/*` 등) → `git push` 실행. 첫 푸시면 `git push -u origin <branch>`.

5. **결과 보고** — 커밋 SHA + 푸시 여부를 짧게 보고. 추가 분석/탐색은 하지 않는다 (사용자가 명시적으로 요청한 경우만).

## 예외 상황

- **검증 실패** — 어떤 단계든 실패하면 중단. `--no-verify` / hook 우회는 사용자가 명시 요청한 경우에만.
- **상충하는 변경** — 작업 외 untracked 파일(예: 다른 task로 추가된 스킬, 임시 파일)은 스테이징하지 않는다.
- **포맷터** — 본 프로젝트는 Prettier가 없고 ESLint만 있다. `pnpm format`은 존재하지 않는다.
