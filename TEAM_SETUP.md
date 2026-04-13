# Team Setup

이 문서는 팀원이 `codex-demo-share` 브랜치를 받아 그대로 실행할 수 있도록 현재 기준을 고정한 가이드입니다.

## 1. 저장소 받기

```powershell
git clone https://github.com/KwonTaeJunDS/KIT_competition_project.git
cd C:\path\to\KIT_competition_project
git fetch origin
git switch codex-demo-share
```

## 2. 프론트 env 만들기

`src/frontend/.env.example`을 참고해서 `src/frontend/.env.local`을 만듭니다.

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
NEXT_PUBLIC_USE_MOCK=0
NEXT_PUBLIC_DEMO_USER_ID=demo-user-001
```

## 3. 백엔드 실행

```powershell
cd C:\path\to\KIT_competition_project\src\backend
$env:ADMIN_SECRET='demo-admin-secret'
python -m uvicorn api.main:app --reload --host 0.0.0.0 --port 8000
```

메모:
- 로컬 표준 포트는 `8000`입니다.
- `DATABASE_URL`이 없으면 SQLite 로컬 DB를 사용합니다.
- Postgres를 쓰려면 루트 `.env.example` 값을 참고해 shell env 또는 배포 env에 넣습니다.

## 4. 프론트 실행

```powershell
cd C:\path\to\KIT_competition_project\src\frontend
npm install
npm run dev
```

## 5. Docker로 실행하고 싶을 때

루트 기준:

```powershell
cd C:\path\to\KIT_competition_project
docker compose up --build
```

기본 주소:
- 프론트: `http://localhost:3000`
- 백엔드: `http://localhost:8000`

## 6. 확인할 화면

학생:
- `http://localhost:3000/today`
- `http://localhost:3000/solve`
- `http://localhost:3000/notes`
- `http://localhost:3000/review`

관리자:
- `http://localhost:3000/admin`
- `http://localhost:3000/admin/students`
- `http://localhost:3000/admin/ontology`

## 7. 빠른 체크리스트

- `/solve`에서 문제가 순환한다.
- 오답 제출 후 `/notes`가 갱신된다.
- `/admin`이 실백엔드 read-model 상태를 보여준다.
- `/admin/students`에서 학생 큐와 상세 진단이 보인다.
- `/admin/ontology`에서 초안 저장 후 다시 들어와도 draft가 이어진다.

## 8. 관리자 화면 해석 기준

- `/admin`, `/admin/students`: 실백엔드 read-model API
- `/admin/ontology`: workbench
  - 편집 후보와 영향 미리보기는 실데이터 기반
  - 저장은 서버 draft 우선
  - 서버 실패 시 같은 브라우저 local draft fallback
  - 즉시 전역 그래프 재계산까지는 하지 않음

## 9. Mock 정책

- `NEXT_PUBLIC_USE_MOCK=1`일 때만 mock을 봅니다.
- `NEXT_PUBLIC_USE_MOCK=0`이면 관리자 read-model API 실패 시 mock으로 덮지 않습니다.
- 즉, 실패는 실패로, 빈 데이터는 빈 데이터로 보이게 되어 있습니다.
