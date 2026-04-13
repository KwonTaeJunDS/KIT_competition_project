"""
03_query_test.py
────────────────
RAG 검색 테스트 + 오답 분석 엔진 (Gemma 없이도 동작하는 규칙 기반 버전)

실행:
    python 03_query_test.py
"""

import json
import pickle
import re
from pathlib import Path

import faiss
import numpy as np
from sentence_transformers import SentenceTransformer

# ─── 설정 ────────────────────────────────────────────────────
RAG_DIR       = Path("output/rag")
FAISS_PATH    = RAG_DIR / "faiss.index"
METADATA_PATH = RAG_DIR / "metadata.json"
BM25_PATH     = RAG_DIR / "bm25.pkl"
MODEL_NAME    = "jhgan/ko-sroberta-multitask"

CIRCLE_MAP = {"①": 1, "②": 2, "③": 3, "④": 4, "⑤": 5}
NUM_MAP    = {1: "①", 2: "②", 3: "③", 4: "④", 5: "⑤"}


# ─── RAG 검색 엔진 ────────────────────────────────────────────
class KoreanHistoryRAG:
    def __init__(self):
        print("[RAG 로드 중...]")
        self.index    = faiss.read_index(str(FAISS_PATH))
        self.bm25     = pickle.load(open(BM25_PATH, "rb"))
        self.metadata = json.load(open(METADATA_PATH, "r", encoding="utf-8"))
        self.model    = SentenceTransformer(MODEL_NAME)
        self.records  = list(self.metadata.values())
        print(f"  인덱스: {self.index.ntotal}개 벡터 로드 완료\n")

    # ── Dense 검색 ───────────────────────────────────────────
    def dense_search(self, query: str, top_k: int = 10) -> list[tuple[int, float]]:
        vec = self.model.encode([query], normalize_embeddings=True).astype("float32")
        scores, indices = self.index.search(vec, top_k)
        return list(zip(indices[0].tolist(), scores[0].tolist()))

    # ── BM25 검색 ────────────────────────────────────────────
    def bm25_search(self, query: str, top_k: int = 10) -> list[tuple[int, float]]:
        tokens = query.split()
        scores = self.bm25.get_scores(tokens)
        top_indices = np.argsort(scores)[::-1][:top_k]
        return [(int(i), float(scores[i])) for i in top_indices]

    # ── Hybrid (RRF) ─────────────────────────────────────────
    def hybrid_search(self, query: str, top_k: int = 5, k: int = 60) -> list[dict]:
        """
        Reciprocal Rank Fusion (RRF):
        score = Σ 1 / (k + rank_i)
        Dense + BM25 결과를 합산해 재순위화.
        """
        dense_results = self.dense_search(query, top_k=top_k * 2)
        bm25_results  = self.bm25_search(query, top_k=top_k * 2)

        rrf_scores: dict[int, float] = {}

        for rank, (idx, _) in enumerate(dense_results):
            rrf_scores[idx] = rrf_scores.get(idx, 0) + 1.0 / (k + rank + 1)

        for rank, (idx, _) in enumerate(bm25_results):
            rrf_scores[idx] = rrf_scores.get(idx, 0) + 1.0 / (k + rank + 1)

        sorted_ids = sorted(rrf_scores, key=lambda x: rrf_scores[x], reverse=True)[:top_k]
        return [self.metadata[str(i)] for i in sorted_ids if str(i) in self.metadata]

    # ── 특정 문항 조회 (회차 + 번호) ─────────────────────────
    def get_question(self, round_no: int, q_num: int) -> dict | None:
        for r in self.records:
            if r["round"] == round_no and r["q_num"] == q_num:
                return r
        return None

    # ── 유사 문항 검색 (개념 기반) ───────────────────────────
    def find_similar(self, record: dict, top_k: int = 3) -> list[dict]:
        query = record["stem"]
        results = self.hybrid_search(query, top_k=top_k + 1)
        # 본인 제외
        return [r for r in results if r["id"] != record["id"]][:top_k]


