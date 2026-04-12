"""
api/services/_parse_exams_funcs.py
01_parse_exams.py 의 파싱 함수들을 API 서비스에서 재사용하기 위한 임포트 브리지.
01_parse_exams.py 를 직접 수정하지 않고 함수만 re-export.
"""
import sys
from pathlib import Path

# korean_history_rag 디렉토리를 sys.path 에 추가
_RAG_DIR = Path(__file__).parent.parent.parent.parent / "korean_history_rag"
if str(_RAG_DIR) not in sys.path:
    sys.path.insert(0, str(_RAG_DIR))

# 01_parse_exams 모듈에서 필요한 함수만 가져오기
# (모듈 이름에 숫자가 있으므로 importlib 사용)
import importlib.util as _ilu

_spec = _ilu.spec_from_file_location(
    "parse_exams_01",
    _RAG_DIR / "01_parse_exams.py",
)
_mod = _ilu.module_from_spec(_spec)
_spec.loader.exec_module(_mod)

parse_answer_sheet = _mod.parse_answer_sheet
parse_question_pdf  = _mod.parse_question_pdf
build_seed_records  = _mod.build_seed_records
extract_era_tags    = _mod.extract_era_tags
extract_concept_tags = _mod.extract_concept_tags
