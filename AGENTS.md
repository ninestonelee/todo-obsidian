# Todo Obsidian Agent Rules (Codex/Claude/Antigravity 공통)

## 작업 로그 강제 규칙 (Claude 수준 동등화)

- 모든 실질 작업의 마지막 단계에서 반드시 작업 로그를 기록한다.
- 로그 필수 조건:
  - 파일 생성/수정/삭제
  - 코드/문서 작성 또는 편집
  - 분석 결과물/리포트 생성
- 로그 예외 조건:
  - 단순 질의응답
  - 정보 확인만 수행한 경우
- 로그 저장 경로: `../logs/`
- 파일명 형식: `{YYYY-MM-DD}_todo-obsidian_{작업요약}.md`
- 로그 생성 명령: `npm run worklog:write -- "작업 요약"`
- 최종 보고 전 검증 명령: `npm run worklog:verify`

## Todo 작성 규칙

- 작업 계획을 작성할 때 마지막 항목에 반드시 `작업 로그 기록`을 포함한다.

## Git 강제 규칙

- `pre-commit` 훅에서 당일 로그 파일 존재 여부와 최신성(기본 12시간)을 검사한다.
- 검사 실패 시 커밋을 차단한다.
- 긴급 우회가 필요하면 다음 환경변수로만 우회할 수 있다:
  - `SKIP_WORKLOG_CHECK=1 git commit ...`

