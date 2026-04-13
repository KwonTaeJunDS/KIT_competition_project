"""
services/judge.py — 정답 판정
student_answer ("①"~"⑤") 를 정규화 후 정답과 비교.
"""

CIRCLE_MAP = {"①": 1, "②": 2, "③": 3, "④": 4, "⑤": 5}
NUM_MAP    = {1: "①", 2: "②", 3: "③", 4: "④", 5: "⑤"}

# 숫자 문자열("1"~"5")도 허용
_DIGIT_MAP = {"1": "①", "2": "②", "3": "③", "4": "④", "5": "⑤"}


def normalize_answer(raw: str) -> str:
    """
    "①", "1", "  ① " 등을 표준 "①" 형식으로 정규화.
    인식 불가 시 raw 그대로 반환.
    """
    cleaned = raw.strip()
    if cleaned in CIRCLE_MAP:
        return cleaned
    if cleaned in _DIGIT_MAP:
        return _DIGIT_MAP[cleaned]
    return cleaned


def judge(answer: str, student_answer: str) -> tuple[bool, str, int]:
    """
    (is_correct, normalized_student_answer, student_answer_num) 반환.
    answer: DB의 정답 ("①"~"⑤")
    student_answer: 학생 제출값 (정규화 전)
    """
    normalized = normalize_answer(student_answer)
    is_correct = normalized == answer
    num = CIRCLE_MAP.get(normalized, 0)
    return is_correct, normalized, num
