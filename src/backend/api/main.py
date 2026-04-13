"""
main.py — FastAPI 앱 진입점
실행: uvicorn api.main:app --reload --port 8000
"""
import os
from contextlib import asynccontextmanager
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).parent.parent.parent.parent / ".env")  # 프로젝트 루트 .env

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.database import init_db
from api.routers import questions, attempts, today, error_notes, review_queue, admin


def _parse_origin_list(raw: str | None) -> list[str]:
    return [origin.strip().rstrip("/") for origin in (raw or "").split(",") if origin.strip()]


@asynccontextmanager
async def lifespan(app: FastAPI):
    # 시작 시: 테이블 생성. RAG는 필요할 때만 로드하도록 기본값을 둔다.
    init_db()

    eager_load_rag = os.getenv("EAGER_LOAD_RAG", "0") == "1"
    if eager_load_rag:
        from api.services.rag import get_rag  # noqa: F401 — 싱글톤 초기화
        get_rag()
    yield


default_origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3001",
]
extra_origins = _parse_origin_list(os.getenv("CORS_ALLOW_ORIGINS"))
allow_origins = list(dict.fromkeys([*default_origins, *extra_origins]))
allow_origin_regex = os.getenv("CORS_ALLOW_ORIGIN_REGEX") or None


app = FastAPI(
    title="한국사 오답노트 RAG OS",
    version="0.2.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_origin_regex=allow_origin_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(today.router,        prefix="/api/v1")
app.include_router(questions.router,    prefix="/api/v1")
app.include_router(attempts.router,     prefix="/api/v1")
app.include_router(error_notes.router,  prefix="/api/v1")
app.include_router(review_queue.router, prefix="/api/v1")
app.include_router(admin.router,        prefix="/api/v1")


@app.get("/health")
def health():
    return {"status": "ok"}
