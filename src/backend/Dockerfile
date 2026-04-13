# ── 백엔드 Dockerfile ─────────────────────────────────────────
# 실행 위치: src/backend/
FROM python:3.11-slim

WORKDIR /app

# 시스템 의존성 (faiss-cpu, psycopg2 빌드용)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Python 패키지 먼저 설치 (레이어 캐시 활용)
COPY api/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# 소스 복사
COPY api/ ./api/
COPY korean_history_rag/03_query_test.py ./korean_history_rag/03_query_test.py
COPY korean_history_rag/output/ ./korean_history_rag/output/

# 모델 다운로드 (빌드 시 1회 캐시)
RUN python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('jhgan/ko-sroberta-multitask')"

EXPOSE 8000

CMD ["sh", "-c", "python -m api.scripts.seed_db && uvicorn api.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
