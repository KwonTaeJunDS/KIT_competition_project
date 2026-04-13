# KIT Competition Project

한국사 학습용 학생 웹과 교사용 운영 웹이 함께 들어 있는 프로젝트입니다.

학생 화면은 문제 풀이, 오답노트, 복습 큐 흐름을 제공하고, 관리자 화면은 학생 위험 신호와 온톨로지 편집 초안 워크벤치를 보여줍니다.

## 프로젝트 구조

- `src/frontend`: Next.js 16 프론트엔드
- `src/backend`: FastAPI 백엔드
- `FRONTEND_BACKEND_CONTRACT.md`: 프론트/백엔드 데이터 계약 메모
- `UI_STATE_MAP.md`: UI 상태 정의 메모

## 빠른 실행

백엔드

```powershell
cd C:\project\2026_project\KIT_competition_project\src\backend
$env:ADMIN_SECRET='demo-admin-secret'
python -m uvicorn api.main:app --reload --port 8001
```

프론트엔드

```powershell
cd C:\project\2026_project\KIT_competition_project\src\frontend
npm run dev
```

프론트 환경변수 파일은 `src/frontend/.env.local` 입니다.

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8001
NEXT_PUBLIC_USE_MOCK=0
NEXT_PUBLIC_DEMO_USER_ID=demo-user-001
```

## 주요 주소

- 학생 홈: `http://localhost:3000/today`
- 문제 풀이: `http://localhost:3000/solve`
- 오답노트: `http://localhost:3000/notes`
- 복습 큐: `http://localhost:3000/review`
- 관리자 대시보드: `http://localhost:3000/admin`
- 관리자 학생 현황: `http://localhost:3000/admin/students`
- 관리자 온톨로지 편집: `http://localhost:3000/admin/ontology`

## 현재 구현 메모

- 학생용 핵심 플로우는 실백엔드 기준으로 동작합니다.
- 관리자 대시보드와 학생 현황은 백엔드 read-model API를 읽습니다.
- 관리자 온톨로지 화면은 "실시간 전체 반영"이 아니라 "편집 초안 저장/재개" 워크벤치입니다.
- 온톨로지 초안은 백엔드 API가 있으면 서버에 저장하고, 실패하면 브라우저 저장소로 fallback 합니다.

## 개발 메모

- 프론트는 `npm run build`로 프로덕션 빌드 검증이 가능합니다.
- 백엔드는 기본적으로 SQLite 로컬 개발을 지원하고, `DATABASE_URL`이 있으면 Postgres로 전환됩니다.
- `ADMIN_SECRET`이 없더라도 관리자 읽기 화면은 뜨지만, 보호가 필요한 관리자 POST 기능은 막힙니다.

## 팀원 공유 권장 방식

- `main`에 바로 push 하지 말고 기능 브랜치에서 작업합니다.
- 예시 브랜치명: `codex/demo-share`
- PR에서 학생 플로우, 관리자 화면, 실행 방법 문서를 같이 검토하는 흐름을 추천합니다.
