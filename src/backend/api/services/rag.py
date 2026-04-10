"""
services/rag.py — KoreanHistoryRAG 싱글톤 래퍼
03_query_test.py의 KoreanHistoryRAG를 절대경로로 임포트해 재사용.
"""
import sys
from pathlib import Path

# korean_history_rag/ 패키지를 sys.path에 추가
_RAG_MODULE_DIR = Path(__file__).parent.parent.parent / "korean_history_rag"
if str(_RAG_MODULE_DIR) not in sys.path:
    sys.path.insert(0, str(_RAG_MODULE_DIR))

# RAG 인덱스 경로를 절대경로로 패치
import importlib
import types

# 03_query_test.py를 동적으로 로드하되 RAG_DIR만 수정
_rag_source = (_RAG_MODULE_DIR / "03_query_test.py").read_text(encoding="utf-8")
_rag_module = types.ModuleType("rag_engine")
_rag_module.__file__ = str(_RAG_MODULE_DIR / "03_query_test.py")

# RAG_DIR을 절대경로로 교체
_rag_source = _rag_source.replace(
    'RAG_DIR       = Path("output/rag")',
    f'RAG_DIR       = Path(r"{_RAG_MODULE_DIR / "output" / "rag"}")',
)
exec(compile(_rag_source, _rag_module.__file__, "exec"), _rag_module.__dict__)

KoreanHistoryRAG = _rag_module.KoreanHistoryRAG
ErrorAnalyzerBase = _rag_module.ErrorAnalyzer

_rag_instance: KoreanHistoryRAG | None = None


def get_rag() -> KoreanHistoryRAG:
    """싱글톤 — 앱 시작 시 1회 로드."""
    global _rag_instance
    if _rag_instance is None:
        _rag_instance = KoreanHistoryRAG()
    return _rag_instance
