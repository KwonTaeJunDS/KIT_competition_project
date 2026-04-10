"""
database.py — SQLAlchemy 엔진 + 세션
- 기본값: SQLite (로컬 개발, Docker 없이 빠른 검증)
- DATABASE_URL 환경변수 설정 시 Postgres로 자동 전환
  예) DATABASE_URL=postgresql://user:pass@db:5432/history_rag
"""
import os
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

_DB_FILE = Path(__file__).parent / "history_rag.db"
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{_DB_FILE}")

_is_sqlite = DATABASE_URL.startswith("sqlite")

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if _is_sqlite else {},
    pool_pre_ping=True,   # Postgres 연결 드랍 자동 감지
    echo=False,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    """FastAPI Depends용 DB 세션 제너레이터."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """
    SQLAlchemy ORM 기반 테이블 자동 생성.
    Postgres 운영 환경에서는 migrations/001_init_schema.sql 사용 권장.
    """
    from api.models import question, attempt, error_note, review_queue, weakness_profile  # noqa: F401
    Base.metadata.create_all(bind=engine)
