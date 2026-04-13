# Deployment Guide

제출용 권장 구조는 `Vercel(프론트) + Render Web Service(백엔드) + Render Postgres(DB)`입니다.

## 표준 배포 브랜치

- 권장 브랜치: `codex-demo-share`
- 제출 직전에는 이 브랜치만 배포 대상으로 고정하는 것을 권장합니다.

## Render 배포

### 1. Postgres 생성

Render에서 Postgres를 먼저 만들고 `Internal Database URL`을 확보합니다.

### 2. Backend Web Service 생성

- Repository 연결
- Branch: `codex-demo-share`
- Root Directory: `src/backend`
- Runtime: Docker

현재 Dockerfile은 아래를 자동 처리합니다.
- `python -m api.scripts.seed_db`
- `uvicorn api.main:app --host 0.0.0.0 --port $PORT`

### 3. Backend 환경변수

필수:

```env
DATABASE_URL=<Render Postgres internal database URL>
ADMIN_SECRET=<long-random-secret>
CORS_ALLOW_ORIGINS=https://<your-vercel-app>.vercel.app
LLM_TIMEOUT_SEC=5
EAGER_LOAD_RAG=0
```

선택:

```env
CORS_ALLOW_ORIGIN_REGEX=https://.*-<your-vercel-project>\.vercel\.app
GOOGLE_API_KEY=
OLLAMA_URL=
```

권장:
- 공모전 제출용 기본 흐름은 `OLLAMA_URL` 없이 운영합니다.
- `GOOGLE_API_KEY`도 필수는 아닙니다.
- 현재 백엔드는 LLM 없이도 학생 플로우와 관리자 read-model이 동작하도록 fallback을 둡니다.

### 4. Render 확인

- `https://<render-backend-url>/health`
- `https://<render-backend-url>/api/v1/questions?limit=1`

## Vercel 배포

### 1. Project 생성

- Repository 연결
- Branch: `codex-demo-share`
- Root Directory: `src/frontend`
- Framework Preset: Next.js

### 2. Frontend 환경변수

```env
NEXT_PUBLIC_API_BASE_URL=https://<render-backend-url>
NEXT_PUBLIC_USE_MOCK=0
NEXT_PUBLIC_DEMO_USER_ID=demo-user-001
```

### 3. Vercel 확인

- `/today`
- `/solve`
- `/notes`
- `/review`
- `/admin`
- `/admin/students`
- `/admin/ontology`

## 배포 후 체크리스트

- 학생 문제 풀이가 실백엔드로 동작한다.
- 오답 제출 후 오답노트가 갱신된다.
- 관리자 대시보드와 학생 개입면이 실 read-model로 보인다.
- 온톨로지 화면은 workbench라는 점이 배너와 문서에서 명확하다.
- Vercel 프론트에서 Render API 호출 시 CORS 오류가 없다.

## 배포 시 주의

- Render 기본 파일시스템은 영속 저장소가 아니므로 제출용 DB는 Render Postgres를 사용합니다.
- 관리자 온톨로지 저장은 draft/workbench이며 즉시 전역 그래프 재계산을 의미하지 않습니다.
