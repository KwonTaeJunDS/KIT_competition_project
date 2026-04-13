"""
05_graphrag_search.py
─────────────────────
GraphRAG 하이브리드 검색
FAISS(문제 검색) + 온톨로지 그래프(개념 관계) + Gemma(오답 분석) 통합

실행:
    python 05_graphrag_search.py

참고:
    ONTOLOGY_SCHEMA.md
    FRONTEND_BACKEND_CONTRACT.md
"""

import re
import json
import pickle
from pathlib import Path

import faiss
import numpy as np
import networkx as nx
from sentence_transformers import SentenceTransformer
from ollama import chat as ollama_chat

# ─── 경로 설정 ────────────────────────────────────────────────
RAG_DIR      = Path("output/rag")
ONTOLOGY_DIR = Path("output/ontology")

FAISS_PATH    = RAG_DIR / "faiss.index"
METADATA_PATH = RAG_DIR / "metadata.json"
BM25_PATH     = RAG_DIR / "bm25.pkl"
GRAPH_PATH    = ONTOLOGY_DIR / "graph.json"

MODEL_NAME  = "jhgan/ko-sroberta-multitask"
GEMMA_MODEL = "gemma3:4b"


# ─────────────────────────────────────────────────────────────
# Gemma 오답 분석
# ─────────────────────────────────────────────────────────────

ANALYZE_PROMPT = """
당신은 한국사 교육 전문가입니다.
학생의 오답을 분석해주세요.

[문항]
{stem}

[정답]
{correct_answer} - {correct_text}

[학생 오답]
{student_answer} - {student_text}

[온톨로지 컨텍스트]
- 정답 개념 시대: {era}
- 관련 개념: {related}
- 혼동하기 쉬운 개념: {confused}

[유사 문항 패턴]
{similar_questions}

위 정보를 참고해서 아래 JSON만 출력하세요. 설명 없이 JSON만.

{{
  "error_type": "시대 혼동 / 인물-사건 매칭 오류 / 정책·제도 혼동 / 원인-결과 인과 오인 / 비슷한 개념 혼동 / 핵심 포인트 미파악 중 하나",
  "wrong_units": ["취약한 개념 단위 1", "취약한 개념 단위 2"],
  "why_wrong": "왜 틀렸는지 1~2문장으로 설명",
  "correct_fact": "정답의 핵심 사실 1문장",
  "memory_hint": "암기 힌트 (짧게, 예: 서원 철폐 = 왕권 강화)"
}}
"""


def analyze_with_gemma(context: dict) -> dict | None:
    """RAG + 그래프 컨텍스트를 Gemma에 전달해서 오답 분석"""
    prompt = ANALYZE_PROMPT.format(
        stem              = context["stem"][:200],
        correct_answer    = context["correct_answer"],
        correct_text      = context["correct_text"],
        student_answer    = context["student_answer"],
        student_text      = context["student_text"],
        era               = ", ".join(context["era"]) or "미상",
        related           = ", ".join(context["related"][:5]) or "없음",
        confused          = ", ".join(context["confused"][:5]) or "없음",
        similar_questions = "\n".join(
            f"- {q['stem'][:50]}... (정답: {q['answer']})"
            for q in context["similar"][:3]
        ) or "없음",
    )

    try:
        response = ollama_chat(
            model=GEMMA_MODEL,
            messages=[{"role": "user", "content": prompt}],
            options={"temperature": 0.1},
        )
        raw = response.message.content.strip()

        # JSON 파싱 — 마크다운 코드블록 제거
        raw = re.sub(r"```json\s*", "", raw)
        raw = re.sub(r"```\s*", "", raw)
        start = raw.find("{")
        end   = raw.rfind("}") + 1
        if start != -1 and end > 0:
            return json.loads(raw[start:end])
    except Exception as e:
        print(f"  [Gemma 오류] {e}")
    return None


# ─────────────────────────────────────────────────────────────
# RAG DB 1 — FAISS 검색 (문제-정답)
# ─────────────────────────────────────────────────────────────

