# UI_STATE_MAP.md

> Last updated: 2026-04-13

## 현재 라우트

- `/today`: 학생 오늘 화면
- `/solve`: 학생 문제 풀이 + 제출 결과 시트
- `/notes`: 학생 오답노트
- `/review`: 학생 복습 큐
- `/admin`: 관리자 대시보드
- `/admin/students`: 관리자 학생 개입면
- `/admin/students/[studentId]`: 관리자 학생 상세
- `/admin/ontology`: 관리자 온톨로지 workbench

## 학생 화면 상태

### `/today`
- `loading`: 카드 skeleton
- `success`: 오늘 복습 수, 새 문제 수, 취약 주제 노출
- `empty`: weak topic이 없거나 counts가 0이어도 빈 상태 카드로 처리
- `error`: API 오류 메시지와 재시도

### `/solve`
- `loading`: 문항 상세 로딩
- `ready`: 보기 선택 전
- `selected`: 답안 선택 후 제출 가능
- `submitting`: 답안 제출 중
- `result-sheet`: 정답/오답 해설과 다음 행동 표시
- `error`: 제출 실패 또는 문항 fetch 실패

### `/notes`
- `loading`
- `success`
- `empty`: 오답노트 없음
- `error`

### `/review`
- `loading`
- `success`: due 또는 includeAll 기준 항목 표시
- `empty`: 보여줄 복습 큐 없음
- `error`

## 관리자 화면 상태

### `/admin`
- `loading`: 관리자 read-model 상태 확인 중
- `live`: 실백엔드 read-model
- `mock`: `NEXT_PUBLIC_USE_MOCK=1`일 때만 허용
- `empty`: read-model 연결은 됐지만 집계가 비어 있음
- `unavailable`: API 실패, mock으로 치환하지 않음

### `/admin/students`
- `loading`: 학생 개입 큐 로딩
- `live`: 실 read-model 기반 큐
- `mock`: 명시적 mock 모드
- `empty`: 학생 큐 없음
- `unavailable`: API 실패, 빈 상태 유지

### `/admin/students/[studentId]`
- `live`: 학생 상세 표시
- `mock`: 명시적 mock 모드 상세
- `empty/unavailable`: 상세 대신 상태 안내 패널
- `notFound`: 선택한 학생 ID가 실제 데이터에도 없음

### `/admin/ontology`
- `live`: 실데이터 기반 편집 후보와 영향 미리보기
- `mock`: 명시적 mock workbench
- `empty`: 편집 후보 없음
- `unavailable`: 관리자 API 실패, 빈 workbench 유지

## 관리자 온톨로지 저장 규칙

- workbench는 draft 저장만 다룹니다.
- draft 저장은 서버 우선입니다.
- 서버 draft 저장 실패 시 같은 브라우저의 localStorage draft로 fallback합니다.
- 이 fallback은 관리자 온톨로지 화면에만 허용됩니다.
- 대시보드/학생 개입면 read-model은 실패 시 mock으로 덮지 않습니다.
