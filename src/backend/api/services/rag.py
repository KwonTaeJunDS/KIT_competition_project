"""
services/rag.py — KoreanHistoryRAG 싱글톤 래퍼
03_query_test.py의 KoreanHistoryRAG를 절대경로로 임포트해 재사용.
"""
import importlib.util
import sys
from pathlib import Path

# korean_history_rag/ 패키지를 sys.path에 추가
_RAG_MODULE_DIR = Path(__file__).parent.parent.parent / "korean_history_rag"
if str(_RAG_MODULE_DIR) not in sys.path:
    sys.path.insert(0, str(_RAG_MODULE_DIR))

# 03_query_test.py를 importlib로 정상 로드
_spec = importlib.util.spec_from_file_location(
    "rag_engine",
    _RAG_MODULE_DIR / "03_query_test.py",
)
_rag_module = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_rag_module)

# 경로 상수를 절대경로로 교체 (KoreanHistoryRAG() 인스턴스화 전이므로 안전)
_RAG_DIR_ABS = _RAG_MODULE_DIR / "output" / "rag"
_rag_module.RAG_DIR       = _RAG_DIR_ABS
_rag_module.FAISS_PATH    = _RAG_DIR_ABS / "faiss.index"
_rag_module.METADATA_PATH = _RAG_DIR_ABS / "metadata.json"
_rag_module.BM25_PATH     = _RAG_DIR_ABS / "bm25.pkl"

KoreanHistoryRAG = _rag_module.KoreanHistoryRAG
ErrorAnalyzerBase = _rag_module.ErrorAnalyzer

_rag_instance: KoreanHistoryRAG | None = None


def get_rag() -> KoreanHistoryRAG:
    """싱글톤 — 앱 시작 시 1회 로드."""
    global _rag_instance
    if _rag_instance is None:
        _rag_instance = KoreanHistoryRAG()
    return _rag_instance