class QuestionSearcher:
    """
    seed.json + FAISS + BM25
    역할: 쿼리와 유사한 문항 검색
    """
    def __init__(self):
        print("[RAG DB 1] FAISS + BM25 로드 중...")
        self.index    = faiss.read_index(str(FAISS_PATH))
        self.metadata = json.load(open(METADATA_PATH, encoding="utf-8"))
        self.bm25     = pickle.load(open(BM25_PATH, "rb"))
        self.model    = SentenceTransformer(MODEL_NAME)
        self.records  = list(self.metadata.values())
        print(f"  → {self.index.ntotal}개 문항 로드 완료")

    def dense_search(self, query: str, top_k: int = 10) -> list[tuple[int, float]]:
        vec = self.model.encode(
            [query], normalize_embeddings=True
        ).astype("float32")
        scores, indices = self.index.search(vec, top_k)
        return list(zip(indices[0].tolist(), scores[0].tolist()))

    def bm25_search(self, query: str, top_k: int = 10) -> list[tuple[int, float]]:
        tokens = query.split()
        scores = self.bm25.get_scores(tokens)
        top_indices = np.argsort(scores)[::-1][:top_k]
        return [(int(i), float(scores[i])) for i in top_indices]

    def hybrid_search(
        self, query: str, top_k: int = 5, k: int = 60
    ) -> list[dict]:
        """BM25 + Dense RRF 하이브리드"""
        dense  = self.dense_search(query, top_k=top_k * 2)
        sparse = self.bm25_search(query, top_k=top_k * 2)

        rrf: dict[int, float] = {}
        for rank, (idx, _) in enumerate(dense):
            rrf[idx] = rrf.get(idx, 0) + 1.0 / (k + rank + 1)
        for rank, (idx, _) in enumerate(sparse):
            rrf[idx] = rrf.get(idx, 0) + 1.0 / (k + rank + 1)

        sorted_ids = sorted(rrf, key=lambda x: rrf[x], reverse=True)[:top_k]
        return [
            self.metadata[str(i)]
            for i in sorted_ids
            if str(i) in self.metadata
        ]

    def get_by_round_qnum(self, round_no: int, q_num: int) -> dict | None:
        for r in self.records:
            if r["round"] == round_no and r["q_num"] == q_num:
                return r
        return None


# ─────────────────────────────────────────────────────────────
# RAG DB 2 — 온톨로지 그래프 (개념 관계)
# ─────────────────────────────────────────────────────────────

