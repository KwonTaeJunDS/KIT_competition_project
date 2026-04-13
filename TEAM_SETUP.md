# Team Setup

팀원이 이 저장소를 받은 뒤 가장 빠르게 로컬에서 실행하는 순서입니다.

## 1. 저장소 준비

```powershell
git clone https://github.com/KwonTaeJunDS/KIT_competition_project.git
cd C:\path\to\KIT_competition_project
```

## 2. 백엔드 실행

```powershell
cd C:\path\to\KIT_competition_project\src\backend
$env:ADMIN_SECRET='demo-admin-secret'
python -m uvicorn api.main:app --reload --port 8001
```

권장 Python 환경

- 프로젝트에서 쓰던 conda env: `korean_history_rag`
- 또는 `src/backend/api/requirements.txt` 기준으로 별도 venv 구성

## 3. 프론트엔드 실행

```powershell
cd C:\path\to\KIT_competition_project\src\frontend
npm install
npm run dev
```

## 4. 프론트 환경변수 설정

`src/frontend/.env.local`

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8001
NEXT_PUBLIC_USE_MOCK=0
NEXT_PUBLIC_DEMO_USER_ID=demo-user-001
```

## 5. 확인할 화면

- 학생 플로우
  - `http://localhost:3000/today`
  - `http://localhost:3000/solve`
  - `http://localhost:3000/notes`
  - `http://localhost:3000/review`
- 관리자 플로우
  - `http://localhost:3000/admin`
  - `http://localhost:3000/admin/students`
  - `http://localhost:3000/admin/ontology`

## 6. 데모 체크 포인트

- `/solve` 에서 같은 문제만 반복되지 않는지 확인
- 오답 제출 후 `/notes` 에 항목이 생기는지 확인
- `/admin` 에서 학생 위험 카드가 보이는지 확인
- `/admin/ontology` 에서 초안 저장 후 새로고침해도 초안이 유지되는지 확인

## 7. 주의사항

- 백엔드 포트가 `8000`에서 막히면 `8001`을 그대로 사용하면 됩니다.
- 관리자 온톨로지 화면은 초안 저장 워크벤치입니다. 저장 즉시 전체 그래프가 재계산되는 구조는 아닙니다.
- 로컬 테스트 중 생성되는 `.db`, `.db-journal`, `.next`, `node_modules`는 Git에 올리지 않습니다.
