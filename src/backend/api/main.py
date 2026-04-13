"""
main.py — FastAPI 앱 진입점
실행: uvicorn api.main:app --reload --port 8000
"""
from contextlib import asynccontextmanager
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).parent.parent.parent.parent / ".env")  # 프로젝트 루트 .env

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.database import init_db
from api.routers import questions, attempts, today, error_notes, review_queue, admin


@asynccontextmanager
async def lifespan(app: FastAPI):
    # 시작 시: 테이블 생성 + RAG 인덱스 로드
    init_db()
    from api.services.rag import get_rag  # noqa: F401 — 싱글톤 초기화
    get_rag()
    yield


app = FastAPI(
    title="한국사 오답노트 RAG OS",
    version="0.2.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
    ],
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