class OntologySearcher:
    """
    NetworkX 온톨로지 그래프
    역할: 개념 간 관계 탐색 (오답 분석 보조)
    """
    def __init__(self):
        print("[RAG DB 2] 온톨로지 그래프 로드 중...")
        graph_data = json.load(open(GRAPH_PATH, encoding="utf-8"))
        self.G = nx.node_link_graph(graph_data)
        print(f"  → 노드 {self.G.number_of_nodes()}개 / "
              f"엣지 {self.G.number_of_edges()}개 로드 완료")

    def find_node(self, name: str) -> dict | None:
        for node_id, data in self.G.nodes(data=True):
            if data.get("name") == name:
                return {"id": node_id, **data}
        return None

    def get_relations(self, name: str) -> dict:
        """특정 개념의 모든 관계 반환"""
        node = self.find_node(name)
        if not node:
            return {"found": False, "name": name}

        node_id = node["id"]
        result  = {
            "found":           True,
            "name":            name,
            "type":            node.get("type"),
            "era":             [],
            "confused_with":   [],
            "related_to":      [],
            "implemented_by":  [],
            "participated_in": [],
            "led_by":          [],
            "written_by":      [],
            "member_of":       [],
            "located_in":      [],
        }

        for _, tgt_id, edge_data in self.G.out_edges(node_id, data=True):
            relation = edge_data.get("relation", "")
            tgt_data = self.G.nodes.get(tgt_id, {})
            tgt_name = tgt_data.get("name", "")
            tgt_type = tgt_data.get("type", "")

            if relation == "is_in_era":
                result["era"].append(tgt_name)
            elif relation == "confused_with":
                result["confused_with"].append(
                    {"name": tgt_name, "type": tgt_type}
                )
            elif relation == "related_to":
                result["related_to"].append(
                    {"name": tgt_name, "type": tgt_type}
                )
            elif relation == "implemented_by":
                result["implemented_by"].append(
                    {"name": tgt_name, "type": tgt_type}
                )
            elif relation == "led_by":
                result["led_by"].append(
                    {"name": tgt_name, "type": tgt_type}
                )
            elif relation == "written_by":
                result["written_by"].append(
                    {"name": tgt_name, "type": tgt_type}
                )
            elif relation == "member_of":
                result["member_of"].append(
                    {"name": tgt_name, "type": tgt_type}
                )
            elif relation == "located_in":
                result["located_in"].append(
                    {"name": tgt_name, "type": tgt_type}
                )

        # 들어오는 confused_with 역방향
        for src_id, _, edge_data in self.G.in_edges(node_id, data=True):
            if edge_data.get("relation") == "confused_with":
                src_data = self.G.nodes.get(src_id, {})
                src_name = src_data.get("name", "")
                src_type = src_data.get("type", "")
                entry    = {"name": src_name, "type": src_type}
                if entry not in result["confused_with"]:
                    result["confused_with"].append(entry)

        return result

    def get_confused_pairs(self, name: str) -> list[str]:
        relations = self.get_relations(name)
        return [c["name"] for c in relations.get("confused_with", [])]

    def get_era_concepts(self, era_name: str) -> list[dict]:
        era_node = self.find_node(era_name)
        if not era_node:
            return []
        era_id   = era_node["id"]
        concepts = []
        for src_id, _, edge_data in self.G.in_edges(era_id, data=True):
            if edge_data.get("relation") == "is_in_era":
                src_data = self.G.nodes.get(src_id, {})
                concepts.append({
                    "name": src_data.get("name"),
                    "type": src_data.get("type"),
                })
        return concepts


# ─────────────────────────────────────────────────────────────
# GraphRAG — 두 DB + Gemma 통합
# ─────────────────────────────────────────────────────────────

