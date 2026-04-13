from pathlib import Path

HERE        = Path("src/backend/api/services/graphrag.py").resolve()
BACKEND_DIR = HERE.parents[2]
RAG_BASE    = BACKEND_DIR / "korean_history_rag"
FAISS_PATH  = RAG_BASE / "output/rag/faiss.index"
GRAPH_PATH  = RAG_BASE / "output/ontology/graph.json"
BM25_PATH   = RAG_BASE / "output/rag/bm25.pkl"
META_PATH   = RAG_BASE / "output/rag/metadata.json"

print(f"HERE:        {HERE}")
print(f"BACKEND_DIR: {BACKEND_DIR}")
print(f"RAG_BASE:    {RAG_BASE}")
print()
print(f"FAISS 존재:  {FAISS_PATH.exists()} → {FAISS_PATH}")
print(f"GRAPH 존재:  {GRAPH_PATH.exists()} → {GRAPH_PATH}")
print(f"BM25  존재:  {BM25_PATH.exists()}  → {BM25_PATH}")
print(f"META  존재:  {META_PATH.exists()}  → {META_PATH}")
