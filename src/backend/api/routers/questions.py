"""
routers/questions.py
GET /api/v1/questions          — 문제 목록 (필터: topic, era, limit)
GET /api/v1/questions/{id}     — 문제 상세 (answer 절대 미반환)
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from api.database import get_db
from api.models.question import Question
from api.schemas.question import (
    ChoiceItem,
    QuestionDetail,
    QuestionListItem,
    QuestionListResponse,
)

router = APIRouter()


def _to_list_item(q: Question) -> QuestionListItem:
    return QuestionListItem(
        id=q.id,
        round=q.round,
        q_num=q.q_num,
        stem=q.stem,
        era_tags=q.era_tags or [],
        concept_tags=q.concept_tags or [],
        score=q.score,
    )


def _to_detail(q: Question) -> QuestionDetail:
    # choices dict {"①": "..."} → list[ChoiceItem]
    choices_list = [
        ChoiceItem(key=k, text=v)
        for k, v in (q.choices or {}).items()
    ]
    return QuestionDetail(
        id=q.id,
        round=q.round,
        q_num=q.q_num,
        stem=q.stem,
        choices=choices_list,
        score=q.score,
        era_tags=q.era_tags or [],
        concept_tags=q.concept_tags or [],
        source=q.source or "",
    )


@router.get("/questions", response_model=dict)
def list_questions(
    topic: str | None = None,
    era:   str | None = None,
    limit: int = 20,
    db: Session = Depends(get_db),
):
    stmt = select(Question)

    if topic:
        # concept_tags JSON 배열에 topic이 포함된 행 필터 (SQLite JSON_EACH)
        # SQLite에서 JSON 배열 검색 — LIKE로 근사 처리
        stmt = stmt.where(Question.concept_tags.cast(str).contains(topic))

    if era:
        stmt = stmt.where(Question.era_tags.cast(str).contains(era))

    stmt = stmt.limit(limit)
    rows = db.execute(stmt).scalars().all()

    return {
        "success": True,
        "data": QuestionListResponse(
            total_count=len(rows),
            questions=[_to_list_item(q) for q in rows],
        ).model_dump(),
    }


@router.get("/questions/{question_id}", response_model=dict)
def get_question(question_id: str, db: Session = Depends(get_db)):
    q = db.get(Question, question_id)
    if not q:
        raise HTTPException(status_code=404, detail={
            "success": False,
            "error": {"code": "QUESTION_NOT_FOUND", "message": "해당 문항을 찾을 수 없습니다."},
        })
    return {"success": True, "data": _to_detail(q).model_dump()}