class GraphRAG:
    """
    RAG DB 1 (FAISS) + RAG DB 2 (온톨로지) + Gemma 통합
    """
    def __init__(self):
        self.question_searcher = QuestionSearcher()
        self.ontology_searcher = OntologySearcher()

    def search_questions(self, query: str, top_k: int = 5) -> list[dict]:
        return self.question_searcher.hybrid_search(query, top_k=top_k)

    def analyze_wrong_answer(
        self,
        question: dict,
        student_answer_ch: str,
    ) -> dict:
        """
        오답 분석 — RAG DB 1 + RAG DB 2 + Gemma 협력
        """
        correct_ch   = question.get("answer", "")
        correct_text = question.get("answer_text", "")
        choices      = question.get("choices", {})
        student_text = choices.get(student_answer_ch, "")
        is_correct   = student_answer_ch == correct_ch

        if is_correct:
            return {
                "is_correct":     True,
                "correct_answer": correct_ch,
                "answer_text":    correct_text,
                "error_type":     None,
                "wrong_units":    [],
                "why_wrong":      None,
                "correct_fact":   correct_text,
                "memory_hint":    self._make_memory_hint(
                    question.get("era_tags", []), correct_text
                ),
                "confused_with":  [],
                "graph_context":  {},
            }

        # RAG DB 2 — 그래프 컨텍스트
        graph_context = self.ontology_searcher.get_relations(correct_text)
        confused      = self.ontology_searcher.get_confused_pairs(correct_text)

        # RAG DB 1 — 유사 문항
        similar = self.find_similar_questions(question, top_k=3)

        # Gemma 컨텍스트 구성
        gemma_context = {
            "stem":           question.get("stem", ""),
            "correct_answer": correct_ch,
            "correct_text":   correct_text,
            "student_answer": student_answer_ch,
            "student_text":   student_text,
            "era":            graph_context.get("era", []),
            "related":        [c["name"] for c in
                               graph_context.get("related_to", [])],
            "confused":       confused,
            "similar":        similar,
        }

        # Gemma 호출
        print(f"  [Gemma 분석 중...] {correct_text[:20]}")
        gemma_result = analyze_with_gemma(gemma_context)

        if gemma_result:
            error_type   = gemma_result.get("error_type", "핵심 포인트 미파악")
            wrong_units  = gemma_result.get("wrong_units", [])
            why_wrong    = gemma_result.get("why_wrong", "")
            correct_fact = gemma_result.get("correct_fact", correct_text)
            memory_hint  = gemma_result.get("memory_hint", "")
            print(f"  [Gemma 완료]")
        else:
            print(f"  [Gemma 실패 → 규칙 기반 fallback]")
            error_type   = self._classify_error(
                question, student_answer_ch, correct_ch, graph_context
            )
            wrong_units  = self._extract_wrong_units(graph_context)
            why_wrong    = self._generate_why_wrong(
                student_text, correct_text, error_type
            )
            correct_fact = self._generate_correct_fact(
                question.get("stem", ""), correct_text
            )
            memory_hint  = self._make_memory_hint(
                question.get("era_tags", []), correct_text
            )

        return {
            "is_correct":     False,
            "correct_answer": correct_ch,
            "answer_text":    correct_text,
            "student_answer": student_answer_ch,
            "student_text":   student_text,
            "error_type":     error_type,
            "wrong_units":    wrong_units,
            "why_wrong":      why_wrong,
            "correct_fact":   correct_fact,
            "memory_hint":    memory_hint,
            "confused_with":  confused,
            "graph_context":  graph_context,
        }

    def find_similar_questions(
        self, question: dict, top_k: int = 3
    ) -> list[dict]:
        query   = question.get("stem", "")
        results = self.search_questions(query, top_k=top_k + 1)
        return [r for r in results if r["id"] != question["id"]][:top_k]

    def get_era_summary(self, era_name: str) -> dict:
        concepts    = self.ontology_searcher.get_era_concepts(era_name)
        type_counts: dict = {}
        for c in concepts:
            t = c.get("type", "Unknown")
            type_counts[t] = type_counts.get(t, 0) + 1
        return {
            "era":         era_name,
            "total":       len(concepts),
            "concepts":    concepts,
            "type_counts": type_counts,
        }

    # ── 규칙 기반 fallback ────────────────────────────────────

    def _classify_error(
        self, question: dict, student_ch: str,
        correct_ch: str, graph_context: dict
    ) -> str:
        stem = question.get("stem", "")
        era  = question.get("era_tags", [])

        if graph_context.get("found"):
            era_in_graph = graph_context.get("era", [])
            if era and era_in_graph and era[0] not in era_in_graph:
                return "시대 혼동"

        if any(k in stem for k in ["시기", "연표", "순서", "이전", "이후"]):
            return "시대 혼동"
        if any(k in stem for k in ["인물", "왕", "장군", "누구"]):
            return "인물-사건 매칭 오류"
        if any(k in stem for k in ["정책", "제도", "법령", "기구"]):
            return "정책·제도 혼동"
        if any(k in stem for k in ["원인", "배경", "결과", "영향"]):
            return "원인-결과 인과 오인"
        if any(k in stem for k in ["문화유산", "유물", "유적"]):
            return "비슷한 개념 혼동"
        return "핵심 포인트 미파악"

    def _extract_wrong_units(self, graph_context: dict) -> list[str]:
        units = []
        if graph_context.get("implemented_by"):
            units.append("정책 주체 파악")
        if graph_context.get("era"):
            units.append(
                f"시대 구분 ({', '.join(graph_context['era'][:2])})"
            )
        if graph_context.get("related_to"):
            units.append("관련 사건 연결")
        return units[:2]

    def _generate_why_wrong(
        self, student_text: str, correct_text: str, error_type: str
    ) -> str:
        templates = {
            "시대 혼동":           f"'{student_text[:20]}...'는 다른 시대의 내용입니다.",
            "인물-사건 매칭 오류": f"'{student_text[:20]}...'는 다른 인물 또는 사건입니다.",
            "정책·제도 혼동":      f"'{student_text[:20]}...'는 다른 시기의 정책입니다.",
            "원인-결과 인과 오인": "원인과 결과의 순서가 반대이거나 혼동한 것입니다.",
            "비슷한 개념 혼동":    "유사한 개념이 포함되어 혼동하기 쉬운 문항입니다.",
            "핵심 포인트 미파악":  "문항의 핵심 키워드를 파악하지 못했습니다.",
        }
        return templates.get(error_type, "오답이 발생했습니다.")

    def _generate_correct_fact(self, stem: str, correct_text: str) -> str:
        return f"이 문항의 핵심 정답은 '{correct_text[:40]}'입니다."

    def _make_memory_hint(
        self, era_tags: list, correct_text: str
    ) -> str:
        era   = era_tags[0] if era_tags else ""
        words = correct_text.split()[:4]
        return f"[{era}] {' '.join(words)}"


