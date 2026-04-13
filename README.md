# KIT Competition Project

한국사 학습용 학생 화면과 교사용 운영 화면을 함께 담은 풀스택 데모 저장소입니다.
학생 플로우는 실백엔드 API 기준으로 동작하고, 관리자 화면은 실백엔드 read-model과 workbench 성격을 구분해서 보여줍니다.

## 현재 기준

- 프론트 API base env: `NEXT_PUBLIC_API_BASE_URL`
- 로컬 백엔드 표준 포트: `8000`
- 로컬 프론트 포트: `3000`
- 학생 핵심 플로우: 실백엔드 (`/today`, `/solve`, `/notes`, `/review`)
- 관리자 대시보드 / 학생 개입면: 실백엔드 read-model
- 관리자 온톨로지: read-model 기반 workbench + draft 저장
  - 서버 draft 저장 우선
  - 실패 시 같은 브라우저의 localStorage draft fallback

## 저장소 구조

- `src/frontend`: Next.js 16 프론트엔드
- `src/backend`: FastAPI 백엔드
- `docker-compose.yml`: 팀 공용 로컬 Docker 실행 기준
- `FRONTEND_BACKEND_CONTRACT.md`: API 계약과 관리자 화면 범위 정리
- `UI_STATE_MAP.md`: 현재 라우트와 화면 상태 맵
- `TEAM_SETUP.md`: 팀원용 빠른 실행 가이드
- `DEPLOYMENT_GUIDE.md`: Vercel + Render 배포 가이드

## 로컬 실행

### 1. 프론트 env 준비

`src/frontend/.env.local`을 아래처럼 맞춥니다.

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
NEXT_PUBLIC_USE_MOCK=0
NEXT_PUBLIC_DEMO_USER_ID=demo-user-001
```

### 2. 백엔드 실행

```powershell
cd C:\project\2026_project\KIT_competition_project\src\backend
$env:ADMIN_SECRET='demo-admin-secret'
python -m uvicorn api.main:app --reload --host 0.0.0.0 --port 8000
```

기본은 SQLite 로컬 개발입니다. `DATABASE_URL`을 따로 주면 Postgres로 전환됩니다.

### 3. 프론트 실행

```powershell
cd C:\project\2026_project\KIT_competition_project\src\frontend
npm install
npm run dev
```

## Docker 실행

루트 기준으로 실행합니다.

```powershell
cd C:\project\2026_project\KIT_competition_project
docker compose up --build
```

기본 포트:
- 프론트: `http://localhost:3000`
- 백엔드: `http://localhost:8000`
- Postgres: `localhost:5432`

참고:
- `ollama` 서비스는 기본 실행 대상이 아니라 `llm` profile에 묶여 있습니다.
- 표준 데모 실행에는 Ollama가 필요하지 않습니다.

## 확인 주소

- 학생 오늘 화면: `http://localhost:3000/today`
- 학생 문제 풀이: `http://localhost:3000/solve`
- 오답노트: `http://localhost:3000/notes`
- 복습 큐: `http://localhost:3000/review`
- 관리자 대시보드: `http://localhost:3000/admin`
- 관리자 학생 개입면: `http://localhost:3000/admin/students`
- 관리자 온톨로지 workbench: `http://localhost:3000/admin/ontology`

## 검증 기준

- `/solve`에서 같은 문제만 반복되지 않아야 합니다.
- 오답 제출 후 `/notes`가 갱신되어야 합니다.
- `/review`는 due 정책에 따라 대기 항목이 보이거나 비어 있어야 합니다.
- `/admin`과 `/admin/students`는 실백엔드 read-model 상태를 그대로 보여야 합니다.
- `/admin/ontology`는 workbench라는 점이 UI와 문서에 명확해야 합니다.

## Mock / fallback 정책

- `NEXT_PUBLIC_USE_MOCK=1`일 때만 명시적으로 mock 데이터를 사용합니다.
- `NEXT_PUBLIC_USE_MOCK=0`이면 학생 플로우는 실백엔드만 사용합니다.
- 관리자 read-model 화면은 API 실패 시 mock으로 바꾸지 않고 `빈 상태` 또는 `연결 실패`를 그대로 표시합니다.
- 관리자 온톨로지 draft 저장만 서버 우선 + local fallback을 허용합니다.

## 브랜치 권장

- 공유 및 검증용 브랜치: `codex-demo-share`
- `main`에 바로 push하기 전에 이 브랜치에서 팀 검증을 먼저 권장합니다.
