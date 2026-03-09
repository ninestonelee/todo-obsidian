# Todo Obsidian 개발 로그 및 구현 내역

## 1. 개요
*   **프로젝트**: Todo Obsidian
*   **목적**: 브라우저 기반의 단일 웹 애플리케이션(`index.html`)과 로컬 파일 시스템의 Obsidian Vault를 실시간으로 동기화하는 할 일 관리 시스템 구축.
*   **기술 스택**: 순수 HTML, CSS, JavaScript (Vanilla JS), Obsidian "Local REST API" 플러그인.

## 2. 주요 개발 내역

### 2.1. 사용자 인터페이스 (UI/UX)
*   **디자인 컨셉**: Obsidian 특유의 어두운 테마(Dark Theme)와 모던한 글래스모피즘(Glassmorphism) 스타일을 웹 환경에 구현.
*   **설정 모달(`#settingsModal`)**:
    *   API Key (Bearer Token), 포트 번호, 타겟 마크다운 파일 경로를 입력받는 UI 추가.
    *   사용자 편의성을 위해 직관적인 아이콘과 설명 텍스트 제공.
*   **핵심 기능 뷰**: 카테고리 탭 (배지 카운트 포함), 필터 필(전체/진행중/완료), 검색창, 할 일 목록(아이템 렌더링), 통계 대시보드.

### 2.2. 상태 관리 (State Management)
*   **`localStorage` 활용**: 입력받은 API 설정(키, 포트, 경로)과 오프라인 상태일 때를 대비한 내부 `todos`, `categories` 데이터를 식별 키(`todo_obsidian_data`)로 브라우저에 영구 저장 및 로드.
*   **데이터 구조 (`state` 객체)**:
    ```json
    {
      "todos": [...],
      "categories": [...],
      "activeCategory": "all",
      "activeFilter": "all",
      "obsidianApiKey": "...",
      "obsidianApiPort": "27124",
      "obsidianTargetPath": "Todos.md"
    }
    ```

### 2.3. 옵시디언 동기화 비즈니스 로직 (Local REST API 연동)

**API 통신 규약**:
*   **Base URL**: `https://127.0.0.1:{obsidianApiPort}` (HTTPS 통신 필수)
*   **Headers**: `Authorization: Bearer {obsidianApiKey}`, `Accept: application/vnd.obsidian.md+json` (또는 `Content-Type: text/markdown`)

**(1) 데이터 불러오기 (Read) - `fetchTodosFromObsidian()`**
*   **동작 방식**: 
    1.  저장된 설정값을 바탕으로 옵시디언 Vault 내의 지정된 마크다운 경로(예: `Todos.md`)에 `GET` 요청 수행.
    2.  응답받은 전체 텍스트를 줄 바꿈(`\n`) 단위로 파싱.
    3.  정규 표현식 `/^- \[([ xX])\] (.*)$/` 을 사용하여 할 일 항목 추출.
*   **데이터 매핑**:
    *   완료 상태: `[x]` 또는 `[X]` 체크 여부 판별.
    *   우선순위: 텍스트 내 특정 기호 매핑 (🔥 = high, ⚡ = medium, 💤 = low).
    *   카테고리: 텍스트 내 옵시디언 해시태그(`#category_name`) 추출.
*   **상태 보정**: 기존 `state.todos` 와 텍스트 비교를 통해 중복 방지 및 내부 식별자(`id`), 생성 주기(`createdAt`) 정보 유지. 또한, 업데이트를 위해 `originalLineText` 속성에 원본 라인 텍스트 저장.

**(2) 데이터 동기화 (Create, Update, Delete) - `syncToObsidian(todo, action)`**
*   **동작 방식**: 
    1.  현재 옵시디언 파일 상태를 `GET` 요청으로 읽어옴 (동시성 덮어쓰기 방지).
    2.  조작할 `newLine` 텍스트 문자열 생성: `- [{check}] {text} #{category} {prioSymbol}`
    3.  `action` 분기 처리:
        *   **`create`**: 파일 맨 끝 또는 첫 줄에 `newLine` 추가.
        *   **`update` / `delete`**: 메모리에 저장된 `todo.originalLineText`를 기반으로 파일 텍스트를 치환(`replace`)하거나 삭제.
        *   **Fallback (정규식 검색)**: 원본 라인을 완벽히 찾지 못한 경우를 대비, `todo.text` 내용을 기반으로 정규식 검색을 통해 최선책으로 치환/삭제 시도.
    4.  변경된 최종 텍스트 콘텐츠를 `PUT` 요청으로 덮어쓰기.

### 2.4. 문제 해결 및 트러블슈팅
*   **보안 프로토콜 오류 (ERR_CONNECTION_REFUSED / 연결실패)**:
    *   **원인**: 초기 구현 시 `http://` 통신을 사용했으나, Local REST API 플러그인 사양 및 최신 브라우저 정책상 보안 통신(HTTPS)을 강제함.
    *   **해결**: API Base URL을 `https://127.0.0.1:27124` 형태로 일괄 변경 적용. (단, 자체 인증서 문제로 인해 브라우저에서 '안전하지 않은 연결 허용' 1회 수동 처리가 필요함)
*   **앱 연결 연동 (`openObsidianNote`)**:
    *   할 일 우측 조작 버튼 클릭 시 `obsidian://open?vault=...&file=...` URI 스킴을 호출하여 사용자의 PC에 설치된 네이티브 앱을 즉시 띄우는 편의 기능 개발.

## 3. 향후 개선 가능성 (Future Scope)
*   **폴링(Polling) 또는 웹소켓 적용**: 현재는 새로고침 시에만 Read가 수행되므로, 일정 주기마다 자동으로 옵시디언 데이터를 당겨오는 `setInterval` 방식 또는 플러그인이 지원한다면 변경 감지 이벤트 기반 통신 고도화.
*   **멀티 파일 지원**: 단일 `Todos.md` 파일뿐만 아니라, 날짜별 데일리 노트(`Daily_{YYYYMMDD}.md`) 등 동적 경로 매핑 규칙 추가 기능.
*   **CORS 인증 우회 간소화**: 브라우저 보안 예외 처리 단계를 줄이기 위해, 확장 프로그램(Extension) 스크립트 방식 우회 등 검토.
