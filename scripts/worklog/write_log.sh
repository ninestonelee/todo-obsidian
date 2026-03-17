#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
OS_ROOT="$(cd "${ROOT_DIR}/.." && pwd)"
LOG_DIR="${OS_ROOT}/logs"

PROJECT_NAME="${PROJECT_NAME:-todo-obsidian}"
TOOL_NAME="${TOOL_NAME:-Codex}"
TASK_TYPE="${TASK_TYPE:-개발}"
SUMMARY="${*:-작업기록}"

mkdir -p "${LOG_DIR}"

slugify() {
  local raw="$1"
  local out
  out="$(printf '%s' "${raw}" | sed -E 's/[[:space:]]+/_/g; s#[/\\]+#-#g; s/^_+//; s/_+$//')"
  if [[ -z "${out}" ]]; then
    out="작업기록"
  fi
  printf '%s' "${out}"
}

DATE_ONLY="$(date +%Y-%m-%d)"
TIMESTAMP="$(date '+%Y-%m-%d %H:%M')"
SUMMARY_SLUG="$(slugify "${SUMMARY}")"
BASE_NAME="${DATE_ONLY}_${PROJECT_NAME}_${SUMMARY_SLUG}"
LOG_FILE="${LOG_DIR}/${BASE_NAME}.md"

if [[ -e "${LOG_FILE}" ]]; then
  n=2
  while [[ -e "${LOG_DIR}/${BASE_NAME}_${n}.md" ]]; do
    n=$((n + 1))
  done
  LOG_FILE="${LOG_DIR}/${BASE_NAME}_${n}.md"
fi

BRANCH_NAME="$(git -C "${ROOT_DIR}" rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")"

changed_files_block() {
  local status_line path
  local has_changes=0

  while IFS= read -r status_line; do
    [[ -z "${status_line}" ]] && continue
    path="${status_line:3}"
    has_changes=1
    printf -- '- `%s`\n' "${path}"
  done < <(git -C "${ROOT_DIR}" -c core.quotepath=false status --porcelain=v1 --untracked-files=all 2>/dev/null || true)

  if [[ "${has_changes}" -eq 0 ]]; then
    printf -- '- 변경 파일 없음\n'
  fi
}

cat > "${LOG_FILE}" <<EOF
# 작업 로그

| 항목 | 내용 |
|------|------|
| **날짜** | ${TIMESTAMP} |
| **도구** | ${TOOL_NAME} |
| **프로젝트** | ${PROJECT_NAME} |
| **작업 유형** | ${TASK_TYPE} |
| **브랜치** | \`${BRANCH_NAME}\` |

## 작업 요약

${SUMMARY}

## 주요 변경 사항

$(changed_files_block)

## 다음 단계

- 필요 시 후속 작업 정의
EOF

printf 'Work log created: %s\n' "${LOG_FILE}"
