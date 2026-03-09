# GIT_MULTI_AGENT_POLICY 수정 제안서

- 대상 문서: `../docs/GIT_MULTI_AGENT_POLICY.md`
- 작성일: 2026-03-09
- 목적: 기존 정책의 방향은 유지하되, 실제 운영에서 발생하는 충돌/권한/감사 리스크를 줄이기 위한 보강안 제시
- 원칙: 본 제안서는 원문을 직접 수정하지 않고, "적용 문구 초안"만 제시한다.

## 1) 제안 요약

기존 정책은 브랜치 명명과 PR 중심 흐름이 잘 정리되어 있다. 다만 아래 6개가 빠져 있어 운영상 사고 가능성이 남는다.

1. 에이전트 신원/토큰/권한 분리 기준 부재
2. `main` 보호 규칙의 강제값(리뷰/체크/우회금지) 미정의
3. 고위험 경로(`.github/workflows`, 배포/인프라) 사람 승인 규칙 부재
4. PR 직전 동기화(rebase/merge) 규칙 부재
5. 작업 현황 공유(RUN 파일) 포맷/위치 부재
6. `git push --force` 전면 금지로 인한 실무 비효율

## 2) 적용 문구 초안

아래 텍스트를 기존 문서에 "신규 섹션 추가" 또는 "기존 조항 대체" 형태로 반영하는 것을 제안한다.

### A. 인증/권한 분리 (신규 섹션 제안)

```markdown
## [신규] 0. 인증/권한 분리 원칙

- 각 에이전트(claude/antigravity/codex)는 서로 다른 GitHub 신원(별도 GitHub App 또는 별도 Bot 계정)으로 연결한다.
- 개인 PAT 공유를 금지한다.
- 토큰 권한은 최소권한 원칙으로 부여한다.
  - 허용: `contents: read/write`, `pull_requests: write` (필요 최소)
  - 금지: `admin`, `secrets`, `settings` 등 저장소 관리 권한
- 토큰은 최소 90일 주기로 교체하고, 유출 의심 시 즉시 폐기한다.
- 커밋/PR 본문에 작업 에이전트 식별자를 남긴다.
```

### B. main 보호 규칙 구체화 (7번 체크리스트 보강)

```markdown
## [보강] 7. 적용 체크리스트 - Branch Protection 강제값

- [ ] Require a pull request before merging
- [ ] Required approvals: 최소 1명 (사람 리뷰어)
- [ ] Dismiss stale approvals when new commits are pushed
- [ ] Require status checks to pass before merging (`lint`, `test`, `build`)
- [ ] Require conversation resolution before merging
- [ ] Include administrators (관리자 우회 금지)
- [ ] Restrict direct pushes to `main` (예외 계정 없음)
```

### C. 고위험 파일 보호 (신규 섹션 제안)

```markdown
## [신규] 8. 고위험 경로 보호

- 아래 경로는 CODEOWNERS로 "사람 승인 1회 이상"을 필수화한다.
  - `.github/workflows/**`
  - `infra/**` 또는 `infrastructure/**`
  - 배포 설정 파일(`vercel.json`, `docker-compose*.yml`, `terraform/**` 등)
  - 권한/보안 관련 설정 파일
- 에이전트는 고위험 경로 변경 PR 생성은 가능하나, 최종 머지는 사람만 수행한다.
```

### D. 동기화 규칙 강화 (3번 작업 흐름 보강)

```markdown
## [보강] 3. 작업 흐름 - PR 직전 동기화

- PR 생성 직전 반드시 최신 `main`을 반영한다.
  - 권장: `git fetch origin && git rebase origin/main`
  - 대안: `git merge origin/main`
- 동기화 후 테스트/빌드 재실행 결과를 PR 본문에 기록한다.
```

### E. 작업 잠금(RUN 파일) 표준화 (4번 충돌 방지 보강)

```markdown
## [보강] 4. 충돌 방지 원칙 - 작업 잠금 파일 표준

- 경로: `ops/agent-locks/{agent}.md`
- 필수 항목:
  - 작업 ID / 이슈 링크
  - 수정 대상 파일/디렉터리
  - 시작 시각 / 예상 종료 시각
  - 현재 브랜치명
- 동일 파일 경합이 확인되면 먼저 잠금을 건 에이전트가 우선한다.
```

### F. Force Push 정책 정교화 (5번 금지 사항 조정)

```markdown
## [수정] 5. 금지 사항 - force push 규칙

- `main` 및 보호 브랜치에서 `push --force`는 항상 금지
- 개인 작업 브랜치(`claude/*`, `antigravity/*`, `codex/*`)에서는 아래 조건에 한해 허용
  - `--force-with-lease`만 사용
  - 협업자 코멘트 반영/히스토리 정리 목적에 한정
  - PR 본문 또는 코멘트에 force push 사유 기록
```

## 3) PR/리뷰 운영 규칙 추가 제안

```markdown
## [신규] 9. PR 템플릿 필수 항목

- Agent: `claude|antigravity|codex`
- 목적: 무엇을 해결하는지
- 변경 범위: 핵심 파일/모듈
- 검증: 실행한 테스트/체크
- 위험도: `low|medium|high`
- 롤백 방법: 문제 발생 시 되돌리는 절차
```

라벨 정책도 함께 권장한다.

- `agent:claude`, `agent:antigravity`, `agent:codex`
- `risk:low`, `risk:medium`, `risk:high`
- `area:infra`, `area:ci`, `area:app`

## 4) 적용 순서 제안

1. `main` 브랜치 보호 강제값부터 먼저 적용
2. CODEOWNERS와 고위험 경로 승인 규칙 적용
3. PR 템플릿/라벨 표준 도입
4. RUN 파일(작업 잠금) 운영 시작
5. `force-with-lease` 예외 정책 공지

## 5) 수용 기준 (Definition of Done)

- `main` 직접 push 시도는 시스템적으로 차단된다.
- 모든 PR은 사람 승인 1회 이상 + 필수 체크 통과 후에만 머지된다.
- 고위험 경로 PR은 CODEOWNERS 승인 없이는 머지되지 않는다.
- PR 본문에서 작업 에이전트, 검증 결과, 위험도를 확인할 수 있다.
- 동시 작업 중 동일 파일 경합 시 잠금 파일로 우선순위를 판단할 수 있다.

