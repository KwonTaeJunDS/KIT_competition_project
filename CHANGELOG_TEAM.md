# CHANGELOG_TEAM.md

> **Rule:** 오늘 바뀐 것 / 깨질 수 있는 것 / 다음 작업을 매일 3줄로 공유

---

## 역할 정의 (고정)

```
Backend owner:  권태준
  - DB (PostgreSQL + pgvector)
  - FastAPI 서버
  - RAG 파이프라인 (seed.json + FAISS)
  - 오답 분석 엔진
  - auth / user 관리
  - content ingest

Frontend owner: 팀원
  - 라우트 구조
  - 컴포넌트 시스템
  - UX / 상태 흐름
  - mock data 기반 화면
  - API adapter layer

Shared:
  - FRONTEND_BACKEND_CONTRACT.md
  - UI_STATE_MAP.md
  - CHANGELOG_TEAM.md
```

---

## 변경 규칙 (필수 준수)

```
1. response 필드 삭제 금지 → deprecated 표시 후 다음 sprint에 제거
2. endpoint 변경 시 CONTRACT.md 먼저 수정 후 구현
3. 필드명 바꾸기 전 상대방에게 먼저 공유
4. 남 영역 코드 임의 수정 금지
5. 급하면 임시 필드 추가 가능하되 TODO 주석 필수
```

---

## Git 브랜치 규칙

```
main          ← 항상 비교적 안정 / 직접 push 금지
frontend/*    ← 팀원 브랜치
backend/*     ← 권태준 브랜치

예시:
  frontend/today-screen
  frontend/solve-flow
  frontend/notes-list
  backend/attempts-api
  backend/review-queue
  backend/rag-search
```

---

## 일일 공유 템플릿

```
날짜: YYYY-MM-DD

오늘 한 것:
-

막힌 것:
-

내일 할 것:
-

⚠️ 프론트에 영향 있는 변경:
-
```

---

## 변경 로그

---

### 2026-04-10

**Backend (권태준)**

오늘 한 것:
- 한능검 5년치 PDF 파싱 완료 (248문항, seed.json 생성)
- FAISS + BM25 하이브리드 RAG 인덱스 빌드 완료
- 오답 분석 엔진 규칙 기반 버전 완성 (03_query_test.py 검증)

막힌 것:
- 미분류 문항 27개 잔존 (이미지 기반 문항 구조적 한계)
- 검색 1위 품질 아직 개선 필요

내일 할 것:
- FastAPI 서버 초안 (Phase 2: attempts API)
- DB 스키마 마이그레이션 (PRD Section 8 기준)
- Docker Compose 환경 구성

⚠️ 프론트에 영향 있는 변경:
- 없음 (아직 API 미구현)

---

## 구현 우선순위 (백엔드 기준)

```
Phase 1 ✅  seed.json + FAISS 인덱스 완성
Phase 2 ✅  attempts API 완성 (Codex 검증 완료)
Phase 3 ✅  error_notes API 완성 (Codex 검증 완료)
Phase 4 ✅  review_queue + today API 완성 (Codex 검증 완료)
Phase 5 ✅  Gemma 4.0 연동 + 전체 통합 테스트 완료
```

---

### 2026-04-10 (Phase 2–4 완료)

**Backend (권태준)**

오늘 한 것:
- Phase 2: FastAPI + SQLAlchemy + attempts API 완성, Docker Compose 구성
- Phase 3: GET /error-notes, GET /error-notes/{id} API 완성 (user_id 범위 강제)
- Phase 4: GET /review-queue, POST /review-queue/{id}/complete, GET /today 실데이터 연동 완성
- weakness_profile 업서트 + 복습 간격(1/3/7일) 로직 완성

막힌 것:
- 없음

내일 할 것:
- Phase 5: Gemma 4.0 LLM 연동 (rule-based ErrorAnalyzer 대체)

⚠️ 프론트에 영향 있는 변경:
- 없음 (Contract 그대로 유지)

---

### 2026-04-10 (Phase 5 완료)

**Backend (권태준)**

오늘 한 것:
- llm_analyzer.py 생성 (Gemma 4.0 gemma4:e4b Ollama 연동)
- error_analyzer.py LLM → rule-based → pure fallback 3단계 구조
- Phase 1~5 전체 통합 테스트 완료 (Contract 불일치 없음)

막힌 것:
- 없음

내일 할 것:
- 팀원 프론트 연동
- FRONTEND_BACKEND_CONTRACT.md 기준 API 최종 확인

⚠️ 프론트에 영향 있는 변경:
- 없음 (Contract 그대로 유지, LLM은 백엔드 내부 변경)

---

## 프론트 Mock 우선 개발 순서 (팀원용 참고)

```
1. /today           ← CONTRACT.md GET /today 응답 기준
2. /solve/[setId]   ← CONTRACT.md GET /questions/{id} 기준
3. /result          ← CONTRACT.md POST /attempts 응답 기준
4. /notes           ← CONTRACT.md GET /error-notes 기준
5. /review          ← CONTRACT.md GET /review-queue 기준
```
