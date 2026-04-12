"""
routers/admin.py
Admin 전용 엔드포인트 (인증: X-Admin-Key 헤더)

시나리오 1: POST /admin/ingest/exam       — 새 회차 시험 PDF 업로드
시나리오 2: POST /admin/ingest/material   — 교육자 교안 PDF 업로드
시나리오 3: POST /admin/ontology/reinforce — 오답 패턴 온톨로지 보강
"""

import logging
import os

from fastapi import APIRouter, Depends, File, HTTPException, Security, UploadFile
from fastapi.security.api_key import APIKeyHeader
from sqlalchemy.orm import Session

from api.database import get_db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin", tags=["admin"])

# ── 인증 ──────────────────────────────────────────────────────
_ADMIN_SECRET = os.getenv("ADMIN_SECRET")
if not _ADMIN_SECRET:
    raise RuntimeError(
        "ADMIN_SECRET 환경변수가 설정되지 않았습니다. "
        ".env 또는 환경변수에 ADMIN_SECRET=<강력한 시크릿>을 추가하세요."
    )
_api_key_header = APIKeyHeader(name="X-Admin-Key", auto_error=False)


def _require_admin(api_key: str = Security(_api_key_header)):
    if not api_key or api_key != _ADMIN_SECRET:
        raise HTTPException(
            status_code=403,
            detail={
                "success": False,
                "error": {
                    "code": "FORBIDDEN",
                    "message": "관리자 인증 실패. X-Admin-Key 헤더를 확인하세요.",
                },
            },
        )
    return True


# ── 시나리오 1: 새 회차 시험 자동 확장 ──────────────────────
@router.post("/ingest/exam")
async def ingest_exam(
    question_pdf: UploadFile = File(..., description="문제지 PDF"),
    answer_pdf:   UploadFile = File(..., description="답지 PDF"),
    _: bool = Depends(_require_admin),
):
    """
    PDF 문제지 + 답지 업로드 → seed.json 업데이트 + FAISS/BM25 인덱스 재빌드.

    - 기존 01_parse_exams.py 파싱 로직 재사용
    - 새 회차 번호 자동 결정 (현재 최대 + 1)
    - 실패 시 기존 seed.json / 인덱스 파일 복구
    """
    if not question_pdf.filename or not question_pdf.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail={
            "success": False,
            "error": {"code": "INVALID_FILE", "message": "문제지는 PDF 파일이어야 합니다."},
        })
    if not answer_pdf.filename or not answer_pdf.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail={
            "success": False,
            "error": {"code": "INVALID_FILE", "message": "답지는 PDF 파일이어야 합니다."},
        })

    q_bytes = await question_pdf.read()
    a_bytes = await answer_pdf.read()

    try:
        from api.services.admin_ingest import ingest_exam as _ingest
        result = _ingest(q_bytes, a_bytes)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail={
            "success": False,
            "error": {"code": "PARSE_ERROR", "message": str(exc)},
        })
    except Exception as exc:
        logger.exception("ingest_exam failed")
        raise HTTPException(status_code=500, detail={
            "success": False,
            "error": {"code": "INGEST_FAILED", "message": str(exc)},
        })

    return {"success": True, "data": result}


# ── 시나리오 2: 교육자 교안 업로드 ──────────────────────────
@router.post("/ingest/material")
async def ingest_material(
    pdf: UploadFile = File(..., description="교안 PDF"),
    _: bool = Depends(_require_admin),
):
    """
    PDF 교안 업로드 → Gemma로 개념/관계 추출 → 온톨로지 그래프 확장.

    - graph.json 에 새 노드/엣지 병합 (기존 노드 중복 방지)
    - graphrag 싱글턴 자동 reload
    - 실패 시 기존 graph.json 복구
    """
    if not pdf.filename or not pdf.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail={
            "success": False,
            "error": {"code": "INVALID_FILE", "message": "PDF 파일이어야 합니다."},
        })

    pdf_bytes = await pdf.read()
    source_name = pdf.filename or "교안"

    try:
        from api.services.admin_ingest import ingest_material as _ingest
        result = _ingest(pdf_bytes, source_name=source_name)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail={
            "success": False,
            "error": {"code": "EXTRACT_ERROR", "message": str(exc)},
        })
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail={
            "success": False,
            "error": {"code": "GEMMA_UNAVAILABLE", "message": str(exc)},
        })
    except Exception as exc:
        logger.exception("ingest_material failed")
        raise HTTPException(status_code=500, detail={
            "success": False,
            "error": {"code": "INGEST_FAILED", "message": str(exc)},
        })

    return {"success": True, "data": result}


# ── 시나리오 3: 학생 오답 패턴 온톨로지 보강 ────────────────
@router.post("/ontology/reinforce")
def reinforce_ontology(
    top_n: int = 10,
    _: bool = Depends(_require_admin),
    db: Session = Depends(get_db),
):
    """
    weakness_profiles.wrong_count 상위 개념의 confused_with 엣지 보강.

    - Gemma로 혼동 원인 분석
    - 온톨로지에 반영 (graph.json 업데이트)
    - graphrag 싱글턴 자동 reload
    - 실패 시 기존 graph.json 복구
    """
    if top_n < 1 or top_n > 50:
        raise HTTPException(status_code=400, detail={
            "success": False,
            "error": {"code": "INVALID_PARAM", "message": "top_n 범위: 1~50"},
        })

    try:
        from api.services.admin_ingest import reinforce_ontology as _reinforce
        result = _reinforce(db_session=db, top_n=top_n)
    except Exception as exc:
        logger.exception("reinforce_ontology failed")
        raise HTTPException(status_code=500, detail={
            "success": False,
            "error": {"code": "REINFORCE_FAILED", "message": str(exc)},
        })

    return {"success": True, "data": result}
