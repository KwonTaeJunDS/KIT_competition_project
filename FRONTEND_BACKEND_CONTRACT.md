# FRONTEND_BACKEND_CONTRACT.md

> **Last updated:** 2026-04-10
> **Backend owner:** 권태준
> **Frontend owner:** 팀원
> **Rule:** response 필드 삭제 금지 / 바꾸기 전 먼저 공유 / endpoint 변경 시 이 문서 업데이트

---

## Base URL

```
개발: http://localhost:8000/api/v1
배포: TBD
```

---

## 공통 응답 구조

```json
// 성공
{
  "success": true,
  "data": { ... }
}

// 실패
{
  "success": false,
  "error": {
    "code": "QUESTION_NOT_FOUND",
    "message": "해당 문항을 찾을 수 없습니다."
  }
}
```

---

## 1. 오늘의 학습 홈

### `GET /today`

오늘 복습할 문항 수, 취약 개념 Top 3, 신규 문항 수를 반환한다.

**Response**
```json
{
  "today_review_count": 12,
  "today_new_count": 20,
  "weak_topics": [
    "조선 후기 개혁",
    "개항기 정책",
    "독립운동 단체"
  ]
}
```

| 필드 | 타입 | 설명 |
|------|------|------|
| today_review_count | int | 오늘 due인 복습 문항 수 |
| today_new_count | int | 아직 안 푼 신규 문항 수 |
| weak_topics | string[] | 취약 개념 Top 3 (weakness_score 기준) |

---

## 2. 문제 세트 목록

### `GET /questions?topic={topic}&era={era}&limit={limit}`

**Query Parameters**

| 파라미터 | 필수 | 설명 | 예시 |
|----------|------|------|------|
| topic | 선택 | 개념 태그 필터 | 조선후기 |
| era | 선택 | 시대 태그 필터 | 근대 |
| limit | 선택 | 반환 수 (기본 20) | 20 |

**Response**
```json
{
  "total_count": 48,
  "questions": [
    {
      "id": "uuid",
      "round": 77,
      "q_num": 25,
      "stem": "다음 중 흥선대원군의 정책으로 옳은 것은?",
      "era_tags": ["조선후기"],
      "concept_tags": ["왕권강화", "제도"],
      "score": 2,
      "difficulty": null
    }
  ]
}
```

---

## 3. 문항 상세 조회

### `GET /questions/{id}`

**Response**
```json
{
  "id": "uuid",
  "round": 77,
  "q_num": 25,
  "stem": "다음 중 흥선대원군의 정책으로 옳은 것은?",
  "choices": [
    {"key": "①", "text": "균역법 실시"},
    {"key": "②", "text": "대동법 시행"},
    {"key": "③", "text": "서원 철폐"},
    {"key": "④", "text": "영정법 실시"},
    {"key": "⑤", "text": "호패법 시행"}
  ],
  "score": 2,
  "era_tags": ["조선후기"],
  "concept_tags": ["왕권강화", "제도"],
  "source": "제77회_한국사능력검정시험_심화"
}
```

> ⚠️ 정답(answer)은 이 API에서 **절대 반환하지 않는다.** 답안 제출 후에만 노출.

---

## 4. 답안 제출 (핵심)

### `POST /attempts`

**Request**
```json
{
  "user_id": "uuid",
  "question_id": "uuid",
  "student_answer": "②"
}
```

**Response — 정답인 경우**
```json
{
  "is_correct": true,
  "correct_answer": "③",
  "answer_text": "서원 철폐",
  "explanation_summary": "흥선대원군은 서원을 철폐하여 왕권을 강화하였다.",
  "error_type": null,
  "wrong_units": [],
  "why_wrong": null,
  "correct_fact": "흥선대원군의 핵심 개혁 중 하나는 서원 철폐다.",
  "memory_hint": "서원 철폐 = 왕권 강화",
  "note_saved": false
}
```

**Response — 오답인 경우**
```json
{
  "is_correct": false,
  "correct_answer": "③",
  "answer_text": "서원 철폐",
  "explanation_summary": "흥선대원군은 서원을 철폐하여 왕권을 강화하였다.",
  "error_type": "정책/제도 혼동",
  "wrong_units": ["개혁 조치 식별", "왕권 강화 목적 이해"],
  "why_wrong": "대표 정책을 다른 시기의 제도와 혼동했다.",
  "correct_fact": "흥선대원군의 핵심 개혁 중 하나는 서원 철폐다.",
  "memory_hint": "서원 철폐 = 왕권 강화",
  "note_saved": true,
  "note_id": "uuid"
}
```

