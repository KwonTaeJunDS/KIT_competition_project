from __future__ import annotations

"""API-safe wrapper around the error analyzer.

Phase 5: LLM(Gemma) 우선 → rule-based → pure fallback 순서.
"""

import logging

from api.services.rag import ErrorAnalyzerBase, get_rag

logger = logging.getLogger(__name__)
_analyzer = ErrorAnalyzerBase()


def analyze_error(question_dict: dict, student_answer_num: int) -> dict:
    """오답 분석. LLM → rule-based → pure fallback 순으로 시도."""
    # ── Phase 5: LLM 우선 ──────────────────────────────────────
    try:
        from api.services.llm_analyzer import analyze_with_llm
        llm_result = analyze_with_llm(question_dict, student_answer_num)
        if llm_result:
            return _merge_with_fallbacks(question_dict, student_answer_num, llm_result)
    except Exception:
        logger.debug("LLM analyzer import/call failed; falling back to rule-based.")

    # ── rule-based fallback ────────────────────────────────────
    try:
        rag = get_rag()
        analysis = _analyzer.analyze(question_dict, student_answer_num, rag)
        return _merge_with_fallbacks(question_dict, student_answer_num, analysis)
    except Exception:
        logger.exception("Rule-based analysis also failed; using pure fallback.")
        return _build_fallback_analysis(question_dict, student_answer_num)


def question_to_dict(q) -> dict:
    """Convert a Question model into analyzer input."""
    return {
        "id": q.id,
        "round": q.round,
        "q_num": q.q_num,
        "stem": q.stem,
        "choices": q.choices or {},
        "answer": q.answer,
        "answer_num": q.answer_num,
        "answer_text": q.answer_text or "",
        "era_tags": q.era_tags or [],
        "concept_tags": q.concept_tags or [],
        "memory_hint": q.memory_hint or "",
        "explanation": q.explanation or "",
    }


def _merge_with_fallbacks(question_dict: dict, student_answer_num: int, analysis: dict | None) -> dict:
    fallback = _build_fallback_analysis(question_dict, student_answer_num)
    merged = {**fallback, **(analysis or {})}

    if not isinstance(merged.get("wrong_units"), list):
        merged["wrong_units"] = fallback["wrong_units"]

    for key in ("why_wrong", "correct_fact", "memory_hint", "review_front", "review_back"):
        if not merged.get(key):
            merged[key] = fallback[key]

    if not isinstance(merged.get("similar_questions"), list):
        merged["similar_questions"] = []

    return merged


def _build_fallback_analysis(question_dict: dict, student_answer_num: int) -> dict:
    choices = question_dict.get("choices") or {}
    answer = question_dict.get("answer") or ""
    correct_num = question_dict.get("answer_num") or 0
    concept_tags = [tag for tag in (question_dict.get("concept_tags") or []) if tag]
    era_tags = [tag for tag in (question_dict.get("era_tags") or []) if tag and tag != "미분류"]

    student_choice = _choice_label(student_answer_num)
    correct_choice = answer or _choice_label(correct_num)

    student_text = _clean_text(choices.get(student_choice))
    correct_text = _clean_text(choices.get(correct_choice) or question_dict.get("answer_text"))
    stem = _clean_text(question_dict.get("stem"))

    # Contract taxonomy 내 값만 사용 (FRONTEND_BACKEND_CONTRACT.md 오답 유형 고정값 기준)
    if student_answer_num <= 0:
        error_type = "핵심 포인트 미파악"
        why_wrong = "선택지 번호를 해석하지 못해 오답 분석을 단순화했습니다."
    elif not choices:
        error_type = "핵심 포인트 미파악"
        why_wrong = "문항 선택지가 비어 있어 보기 비교 기반 분석을 수행하지 못했습니다."
    elif student_text and correct_text:
        error_type = "비슷한 개념 혼동"
        why_wrong = f"선택한 보기 '{student_text[:24]}'보다 정답 근거 '{correct_text[:24]}'를 확인해야 합니다."
    else:
        error_type = "핵심 포인트 미파악"
        why_wrong = "문항 정보가 일부 비어 있어 핵심 개념 위주로 오답 노트를 생성했습니다."

    era_prefix = era_tags[0] if era_tags else "시기 미분류"
    hint_source = correct_text or stem or "핵심 개념"
    hint_words = " ".join(hint_source.split()[:4]).strip() or "핵심 개념"

    review_front = stem[:60].strip() or "이 문항의 핵심 개념은?"
    if len(stem) > 60:
        review_front += "..."

    return {
        "error_type": error_type,
        "wrong_units": concept_tags[:2],
        "why_wrong": why_wrong,
        "correct_fact": correct_text or "정답 근거를 다시 확인해 주세요.",
        "memory_hint": question_dict.get("memory_hint") or f"[{era_prefix}] {hint_words}",
        "review_front": review_front,
        "review_back": correct_text or question_dict.get("explanation") or "정답 근거를 다시 정리해 보세요.",
        "similar_questions": [],
    }


def _choice_label(choice_num: int) -> str:
    return {
        1: "①",
        2: "②",
        3: "③",
        4: "④",
        5: "⑤",
    }.get(choice_num, "")


def _clean_text(value: object) -> str:
    if value is None:
        return ""
    return str(value).strip()
