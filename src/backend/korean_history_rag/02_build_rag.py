"""
02_build_rag.py
───────────────
seed.json → FAISS 벡터 인덱스 + BM25 인덱스 빌드

실행:
    python 02_build_rag.py

출력:
    output/rag/faiss.index     ← Dense 벡터 인덱스
    output/rag/metadata.json   ← ID → 문항 메타 매핑
    output/rag/bm25.pkl        ← BM25 희소 인덱스
"""

import json
import pickle
from pathlib import Path

import faiss
import numpy as np
from tqdm import tqdm
from rank_bm25 import BM25Okapi
from sentence_transformers import SentenceTransformer

# ─── 설정 ────────────────────────────────────────────────────
SEED_PATH  = Path("output/seed.json")
RAG_DIR    = Path("output/rag")
RAG_DIR.mkdir(parents=True, exist_ok=True)

# 한국어 특화 임베딩 모델 (무료, 로컬)
# 처음 실행 시 자동 다운로드 (~400MB)
MODEL_NAME = "jhgan/ko-sroberta-multitask"

FAISS_PATH    = RAG_DIR / "faiss.index"
METADATA_PATH = RAG_DIR / "metadata.json"
BM25_PATH     = RAG_DIR / "bm25.pkl"


# ─── 1. 데이터 로드 ───────────────────────────────────────────
def load_seed(path: Path) -> list[dict]:
    with open(path, "r", encoding="utf-8") as f:
        records = json.load(f)
    print(f"[로드] {len(records)}개 문항")
    return records


# ─── 2. Dense 임베딩 + FAISS ─────────────────────────────────
def build_faiss_index(records: list[dict], model: SentenceTransformer):
    """
    embedding_text를 벡터화 → FAISS IVFFlat 인덱스 생성
    """
    texts = [r["embedding_text"] for r in records]

    print(f"[임베딩] {len(texts)}개 문항 벡터화 중...")
    # batch_size=32로 VRAM/RAM 절약
    embeddings = model.encode(
        texts,
        batch_size=32,
        show_progress_bar=True,
        normalize_embeddings=True,  # 코사인 유사도용 L2 정규화
    )
    embeddings = np.array(embeddings, dtype="float32")

    dim = embeddings.shape[1]
    print(f"  임베딩 차원: {dim}")

    # 문항 수가 적을 때는 Flat, 많을 때는 IVFFlat 사용
    n = len(records)
    if n < 1000:
        index = faiss.IndexFlatIP(dim)  # Inner Product (= 코사인, L2 정규화 후)
        print(f"  인덱스 타입: FlatIP (문항 수 {n} < 1000)")
    else:
        nlist = min(100, n // 10)
        quantizer = faiss.IndexFlatIP(dim)
        index = faiss.IndexIVFFlat(quantizer, dim, nlist, faiss.METRIC_INNER_PRODUCT)
        index.train(embeddings)
        print(f"  인덱스 타입: IVFFlat (nlist={nlist})")

    index.add(embeddings)
    faiss.write_index(index, str(FAISS_PATH))
    print(f"  → {FAISS_PATH} 저장 ({index.ntotal}개 벡터)")

    return embeddings


# ─── 3. BM25 (희소 검색) ─────────────────────────────────────
def build_bm25_index(records: list[dict]):
    """
    한국어는 형태소 분석 없이 공백 토크나이징도 어느 정도 작동.
    고유명사(흥선대원군, 을미사변 등) 정확 매칭에 유리.
    """
    corpus = []
    for r in records:
        # 검색 대상: embedding_text + 보기 텍스트 합산
        choices_str = " ".join(r.get("choices", {}).values())
        text = r["embedding_text"] + " " + choices_str
        tokens = text.split()  # 공백 토크나이징
        corpus.append(tokens)

    bm25 = BM25Okapi(corpus)

    with open(BM25_PATH, "wb") as f:
        pickle.dump(bm25, f)

    print(f"  → {BM25_PATH} 저장")
    return bm25


# ─── 4. 메타데이터 저장 ──────────────────────────────────────
def save_metadata(records: list[dict]):
    """
    FAISS 인덱스 번호(0~N) → 문항 레코드 매핑
    검색 결과에서 원본 문항 복원에 사용
    """
    metadata = {
        str(i): {
            "id":           r["id"],
            "round":        r["round"],
            "q_num":        r["q_num"],
            "stem":         r["stem"],
            "choices":      r["choices"],
            "answer":       r["answer"],
            "answer_num":   r["answer_num"],
            "answer_text":  r["answer_text"],
            "score":        r["score"],
            "era_tags":     r["era_tags"],
            "concept_tags": r["concept_tags"],
            "explanation":  r["explanation"],
            "memory_hint":  r["memory_hint"],
            "source":       r["source"],
        }
        for i, r in enumerate(records)
    }

    with open(METADATA_PATH, "w", encoding="utf-8") as f:
        json.dump(metadata, f, ensure_ascii=False, indent=2)

    print(f"  → {METADATA_PATH} 저장 ({len(metadata)}개 항목)")


# ─── 5. 메인 ─────────────────────────────────────────────────
def main():
    if not SEED_PATH.exists():
        print(f"[ERROR] {SEED_PATH} 없음 → 01_parse_exams.py 먼저 실행하세요")
        return

    records = load_seed(SEED_PATH)

    # 임베딩 모델 로드
    print(f"\n[모델 로드] {MODEL_NAME}")
    print("  (첫 실행 시 ~400MB 다운로드, 이후 캐시 사용)")
    model = SentenceTransformer(MODEL_NAME)

    print("\n[FAISS 인덱스 빌드]")
    build_faiss_index(records, model)

    print("\n[BM25 인덱스 빌드]")
    build_bm25_index(records)

    print("\n[메타데이터 저장]")
    save_metadata(records)

    print(f"\n{'='*40}")
    print("RAG 인덱스 빌드 완료!")
    print(f"  {FAISS_PATH}")
    print(f"  {BM25_PATH}")
    print(f"  {METADATA_PATH}")


if __name__ == "__main__":
    main()
