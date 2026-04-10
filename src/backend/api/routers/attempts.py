from __future__ import annotations

"""POST /api/v1/attempts: grade an answer and auto-create an error note."""

import logging
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from api.database import get_db
from api.models.attempt import Attempt
from api.models.question import Question
from api.schemas.attempt import AttemptRequest, AttemptResponse
from api.services import judge as judge_svc
from api.services.error_analyzer import analyze_error, question_to_dict
from api.services.note_writer import save_error_note
from api.services.review_scheduler import create_review_queue
from api.services.weakness_updater import update_weakness

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/attempts", response_model=dict)
def submit_attempt(body: AttemptRequest, db: Session = Depends(get_db)):
    q: Question | None = db.get(Question, body.question_id)
    if not q:
        raise HTTPException(
            status_code=404,
            detail={
                "success": False,
                "error": {"code": "QUESTION_NOT_FOUND", "message": "해당 문항을 찾을 수 없습니다."},
            },
        )

    is_correct, normalized_answer, student_num = judge_svc.judge(
        answer=q.answer,
        student_answer=body.student_answer,
    )

    attempt_id = str(uuid.uuid4())
    attempt = Attempt(
        id=attempt_id,
        user_id=body.user_id,
        question_id=q.id,
        student_answer=normalized_answer,
        is_correct=is_correct,
        submitted_at=datetime.now(timezone.utc),
    )
    db.add(attempt)
    db.flush()

    note_saved = False
    note_id: str | None = None
    analysis: dict = {}

    if not is_correct:
        q_dict = question_to_dict(q)
        analysis = analyze_error(q_dict, student_num)

        try:
            with db.begin_nested():
                note_id = save_error_note(
                    db=db,
                    attempt_id=attempt_id,
                    user_id=body.user_id,
                    question_id=q.id,
                    analysis=analysis,
                    question=q_dict,
                )
                # 오답노트와 함께 복습 큐 항목 생성 (1일 후 due_at)
                create_review_queue(
                    db=db,
                    user_id=body.user_id,
                    error_note_id=note_id,
                )
            note_saved = True
        except Exception:
            logger.exception("Error note creation failed for attempt_id=%s", attempt_id)
            note_saved = False
            note_id = None

    # 취약 개념 프로필 업데이트 (오답만, 실패해도 커밋에 영향 없음)
    if not is_correct:
        update_weakness(
            db           = db,
            user_id      = body.user_id,
            era_tags     = q_dict.get("era_tags", []),
            concept_tags = q_dict.get("concept_tags", []),
            is_correct   = False,
        )

    db.commit()

    explanation_summary = q.explanation or analysis.get("correct_fact") or q.answer_text or ""

    resp = AttemptResponse(
        is_correct=is_correct,
        correct_answer=q.answer,
        answer_text=q.answer_text or "",
        explanation_summary=explanation_summary,
        error_type=analysis.get("error_type") if not is_correct else None,
        wrong_units=analysis.get("wrong_units") or [],
        why_wrong=analysis.get("why_wrong") if not is_correct else None,
        correct_fact=analysis.get("correct_fact") or q.answer_text or q.explanation or "",
        memory_hint=analysis.get("memory_hint") or q.memory_hint or "",
        note_saved=note_saved,
        note_id=note_id,
    )

    return {"success": True, "data": resp.model_dump()}
