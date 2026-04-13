from __future__ import annotations

"""Persist auto-generated error notes."""

import uuid

from sqlalchemy.orm import Session

from api.models.error_note import ErrorNote

DEFAULT_ERROR_TYPE = "핵심 포인트 미파악"
DEFAULT_CORRECT_FACT = "정답 근거를 다시 확인해 주세요."
DEFAULT_WHY_WRONG = "오답 원인을 자동으로 분석했지만 일부 문항 정보가 부족했습니다."
DEFAULT_REVIEW_FRONT = "이 문항의 핵심 개념은?"
DEFAULT_REVIEW_BACK = "정답 근거를 다시 정리해 보세요."
DEFAULT_MEMORY_HINT = "핵심 개념을 정답 근거와 함께 다시 묶어 암기하세요."


def save_error_note(
    db: Session,
    attempt_id: str,
    user_id: str,
    question_id: str,
    analysis: dict,
    question: dict | None = None,
) -> str:
    """Save a generated error note and return its id."""
    question = question or {}

    fallback_correct_fact = (
        _clean_text(question.get("answer_text"))
        or _clean_text(question.get("explanation"))
        or DEFAULT_CORRECT_FACT
    )
    fallback_memory_hint = (
        _clean_text(question.get("memory_hint"))
        or _build_memory_hint(question)
        or DEFAULT_MEMORY_HINT
    )
    fallback_review_front = _build_review_front(question) or DEFAULT_REVIEW_FRONT
    fallback_review_back = (
        _clean_text(question.get("answer_text"))
        or _clean_text(question.get("explanation"))
        or DEFAULT_REVIEW_BACK
    )

    note_id = str(uuid.uuid4())
    note = ErrorNote(
        id=note_id,
        attempt_id=attempt_id,
        user_id=user_id,
        question_id=question_id,
        error_type=analysis.get("error_type") or DEFAULT_ERROR_TYPE,
        wrong_units=_normalize_wrong_units(analysis.get("wrong_units")),
        why_wrong=analysis.get("why_wrong") or DEFAULT_WHY_WRONG,
        correct_fact=analysis.get("correct_fact") or fallback_correct_fact,
        review_front=analysis.get("review_front") or fallback_review_front,
        review_back=analysis.get("review_back") or fallback_review_back,
        memory_hint=analysis.get("memory_hint") or fallback_memory_hint,
    )
    db.add(note)
    db.flush()
    return note_id


def _normalize_wrong_units(value: object) -> list[str]:
    if not isinstance(value, list):
        return []
    return [str(item).strip() for item in value if str(item).strip()]


def _build_memory_hint(question: dict) -> str:
    era_tags = [
        str(tag).strip()
        for tag in (question.get("era_tags") or [])
        if str(tag).strip() and str(tag).strip() != "미분류"
    ]
    base_text = _clean_text(question.get("answer_text")) or _clean_text(question.get("stem"))
    if not base_text:
        return ""

    words = " ".join(base_text.split()[:4]).strip()
    if not words:
        return ""

    if era_tags:
        return f"[{era_tags[0]}] {words}"
    return words


def _build_review_front(question: dict) -> str:
    stem = _clean_text(question.get("stem"))
    if not stem:
        return ""

    front = stem[:60].strip()
    if len(stem) > 60:
        front += "..."
    return front


def _clean_text(value: object) -> str:
    if value is None:
        return ""
    return str(value).strip()
