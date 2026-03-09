#!/usr/bin/env bash
set -euo pipefail

if [[ "${SKIP_WORKLOG_CHECK:-0}" == "1" ]]; then
  exit 0
fi

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
OS_ROOT="$(cd "${ROOT_DIR}/.." && pwd)"
LOG_DIR="${OS_ROOT}/logs"

PROJECT_NAME="${PROJECT_NAME:-todo-obsidian}"
MAX_AGE_MINUTES="${WORKLOG_MAX_AGE_MINUTES:-720}"

STAGED_FILES="$(git -C "${ROOT_DIR}" diff --cached --name-only)"
if [[ -z "${STAGED_FILES}" ]]; then
  exit 0
fi

if [[ ! -d "${LOG_DIR}" ]]; then
  echo "[worklog-check] ${LOG_DIR} 폴더가 없습니다."
  echo "[worklog-check] 먼저 로그를 생성하세요: npm run worklog:write -- \"작업 요약\""
  exit 1
fi

today="$(date +%Y-%m-%d)"

shopt -s nullglob
matching_files=( "${LOG_DIR}/${today}_${PROJECT_NAME}_"*.md )
shopt -u nullglob

if [[ "${#matching_files[@]}" -eq 0 ]]; then
  echo "[worklog-check] 당일 로그 파일이 없습니다."
  echo "[worklog-check] 필요 형식: ${today}_${PROJECT_NAME}_{작업요약}.md"
  echo "[worklog-check] 생성 명령: npm run worklog:write -- \"작업 요약\""
  exit 1
fi

get_mtime() {
  local f="$1"
  if stat -f %m "${f}" >/dev/null 2>&1; then
    stat -f %m "${f}"
  else
    stat -c %Y "${f}"
  fi
}

latest_file="${matching_files[0]}"
latest_mtime="$(get_mtime "${latest_file}")"

for f in "${matching_files[@]}"; do
  current_mtime="$(get_mtime "${f}")"
  if (( current_mtime > latest_mtime )); then
    latest_mtime="${current_mtime}"
    latest_file="${f}"
  fi
done

now_epoch="$(date +%s)"
age_minutes="$(( (now_epoch - latest_mtime) / 60 ))"

if (( age_minutes > MAX_AGE_MINUTES )); then
  echo "[worklog-check] 최신 로그가 너무 오래되었습니다: ${age_minutes}분 경과"
  echo "[worklog-check] 최신 로그: ${latest_file}"
  echo "[worklog-check] 새 로그 생성: npm run worklog:write -- \"작업 요약\""
  exit 1
fi

if ! grep -qF "| **도구** |" "${latest_file}"; then
  echo "[worklog-check] 로그 템플릿이 올바르지 않습니다: ${latest_file}"
  exit 1
fi

exit 0

