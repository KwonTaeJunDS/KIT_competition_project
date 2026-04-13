from __future__ import annotations

"""backend/api/services/graphrag.py

GraphRAG 서비스 — FAISS + 온톨로지 그래프 + Gemma 통합.
05_graphrag_search.py의 GraphRAG 클래스를 backend API에서 사용 가능하도록 이식.

경로 우선순위:
  GRAPHRAG_BASE_DIR 환경변수 > src/backend/korean_history_rag (기본)

Gemma 실패 시 규칙 기반 fallback 내장.
"""

import json
import logging
import os
import pickle
import re
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)

# ── 경로 설정 ──────────────────────────────────────────────────
# __file__ 이 상대경로로 주입되는 경우에도 반드시 절대경로로 고정
_HERE        = Path(os.path.abspath(__file__))   # services/graphrag.py (절대)
_BACKEND_DIR = _HERE.parent.parent.parent        # services → api → backend
_DEFAULT_RAG_BASE = _BACKEND_DIR / "korean_history_rag"

RAG_BASE = Path(os.getenv("GRAPHRAG_BASE_DIR", str(_DEFAULT_RAG_BASE))).resolve()
logger.info("[graphrag] RAG_BASE = %s", RAG_BASE)

FAISS_PATH    = RAG_BASE / "output/rag/faiss.index"
METADATA_PATH = RAG_BASE / "output/rag/metadata.json"
BM25_PATH     = RAG_BASE / "output/rag/bm25.pkl"
GRAPH_PATH    = RAG_BASE / "output/ontology/graph.json"
_REQUIRED_ARTIFACTS = (
    FAISS_PATH,
    METADATA_PATH,
    BM25_PATH,
    GRAPH_PATH,
)

# ── Gemma 설정 ─────────────────────────────────────────────────
OLLAMA_URL  = os.getenv("OLLAMA_URL",   "").strip()
GEMMA_MODEL = os.getenv("GEMMA_MODEL",  "gemma3:4b")
LLM_TIMEOUT = int(os.getenv("LLM_TIMEOUT_SEC", "30"))
EMBED_MODEL = "jhgan/ko-sroberta-multitask"

_NUM_TO_CH = {1: "①", 2: "②", 3: "③", 4: "④", 5: "⑤"}