| 필드 | 타입 | 설명 |
|------|------|------|
| is_correct | bool | 정답 여부 |
| correct_answer | string | 정답 번호 (①~⑤) |
| answer_text | string | 정답 보기 텍스트 |
| explanation_summary | string | 해설 요약 1~2문장 |
| error_type | string\|null | 오답 유형 (오답 시만) |
| wrong_units | string[] | 취약 개념 단위 |
| why_wrong | string\|null | 왜 틀렸는지 설명 |
| correct_fact | string | 핵심 정답 사실 |
| memory_hint | string | 암기 힌트 |
| note_saved | bool | 오답노트 자동 저장 여부 |
| note_id | string\|null | 저장된 오답노트 ID |

---

## 5. 오답노트 목록

### `GET /error-notes?user_id={user_id}&era={era}&error_type={error_type}`

**Query Parameters**

| 파라미터 | 필수 | 설명 |
|----------|------|------|
| user_id | 필수 | 사용자 ID |
| era | 선택 | 시대 필터 |
| error_type | 선택 | 오답 유형 필터 |

**Response**
```json
{
  "total_count": 23,
  "notes": [
    {
      "id": "uuid",
      "question_id": "uuid",
      "question_stem": "다음 중 흥선대원군의 정책으로 옳은 것은?",
      "my_answer": "②",
      "correct_answer": "③",
      "error_type": "정책/제도 혼동",
      "why_wrong": "대표 정책을 다른 시기의 제도와 혼동했다.",
      "correct_fact": "흥선대원군의 핵심 개혁 중 하나는 서원 철폐다.",
      "memory_hint": "서원 철폐 = 왕권 강화",
      "review_front": "흥선대원군의 대표 개혁 정책은?",
      "review_back": "서원 철폐",
      "era_tags": ["조선후기"],
      "created_at": "2026-04-10T09:00:00Z"
    }
  ]
}
```

---

## 6. 복습 큐 목록

### `GET /review-queue?user_id={user_id}`

오늘 due인 복습 문항 목록을 반환한다.

**Response**
```json
{
  "due_count": 12,
  "items": [
    {
      "queue_id": "uuid",
      "note_id": "uuid",
      "question_id": "uuid",
      "question_stem": "다음 중 흥선대원군의 정책으로 옳은 것은?",
      "error_type": "정책/제도 혼동",
      "memory_hint": "서원 철폐 = 왕권 강화",
      "review_count": 2,
      "due_at": "2026-04-10T00:00:00Z"
    }
  ]
}
```

---

## 7. 복습 완료 처리

### `POST /review-queue/{queue_id}/complete`

**Request**
```json
{
  "user_id": "uuid",
  "is_correct": true
}
```

**Response**
```json
{
  "queue_id": "uuid",
  "next_due_at": "2026-04-17T00:00:00Z",
  "review_count": 3,
  "status": "pending"
}
```

**복습 간격 규칙**

| 틀린 횟수 | 다음 복습 |
|-----------|-----------|
| 1회 | 1일 후 |
| 2회 | 3일 후 |
| 3회+ | 7일 후 |
| 맞춤 | 우선순위 하향 |

---

## 8. 취약 개념 프로필

### `GET /weakness-profile?user_id={user_id}`

**Response**
```json
{
  "updated_at": "2026-04-10T09:00:00Z",
  "profiles": [
    {
      "concept_key": "조선후기_서원철폐",
      "weakness_score": 0.82,
      "wrong_count": 5,
      "correct_count": 1
    },
    {
      "concept_key": "근대_갑오개혁",
      "weakness_score": 0.65,
      "wrong_count": 3,
      "correct_count": 2
    }
  ]
}
```

---

## 오답 유형 Taxonomy (고정값)

프론트에서 필터/뱃지 표시용으로 사용.

```
시대 혼동
인물-사건 매칭 오류
정책/제도 혼동
원인-결과 인과 오인
비슷한 개념 혼동
핵심 포인트 미파악
지엽 정보 과몰입
```

---

## 변경 금지 규칙

- `answer` 필드는 `/questions/{id}` 응답에 절대 포함하지 않는다
- response 필드 삭제 금지 → deprecated 처리 후 다음 sprint에 제거
- endpoint 변경 시 이 문서 먼저 업데이트 후 구현
- 필드명 변경 전 프론트에 먼저 공유
