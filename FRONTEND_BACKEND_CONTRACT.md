# FRONTEND_BACKEND_CONTRACT.md

> Last updated: 2026-04-13
> Base frontend env: `NEXT_PUBLIC_API_BASE_URL`
> Local backend base: `http://localhost:8000/api/v1`

## Envelope

```json
{
  "success": true,
  "data": {}
}
```

```json
{
  "success": false,
  "error": {
    "code": "SOME_ERROR",
    "message": "설명 메시지"
  }
}
```

## 학생 플로우 계약

### GET `/today?user_id={user_id}`

```json
{
  "today_review_count": 3,
  "today_new_count": 12,
  "weak_topics": ["개항기", "고려 외교"]
}
```

### GET `/questions`

지원 쿼리:
- `topic`
- `era`
- `limit`
- `user_id`
- `exclude_attempted`
- `exclude_question_ids`
- `shuffle`

```json
{
  "total_count": 20,
  "questions": [
    {
      "id": "question-id",
      "round": 77,
      "q_num": 25,
      "stem": "문항 본문",
      "era_tags": ["근현대"],
      "concept_tags": ["토지 조사 사업"],
      "score": 2,
      "difficulty": null
    }
  ]
}
```

### GET `/questions/{id}`

정답은 이 응답에 포함하지 않습니다.

### POST `/attempts`

```json
{
  "user_id": "demo-user-001",
  "question_id": "question-id",
  "student_answer": "①"
}
```

오답일 때:
- `note_saved=true`
- `note_id` 포함
- 복습 큐 생성 대상이 됨

### GET `/error-notes?user_id={user_id}`

```json
{
  "total_count": 5,
  "notes": []
}
```

### GET `/review-queue?user_id={user_id}&include_all=true`

```json
{
  "due_count": 2,
  "items": []
}
```

### POST `/review-queue/{queue_id}/complete`

```json
{
  "user_id": "demo-user-001",
  "is_correct": true
}
```

## 관리자 화면 계약

### GET `/admin/dashboard-data`

교사용 대시보드와 학생 개입면이 읽는 read-model입니다.

```json
{
  "summaryCards": [],
  "students": [],
  "ontologyTasks": [],
  "deliveryGaps": [],
  "hotspotClusters": [],
  "sourceQueue": [],
  "studentLeakDetails": []
}
```

의미:
- `/admin`, `/admin/students`는 이 응답을 기반으로 동작합니다.
- `NEXT_PUBLIC_USE_MOCK=0`일 때 API 실패를 mock으로 덮지 않습니다.
- 빈 응답은 빈 상태로 그대로 노출합니다.

### GET `/admin/ontology-drafts/{task_id}`

```json
{
  "taskId": "economic-exploitation",
  "title": "경제 침탈 구조 정리",
  "era": "일제강점기",
  "nodesPreview": [],
  "edgesPreview": [],
  "updatedAt": "2026-04-13T12:00:00+00:00",
  "storage": "api"
}
```

### POST `/admin/ontology-drafts/{task_id}`

요청 body:
- `title`
- `era`
- `nodesPreview`
- `edgesPreview`

응답은 저장된 draft를 그대로 반환합니다.

## 관리자 화면 해석 원칙

- `/admin`, `/admin/students`: 실백엔드 read-model
- `/admin/ontology`: workbench
  - 실데이터 기반 편집 후보 표시
  - draft 저장은 서버 우선
  - 서버 실패 시 localStorage fallback 허용
  - 즉시 전역 그래프 재계산은 아님

## 폐기된 기준

아래 이름은 더 이상 표준이 아닙니다.
- `NEXT_PUBLIC_API_BASE`
- 다른 로컬 기본 포트 관례