# ── Gemma 프롬프트 ─────────────────────────────────────────────
_ANALYZE_PROMPT = """
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

_TAXONOMY_MAP = {
    "시대 혼동":           "시대 혼동",
    "인물-사건 매칭 오류": "인물-사건 매칭 오류",
    "정책·제도 혼동":      "정책/제도 혼동",
    "정책/제도 혼동":      "정책/제도 혼동",
    "원인-결과 인과 오인": "원인-결과 인과 오인",
    "비슷한 개념 혼동":    "비슷한 개념 혼동",
    "핵심 포인트 미파악":  "핵심 포인트 미파악",
    "지엽 정보 과몰입":    "지엽 정보 과몰입",
}


def _call_gemma_ollama(context: dict) -> dict | None:
    """Ollama REST API로 Gemma 오답 분석 호출."""
    if not OLLAMA_URL:
        return None

    similar_lines = "\n".join(
        f"- {q['stem'][:50]}... (정답: {q.get('answer', '')})"
        for q in context.get("similar", [])[:3]
    ) or "없음"

    prompt = _ANALYZE_PROMPT.format(
        stem              = str(context.get("stem", ""))[:200],
        correct_answer    = context.get("correct_answer", ""),
        correct_text      = context.get("correct_text", ""),
        student_answer    = context.get("student_answer", ""),
        student_text      = context.get("student_text", ""),
        era               = ", ".join(context.get("era", [])) or "미상",
        related           = ", ".join(context.get("related", [])[:5]) or "없음",
        confused          = ", ".join(context.get("confused", [])[:5]) or "없음",
        similar_questions = similar_lines,
    )

    url     = f"{OLLAMA_URL.rstrip('/')}/api/generate"
    payload = json.dumps({
        "model": GEMMA_MODEL,
        "prompt": prompt,
        "stream": False,
        "format": "json",
        "options": {"temperature": 0.1, "num_predict": 512},
    }).encode()

    req = urllib.request.Request(
        url, data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=LLM_TIMEOUT) as resp:
            body = json.loads(resp.read())
        raw: str = body.get("response") or ""
        return _parse_gemma_response(raw)
    except Exception as exc:
        logger.debug("GraphRAG Gemma call failed: %s", exc)
        return None


def _parse_gemma_response(raw: str) -> dict | None:
    if not raw:
        return None
    text = raw.strip()
    text = re.sub(r"```json\s*", "", text)
    text = re.sub(r"```\s*", "", text)
    start = text.find("{")
    end   = text.rfind("}") + 1
    if start == -1 or end <= 0:
        return None
    try:
        data: dict[str, Any] = json.loads(text[start:end])
    except json.JSONDecodeError:
        return None

    required = {"error_type", "why_wrong", "correct_fact", "memory_hint"}
    if not required.issubset(data.keys()):
        return None

    # taxonomy 정규화 (CONTRACT 고정값으로)
    raw_type = data.get("error_type", "")
    data["error_type"] = _TAXONOMY_MAP.get(raw_type, "핵심 포인트 미파악")

    if not isinstance(data.get("wrong_units"), list):
        data["wrong_units"] = []

    return data


# ─────────────────────────────────────────────────────────────
# QuestionSearcher — FAISS + BM25
# ─────────────────────────────────────────────────────────────

class QuestionSearcher:
    def __init__(self):
        import faiss as _faiss
        import numpy as _np
        from sentence_transformers import SentenceTransformer

        self._np    = _np
        self.index    = _faiss.read_index(str(FAISS_PATH))
        self.metadata = json.load(open(METADATA_PATH, encoding="utf-8"))
        self.bm25     = pickle.load(open(BM25_PATH, "rb"))
        self.model    = SentenceTransformer(EMBED_MODEL)
        self.records  = list(self.metadata.values())
        logger.info("QuestionSearcher: %d items loaded", self.index.ntotal)

    def dense_search(self, query: str, top_k: int = 10) -> list[tuple[int, float]]:
        import numpy as np
        vec = self.model.encode([query], normalize_embeddings=True).astype("float32")
        scores, indices = self.index.search(vec, top_k)
        return list(zip(indices[0].tolist(), scores[0].tolist()))

    def bm25_search(self, query: str, top_k: int = 10) -> list[tuple[int, float]]:
        import numpy as np
        tokens = query.split()
        scores = self.bm25.get_scores(tokens)
        top_indices = np.argsort(scores)[::-1][:top_k]
        return [(int(i), float(scores[i])) for i in top_indices]

    def hybrid_search(self, query: str, top_k: int = 5, k: int = 60) -> list[dict]:
        dense  = self.dense_search(query, top_k=top_k * 2)
        sparse = self.bm25_search(query, top_k=top_k * 2)

        rrf: dict[int, float] = {}
        for rank, (idx, _) in enumerate(dense):
            rrf[idx] = rrf.get(idx, 0) + 1.0 / (k + rank + 1)
        for rank, (idx, _) in enumerate(sparse):
            rrf[idx] = rrf.get(idx, 0) + 1.0 / (k + rank + 1)

        sorted_ids = sorted(rrf, key=lambda x: rrf[x], reverse=True)[:top_k]
        return [self.metadata[str(i)] for i in sorted_ids if str(i) in self.metadata]

    def get_by_id(self, question_id: str) -> dict | None:
        for r in self.records:
            if str(r.get("id")) == str(question_id):
                return r
        return None


# ─────────────────────────────────────────────────────────────
# OntologySearcher — NetworkX 그래프
# ─────────────────────────────────────────────────────────────

class OntologySearcher:
    def __init__(self):
        import networkx as nx
        graph_data = json.load(open(GRAPH_PATH, encoding="utf-8"))
        self.G = nx.node_link_graph(graph_data)
        logger.info(
            "OntologySearcher: %d nodes / %d edges",
            self.G.number_of_nodes(), self.G.number_of_edges(),
        )

    def find_node(self, name: str) -> dict | None:
        for node_id, data in self.G.nodes(data=True):
            if data.get("name") == name:
                return {"id": node_id, **data}
        return None

    def get_relations(self, name: str) -> dict:
        node = self.find_node(name)
        if not node:
            return {"found": False, "name": name}

        node_id = node["id"]
        result: dict[str, Any] = {
            "found": True, "name": name,
            "type": node.get("type"),
            "era": [], "confused_with": [], "related_to": [],
            "implemented_by": [], "participated_in": [],
            "led_by": [], "written_by": [], "member_of": [], "located_in": [],
        }

        for _, tgt_id, edge_data in self.G.out_edges(node_id, data=True):
            relation = edge_data.get("relation", "")
            tgt_data = self.G.nodes.get(tgt_id, {})
            tgt_name = tgt_data.get("name", "")
            tgt_type = tgt_data.get("type", "")
            entry    = {"name": tgt_name, "type": tgt_type}

            if relation == "is_in_era":
                result["era"].append(tgt_name)
            elif relation == "confused_with":
                result["confused_with"].append(entry)
            elif relation == "related_to":
                result["related_to"].append(entry)
            elif relation in result:
                result[relation].append(entry)

        # 역방향 confused_with
        for src_id, _, edge_data in self.G.in_edges(node_id, data=True):
            if edge_data.get("relation") == "confused_with":
                src_data = self.G.nodes.get(src_id, {})
                entry    = {"name": src_data.get("name", ""), "type": src_data.get("type", "")}
                if entry not in result["confused_with"]:
                    result["confused_with"].append(entry)

        return result

    def get_confused_pairs(self, name: str) -> list[str]:
        return [c["name"] for c in self.get_relations(name).get("confused_with", [])]


# ─────────────────────────────────────────────────────────────
# GraphRAGService — 두 DB + Gemma 통합
# ─────────────────────────────────────────────────────────────

class GraphRAGService:
    """
    RAG DB 1 (FAISS) + RAG DB 2 (온톨로지) + Gemma.
    오답 분석 메인 진입점.
    """

    def __init__(self):
        self.question_searcher = QuestionSearcher()
        self.ontology_searcher = OntologySearcher()

    def analyze_wrong_answer(
        self,
        question: dict,
        student_answer_num: int,
    ) -> dict:
        """
        question_dict + student_answer_num(int) → 오답 분석 dict.

        반환 키: error_type, wrong_units, why_wrong, correct_fact, memory_hint,
                 confused_with, graph_context (internal)
        """
        student_ch   = _NUM_TO_CH.get(student_answer_num, "")
        correct_ch   = question.get("answer", "")
        correct_text = question.get("answer_text", "")
        choices      = question.get("choices") or {}
        student_text = str(choices.get(student_ch) or "").strip()

        # 그래프 컨텍스트
        graph_context = self.ontology_searcher.get_relations(correct_text)
        confused      = self.ontology_searcher.get_confused_pairs(correct_text)

        # 유사 문항
        similar = self._find_similar(question, top_k=3)

        gemma_context = {
            "stem":           question.get("stem", ""),
            "correct_answer": correct_ch,
            "correct_text":   correct_text,
            "student_answer": student_ch,
            "student_text":   student_text,
            "era":            graph_context.get("era", []),
            "related":        [c["name"] for c in graph_context.get("related_to", [])],
            "confused":       confused,
            "similar":        similar,
        }

        gemma_result = _call_gemma_ollama(gemma_context)

        if gemma_result:
            logger.debug("GraphRAG: Gemma analysis succeeded")
            error_type   = gemma_result.get("error_type", "핵심 포인트 미파악")
            wrong_units  = gemma_result.get("wrong_units", [])
            why_wrong    = gemma_result.get("why_wrong", "")
            correct_fact = gemma_result.get("correct_fact", correct_text)
            memory_hint  = gemma_result.get("memory_hint", "")
        else:
            logger.debug("GraphRAG: Gemma failed → rule-based fallback")
            error_type   = self._classify_error(question, student_ch, correct_ch, graph_context)
            wrong_units  = self._extract_wrong_units(graph_context)
            why_wrong    = self._generate_why_wrong(student_text, correct_text, error_type)
            correct_fact = f"이 문항의 핵심 정답은 '{correct_text[:40]}'입니다."
            memory_hint  = self._make_memory_hint(question.get("era_tags", []), correct_text)

        return {
            "error_type":    error_type,
            "wrong_units":   wrong_units,
            "why_wrong":     why_wrong,
            "correct_fact":  correct_fact,
            "memory_hint":   memory_hint,
            "confused_with": confused,
            "graph_context": graph_context,
        }

    def _find_similar(self, question: dict, top_k: int = 3) -> list[dict]:
        query   = question.get("stem", "")
        results = self.question_searcher.hybrid_search(query, top_k=top_k + 1)
        return [r for r in results if str(r.get("id")) != str(question.get("id"))][:top_k]

    # ── 규칙 기반 fallback (05_graphrag_search.py 동일) ───────

    def _classify_error(
        self, question: dict, student_ch: str, correct_ch: str, graph_context: dict
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
            return "정책/제도 혼동"
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
            units.append(f"시대 구분 ({', '.join(graph_context['era'][:2])})")
        if graph_context.get("related_to"):
            units.append("관련 사건 연결")
        return units[:2]

    def _generate_why_wrong(
        self, student_text: str, correct_text: str, error_type: str
    ) -> str:
        prefix = student_text[:20] if student_text else "선택 보기"
        templates = {
            "시대 혼동":           f"'{prefix}'는 다른 시대의 내용입니다.",
            "인물-사건 매칭 오류": f"'{prefix}'는 다른 인물 또는 사건입니다.",
            "정책/제도 혼동":      f"'{prefix}'는 다른 시기의 정책입니다.",
            "원인-결과 인과 오인": "원인과 결과의 순서가 반대이거나 혼동한 것입니다.",
            "비슷한 개념 혼동":    "유사한 개념이 포함되어 혼동하기 쉬운 문항입니다.",
            "핵심 포인트 미파악":  "문항의 핵심 키워드를 파악하지 못했습니다.",
        }
        return templates.get(error_type, "오답이 발생했습니다.")

    def _make_memory_hint(self, era_tags: list, correct_text: str) -> str:
        era   = era_tags[0] if era_tags else ""
        words = correct_text.split()[:4]
        return f"[{era}] {' '.join(words)}" if era else " ".join(words)


# ─────────────────────────────────────────────────────────────
# Singleton / 가용성 확인
# ─────────────────────────────────────────────────────────────

_instance: GraphRAGService | None = None


def graphrag_available() -> bool:
    """Return True only when all GraphRAG artifacts are present."""
    return all(path.exists() for path in _REQUIRED_ARTIFACTS)


def get_graphrag() -> GraphRAGService:
    """Lazy 싱글턴. 첫 호출 시 모델/인덱스 로드."""
    global _instance
    if _instance is None:
        _instance = GraphRAGService()
    return _instance
