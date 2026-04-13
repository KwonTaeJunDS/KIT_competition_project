# ONTOLOGY_SCHEMA.md

> **확정일:** 2026-04-10
> **목적:** 한국사능력검정시험 심화 GraphRAG 온톨로지 스키마 정의
> **Rule:** 이 문서에 없는 노드/엣지 타입은 코드에 추가 금지
>          변경 시 이 문서 먼저 수정 후 구현

---

## 저장 방식

```
그래프 저장:  NetworkX + JSON
시각화:       pyvis (인터랙티브 HTML)
FAISS 연동:   노드별 embedding_text → 벡터 인덱스
```

---

## 노드 타입 (8개 고정)

| 타입 | 설명 | 예시 |
|------|------|------|
| Era | 시대 구분 | 조선후기, 근대, 일제강점기 |
| Person | 인물 | 흥선대원군, 김옥균, 을지문덕 |
| Event | 사건 | 갑신정변, 임진왜란, 3·1운동 |
| Concept | 정책/제도/사상 | 서원철폐, 대동법, 성리학 |
| Group | 세력/단체 | 신간회, 의열단, 동학농민군 |
| Artifact | 유물/문화재/건축물 | 팔만대장경, 훈민정음, 경복궁 |
| Place | 장소/지역 | 강화도, 한성, 정족산성 |
| Document | 문헌/서적 | 삼국유사, 북학의, 경국대전 |

### 노드 공통 속성

```json
{
  "id":             "uuid",
  "name":           "흥선대원군",
  "type":           "Person",
  "era_tags":       ["조선후기"],
  "description":    "조선 후기 왕족, 고종의 아버지",
  "embedding_text": "조선후기 Person 흥선대원군 왕권강화 서원철폐",
  "confidence":     0.92,
  "source":         "제77회_한국사능력검정시험_심화",
  "is_ambiguous":   false
}
```

---

## 엣지 타입 (9개 고정)

| 엣지 | 방향 | 설명 | 예시 |
|------|------|------|------|
| is_in_era | 노드 → Era | 시대 소속 | 흥선대원군 → 조선후기 |
| related_to | 노드 → 노드 | 인과/연결 통합 | 갑신정변 → 임오군란 |
| implemented_by | Concept → Person/Group | 정책 주체 | 서원철폐 → 흥선대원군 |
| participated_in | Person → Event | 인물 참여 | 김옥균 → 갑신정변 |
| led_by | Event/Group → Person | 주도 인물 | 갑신정변 → 김옥균 |
| written_by | Document → Person | 저술 관계 | 삼국유사 → 일연 |
| member_of | Person → Group | 소속 관계 | 나석주 → 의열단 |
| located_in | Event/Artifact → Place | 장소 연결 | 병인양요 → 강화도 |
| confused_with | 모든 노드 → 모든 노드 | 혼동 쌍 (오답분석용) | 서원철폐 → 대동법 |

### 엣지 공통 속성

```json
{
  "relation":     "implemented_by",
  "source_id":    "uuid_서원철폐",
  "target_id":    "uuid_흥선대원군",
  "confidence":   0.88,
  "source":       "제77회_한국사능력검정시험_심화"
}
```

---

## confidence 산출 방식 (패턴 매칭 강도 기반)

### 패턴별 확신도 기준값

```python
PATTERN_CONFIDENCE = {
    # Person 패턴
    r"(\S+)이/가 추진한":          ("Person", 0.90),
    r"(\S+)이/가 주도한":          ("Person", 0.90),
    r"(\S+)이/가 건의한":          ("Person", 0.88),
    r"(\S+)이/가 저술한":          ("Person", 0.88),
    r"(\S+)이/가 파견한":          ("Person", 0.85),
    r"(\S+)이/가 즉위한":          ("Person", 0.92),

    # Event 패턴
    r"(\S+)이/가 발생한":          ("Event",  0.88),
    r"(\S+)이/가 일어난":          ("Event",  0.88),
    r"(\S+) 전투":                 ("Event",  0.85),
    r"(\S+) 난":                   ("Event",  0.82),
    r"(\S+) 운동":                 ("Event",  0.80),

    # Concept 패턴
    r"(\S+)을/를 실시한":          ("Concept", 0.85),
    r"(\S+)을/를 설치한":          ("Concept", 0.85),
    r"(\S+)을/를 폐지한":          ("Concept", 0.85),
    r"(\S+) 제도":                 ("Concept", 0.82),
    r"(\S+) 정책":                 ("Concept", 0.82),

    # Group 패턴
    r"(\S+) 단체":                 ("Group",  0.85),
    r"(\S+) 결성":                 ("Group",  0.83),
    r"(\S+) 세력":                 ("Group",  0.80),

    # Document 패턴
    r"(\S+)을/를 편찬한":          ("Document", 0.90),
    r"(\S+)을/를 저술한":          ("Document", 0.90),
    r"『(\S+)』":                  ("Document", 0.88),

    # Place 패턴
    r"(\S+)에서 발생한":           ("Place",  0.85),
    r"(\S+)을/를 점령한":          ("Place",  0.83),
    r"(\S+) 전투":                 ("Place",  0.80),
}
```

### 애매한 노드 판단 기준 (3가지 중 1개라도 해당 시)

```
1. confidence < 0.7
2. 노드 타입 후보가 2개 이상
3. 키워드 매칭 0개
```

→ `is_ambiguous: true` 로 표시 후 `output/ambiguous_nodes.json` 에 별도 저장

---

## 파이프라인 흐름

```
PDF 입력
    ↓
pdfplumber 텍스트 추출
    ↓
규칙 기반 노드/엣지 추출
    ↓
confidence 점수 산출
    ↓
┌─────────────────────────────────┐
│  confidence >= 0.7              │  → 온톨로지 자동 저장
│  confidence < 0.7 (애매한 노드) │  → ambiguous_nodes.json 출력
└─────────────────────────────────┘
    ↓
[사람이 직접 확인 or GPT API 보완]
    ↓
확정된 노드 온톨로지에 반영
    ↓
노드별 embedding_text 생성
    ↓
FAISS 인덱스 갱신
    ↓
pyvis 시각화 HTML 생성
```

---

## 출력 파일 구조

```
output/
  ontology/
    graph.json              ← NetworkX 그래프 (전체)
    nodes.json              ← 노드 목록
    edges.json              ← 엣지 목록
    ambiguous_nodes.json    ← 사람이 확인해야 할 노드
    ontology.html           ← pyvis 시각화
  rag/
    faiss.index             ← 기존 유지
    metadata.json           ← 노드 메타 포함으로 확장
    bm25.pkl                ← 기존 유지
```

---

## 시각화 색상 규칙

```python
NODE_COLORS = {
    "Era":      "#1A3C6E",   # 진한 파랑
    "Person":   "#E8A020",   # 주황
    "Event":    "#CC3333",   # 빨강
    "Concept":  "#217346",   # 초록
    "Group":    "#8B4513",   # 갈색
    "Artifact": "#9B59B6",   # 보라
    "Place":    "#17A589",   # 청록
    "Document": "#85929E",   # 회색
}
```

---

## 변경 금지 규칙

- 노드 타입 8개, 엣지 타입 9개 고정
- 새 타입 추가 시 이 문서 먼저 수정 후 팀 공유
- confidence 기준값 변경 시 전체 재파싱 필요 → 신중하게
- confused_with 엣지는 오답 분석 엔진 핵심 → 임의 삭제 금지