# ─────────────────────────────────────────────────────────────
# 테스트
# ─────────────────────────────────────────────────────────────

def run_tests(rag: GraphRAG):

    print("\n" + "="*50)
    print("테스트 1: 문항 검색 (RAG DB 1)")
    print("="*50)
    query   = "흥선대원군 서원 철폐 왕권 강화"
    results = rag.search_questions(query, top_k=3)
    print(f"검색어: {query}")
    for i, r in enumerate(results, 1):
        print(f"  {i}. [{r['round']}회 {r['q_num']}번] "
              f"{r['stem'][:50]}...")
        print(f"     정답: {r['answer']} | 시대: {r['era_tags']}")

    print("\n" + "="*50)
    print("테스트 2: 온톨로지 관계 탐색 (RAG DB 2)")
    print("="*50)
    for name in ["흥선대원군", "갑신정변", "삼국사기", "강화도"]:
        relations = rag.ontology_searcher.get_relations(name)
        if relations["found"]:
            print(f"\n[{name}] ({relations['type']})")
            if relations["era"]:
                print(f"  시대:      {relations['era']}")
            if relations["confused_with"]:
                print(f"  혼동 개념: "
                      f"{[c['name'] for c in relations['confused_with'][:3]]}")
            if relations["related_to"]:
                print(f"  관련:      "
                      f"{[c['name'] for c in relations['related_to'][:3]]}")
        else:
            print(f"[{name}] → 그래프에 없음")

    print("\n" + "="*50)
    print("테스트 3: 오답 분석 (RAG + 그래프 + Gemma)")
    print("="*50)
    q = rag.question_searcher.get_by_round_qnum(77, 1)
    if q:
        print(f"문항: {q['stem'][:60]}...")
        print(f"정답: {q['answer']} ({q['answer_text'][:30]})")
        student_ans = "①"
        print(f"학생 답: {student_ans}\n")

        result = rag.analyze_wrong_answer(q, student_ans)
        print(f"\n[오답 분석 결과]")
        print(f"  오류 유형:   {result['error_type']}")
        print(f"  취약 단위:   {result['wrong_units']}")
        print(f"  왜 틀렸나:   {result['why_wrong']}")
        print(f"  정확한 사실: {result['correct_fact']}")
        print(f"  암기 힌트:   {result['memory_hint']}")
        print(f"  혼동 개념:   {result['confused_with'][:3]}")
        if result["graph_context"].get("found"):
            print(f"  그래프 시대: {result['graph_context'].get('era')}")
    else:
        print("[WARN] 77회 1번 문항 없음")

    print("\n" + "="*50)
    print("테스트 4: 시대별 개념 요약")
    print("="*50)
    for era in ["조선후기", "근대", "일제강점기"]:
        summary = rag.get_era_summary(era)
        print(f"  {era}: {summary['total']}개 개념 "
              f"| {summary['type_counts']}")


def main():
    if not FAISS_PATH.exists():
        print("[ERROR] RAG 인덱스 없음 → build_graphrag.py 먼저 실행")
        return
    if not GRAPH_PATH.exists():
        print("[ERROR] 온톨로지 없음 → build_ontology_from_wiki.py 먼저 실행")
        return

    rag = GraphRAG()
    run_tests(rag)


if __name__ == "__main__":
    main()