# ─── 오답 분석 엔진 (규칙 기반) ──────────────────────────────
class ErrorAnalyzer:
    """
    Gemma 없이도 동작하는 규칙 기반 오답 분류기.
    실제 서비스에서는 Gemma로 교체.
    """

    ERROR_TAXONOMY = [
        "시대 혼동",
        "인물-사건 매칭 오류",
        "정책/제도 혼동",
        "원인-결과 인과 오인",
        "비슷한 개념 혼동",
        "핵심 포인트 미파악",
        "지엽 정보 과몰입",
    ]

    # 오답 번호 기준 위치 패턴 → 오류 유형 힌트
    POSITIONAL_HINTS = {
        1: "시대 혼동",       # 1번은 보통 시대 식별 문제가 많음
        2: "인물-사건 매칭 오류",
        3: "비슷한 개념 혼동",
        4: "정책/제도 혼동",
        5: "지엽 정보 과몰입",
    }

    def analyze(
        self,
        question: dict,
        student_answer_num: int,  # 1~5
        rag: KoreanHistoryRAG,
    ) -> dict:
        """
        오답 분석 결과 반환.
        반환 스키마는 PRD Section 10-2와 동일.
        """
        correct_num  = question["answer_num"]
        is_correct   = student_answer_num == correct_num

        student_ch   = NUM_MAP.get(student_answer_num, "")
        correct_ch   = question["answer"]
        choices      = question["choices"]

        student_text = choices.get(student_ch, "")
        correct_text = choices.get(correct_ch, "")

        if is_correct:
            return {
                "is_correct":    True,
                "error_type":    None,
                "wrong_units":   [],
                "why_wrong":     None,
                "correct_fact":  correct_text,
                "memory_hint":   question.get("memory_hint", ""),
                "review_front":  None,
                "review_back":   None,
                "similar_questions": [],
            }

        # 오류 유형 추정 (규칙 기반)
        error_type = self._classify_error(question, student_answer_num, correct_num)

        # 취약 단위 (틀린 개념 태그)
        wrong_units = question.get("concept_tags", [])[:2]

        # 설명 생성
        why_wrong = self._generate_why_wrong(
            question["stem"], student_text, correct_text, error_type
        )
        correct_fact = self._generate_correct_fact(question["stem"], correct_text)
        memory_hint  = self._generate_memory_hint(question["era_tags"], correct_text)

        # 복습 카드 생성
        review_front, review_back = self._make_review_card(question, correct_text)

        # 유사 문항 추천
        similar = rag.find_similar(question, top_k=3)

        return {
            "is_correct":    False,
            "error_type":    error_type,
            "wrong_units":   wrong_units,
            "why_wrong":     why_wrong,
            "correct_fact":  correct_fact,
            "memory_hint":   memory_hint,
            "review_front":  review_front,
            "review_back":   review_back,
            "similar_questions": [
                {"round": s["round"], "q_num": s["q_num"], "stem": s["stem"][:50]}
                for s in similar
            ],
        }

    def _classify_error(self, q: dict, student_num: int, correct_num: int) -> str:
        stem = q["stem"]

        # 키워드 기반 분류
        if any(k in stem for k in ["시기", "연표", "순서", "이전", "이후", "세기"]):
            return "시대 혼동"
        if any(k in stem for k in ["인물", "왕", "장군", "학자", "누구"]):
            return "인물-사건 매칭 오류"
        if any(k in stem for k in ["정책", "제도", "법령", "기구", "설치"]):
            return "정책/제도 혼동"
        if any(k in stem for k in ["원인", "배경", "결과", "영향", "계기"]):
            return "원인-결과 인과 오인"
        if any(k in stem for k in ["문화유산", "유물", "유적"]):
            return "비슷한 개념 혼동"

        # 거리 기반 힌트 (정답과 오답의 번호 차이)
        diff = abs(student_num - correct_num)
        if diff == 1:
            return "비슷한 개념 혼동"

        return self.POSITIONAL_HINTS.get(student_num, "핵심 포인트 미파악")

    def _generate_why_wrong(
        self, stem: str, student_text: str, correct_text: str, error_type: str
    ) -> str:
        templates = {
            "시대 혼동":           f"'{student_text[:20]}...'는 다른 시대의 내용입니다. {error_type}이 발생했습니다.",
            "인물-사건 매칭 오류": f"'{student_text[:20]}...'는 다른 인물 또는 사건에 해당합니다.",
            "정책/제도 혼동":      f"'{student_text[:20]}...'는 다른 시기의 정책이나 제도입니다.",
            "원인-결과 인과 오인": f"원인과 결과의 순서가 반대이거나 다른 사건과 혼동한 것으로 보입니다.",
            "비슷한 개념 혼동":    f"유사한 개념이 포함되어 있어 혼동하기 쉬운 문항입니다.",
            "핵심 포인트 미파악":  f"문항의 핵심 키워드를 파악하지 못한 것으로 보입니다.",
            "지엽 정보 과몰입":    f"지엽적인 정보에 집중하여 핵심 내용을 놓쳤습니다.",
        }
        return templates.get(error_type, "오답이 발생했습니다.")

    def _generate_correct_fact(self, stem: str, correct_text: str) -> str:
        return f"이 문항의 핵심 정답은 '{correct_text[:40]}' 입니다."

    def _generate_memory_hint(self, era_tags: list, correct_text: str) -> str:
        era = era_tags[0] if era_tags else ""
        words = correct_text.split()[:4]
        return f"[{era}] {' '.join(words)}"

    def _make_review_card(self, question: dict, correct_text: str) -> tuple[str, str]:
        # 문항 핵심어 추출 (가장 앞 키워드)
        stem_words = question["stem"].split()[:8]
        front = " ".join(stem_words) + "...?"
        back  = correct_text[:60]
        return front, back


