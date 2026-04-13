"""
scripts/seed_db.py — seed.json → questions 테이블 INSERT
멱등: 이미 있는 id는 SKIP.

실행 (src/backend/ 에서):
    python -m api.scripts.seed_db
"""
import json
import sys
from pathlib import Path

# 프로젝트 루트를 sys.path에 추가
_SRC_BACKEND = Path(__file__).parent.parent.parent
sys.path.insert(0, str(_SRC_BACKEND))

from api.database import SessionLocal, init_db
from api.models.question import Question

SEED_PATH = _SRC_BACKEND / "korean_history_rag" / "output" / "seed.json"


def seed():
    if not SEED_PATH.exists():
        print(f"[ERROR] seed.json 없음: {SEED_PATH}")
        sys.exit(1)

    init_db()

    with open(SEED_PATH, encoding="utf-8") as f:
        records = json.load(f)

    db = SessionLocal()
    inserted = skipped = 0
    try:
        for r in records:
            if db.get(Question, r["id"]):
                skipped += 1
                continue
            q = Question(
                id           = r["id"],
                round        = r["round"],
                q_num        = r["q_num"],
                subject      = r.get("subject", "한국사"),
                exam_type    = r.get("exam_type", "심화"),
                stem         = r["stem"],
                choices      = r["choices"],
                score        = r.get("score", 1),
                answer       = r["answer"],
                answer_num   = r["answer_num"],
                answer_text  = r.get("answer_text", ""),
                era_tags     = r.get("era_tags", []),
                concept_tags = r.get("concept_tags", []),
                confusion_pairs = r.get("confusion_pairs"),
                explanation  = r.get("explanation", ""),
                memory_hint  = r.get("memory_hint", ""),
                source       = r.get("source", ""),
            )
            db.add(q)
            inserted += 1
        db.commit()
    finally:
        db.close()

    print(f"[seed_db] 완료 — inserted: {inserted}, skipped: {skipped}")


if __name__ == "__main__":
    seed()
