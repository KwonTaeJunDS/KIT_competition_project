# Deployment Guide

공모전 제출용 권장 배포 구조입니다.

- 프론트엔드: Vercel
- 백엔드 API: Render Web Service
- 데이터베이스: Render Postgres

## 1. 배포 기준 브랜치

- 권장 브랜치: `codex-demo-share`
- 제출 직전에는 이 브랜치만 배포 대상으로 사용

## 2. Render 배포

### 2-1. Postgres 생성

Render 대시보드에서 Postgres를 먼저 만듭니다.

확보할 값:
- Internal Database URL

### 2-2. Backend Web Service 생성

- Repository 연결
- Branch: `codex-demo-share`
- Root Directory: `src/backend`
- Runtime: Docker

현재 Dockerfile은 아래를 자동 처리합니다.

- `python -m api.scripts.seed_db`
- `uvicorn api.main:app --host 0.0.0.0 --port $PORT`

### 2-3. Backend 환경변수

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
CORS_ALLOW_ORIGIN_REGEX=https://.*-<your-vercel-project>\\.vercel\\.app
GOOGLE_API_KEY=
OLLAMA_URL=
```

권장:

- 공모전 제출용은 `OLLAMA_URL` 비우기
- `GOOGLE_API_KEY`도 필수 아님
- 무거운 모델 초기화는 `EAGER_LOAD_RAG=0`으로 유지

### 2-4. Render 배포 후 확인

- `https://<render-backend-url>/health`
- `https://<render-backend-url>/api/v1/questions?limit=1`

정상 응답이 나와야 합니다.

## 3. Vercel 배포

### 3-1. 프로젝트 생성

- Repository 연결
- Branch: `codex-demo-share`
- Root Directory: `src/frontend`
- Framework Preset: Next.js

### 3-2. Frontend 환경변수

```env
NEXT_PUBLIC_API_BASE_URL=https://<render-backend-url>
NEXT_PUBLIC_USE_MOCK=0
NEXT_PUBLIC_DEMO_USER_ID=demo-user-001
```

### 3-3. Vercel 배포 후 확인

- 학생 홈: `/today`
- 문제 풀이: `/solve`
- 관리자 대시보드: `/admin`
- 관리자 온톨로지: `/admin/ontology`

## 4. 제출 전 최종 체크리스트

- `/solve` 에서 문제가 순환되는가
- 오답 제출 후 `/notes` 가 갱신되는가
- `/admin` 에서 학생 카드가 보이는가
- `/admin/ontology` 에서 초안 저장 후 새로고침해도 유지되는가
- Vercel 프론트에서 Render 백엔드 호출 시 CORS 에러가 없는가

## 5. 주의사항

- Render는 기본 파일시스템이 영속적이지 않으므로 SQLite 운영은 비추천
- 제출용은 Render Postgres를 사용
- 관리자 온톨로지 화면은 전체 그래프 실시간 반영이 아니라 초안 저장 워크벤치임