# ─── 테스트 실행 ──────────────────────────────────────────────
def run_tests(rag: KoreanHistoryRAG, analyzer: ErrorAnalyzer):

    print("=" * 50)
    print("테스트 1: 하이브리드 검색")
    print("=" * 50)
    query = "흥선대원군 서원 철폐 왕권 강화"
    results = rag.hybrid_search(query, top_k=3)
    print(f"검색어: {query}")
    for i, r in enumerate(results, 1):
        print(f"  {i}. [{r['round']}회 {r['q_num']}번] {r['stem'][:50]}...")
        print(f"     정답: {r['answer']} | 시대: {r['era_tags']}")

    print()
    print("=" * 50)
    print("테스트 2: 특정 문항 오답 분석")
    print("=" * 50)

    # 77회 1번 문항을 틀렸다고 가정
    q = rag.get_question(round_no=77, q_num=1)
    if q:
        print(f"문항: {q['stem'][:80]}...")
        print(f"정답: {q['answer']} ({q['answer_text'][:40]})")

        # 학생이 ①을 선택했다고 가정 (정답은 ③)
        student_ans = 1
        print(f"학생 답: {NUM_MAP.get(student_ans, '?')}")

        result = analyzer.analyze(q, student_ans, rag)
        print(f"\n[오답 분석 결과]")
        print(f"  오류 유형:  {result['error_type']}")
        print(f"  취약 단위:  {result['wrong_units']}")
        print(f"  왜 틀렸나:  {result['why_wrong']}")
        print(f"  정확한 사실:{result['correct_fact']}")
        print(f"  암기 힌트:  {result['memory_hint']}")
        print(f"  복습 앞면:  {result['review_front']}")
        print(f"  복습 뒷면:  {result['review_back']}")
        if result['similar_questions']:
            print(f"  유사 문항:")
            for sq in result['similar_questions']:
                print(f"    - [{sq['round']}회 {sq['q_num']}번] {sq['stem']}")
    else:
        print("[WARN] 77회 1번 문항 없음 → 01_parse_exams.py 실행 후 다시 시도")

    print()
    print("=" * 50)
    print("테스트 3: 시대별 문항 목록")
    print("=" * 50)
    era_target = "조선후기"
    count = sum(1 for r in rag.records if era_target in r.get("era_tags", []))
    print(f"'{era_target}' 태그 문항 수: {count}개")


def main():
    if not FAISS_PATH.exists():
        print("[ERROR] RAG 인덱스 없음 → 02_build_rag.py 먼저 실행하세요")
        return

    rag      = KoreanHistoryRAG()
    analyzer = ErrorAnalyzer()
    run_tests(rag, analyzer)


if __name__ == "__main__":
    main()
