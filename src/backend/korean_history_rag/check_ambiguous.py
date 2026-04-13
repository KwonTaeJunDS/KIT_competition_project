"""
check_ambiguous.py
──────────────────
ambiguous_nodes.json 분석 및 패턴 분류

실행:
    python check_ambiguous.py

출력:
    터미널: 타입별 분포 + 패턴별 분류
    output/ontology/ambiguous_review.json  ← 진짜 검토 필요한 것만
"""

import json
import re
from pathlib import Path
from collections import Counter

AMBIGUOUS_PATH = Path("output/ontology/ambiguous_nodes.json")
REVIEW_PATH    = Path("output/ontology/ambiguous_review.json")

# ─── 자동 필터 규칙 ───────────────────────────────────────────

# A. 정답 텍스트가 통째로 들어간 경우 (길고 조사 포함)
def is_answer_text_noise(name: str) -> bool:
    if len(name) > 12:
        return True
    noise_endings = [
        "하였다", "있었다", "시켰다", "되었다",
        "하였으며", "이었다", "였다", "한다",
        "하더라", "이라", "에서", "으로",
        "하는", "하는것", "창설하였다", "설립하였다",
    ]
    if any(name.endswith(s) for s in noise_endings):
        return True
    # 괄호/기호 포함
    if re.search(r"[\(\)ㄱ-ㅎ\-]", name):
        return True
    return False

# B. 패턴이 엉뚱한 단어를 잡은 경우 (블랙리스트)
BLACKLIST = {
    "이/가", "을/를", "은/는", "와/과", "로/으로",
    "하여", "하고", "하였", "되어", "이다", "있다",
    "것은", "것이", "다음", "아래", "문항", "보기",
    "정답", "해설", "시험", "문제", "학습",
    "가장", "모두", "옳은", "옳지", "않은",
    "시기", "이후", "이전", "당시", "현재",
    "국가", "사회", "경제", "문화", "정치",
    "활동", "정책", "제도", "사건", "인물",
}

def is_blacklist(name: str) -> bool:
    return name in BLACKLIST or len(name) <= 1

# C. 숫자/특수문자만 있는 경우
def is_noise_pattern(name: str) -> bool:
    if re.fullmatch(r"[\d\s\-\·\.]+", name):
        return True
    if re.fullmatch(r"[가-힣]{1}", name):
        return True
    return False


# ─── 분류 ─────────────────────────────────────────────────────

def classify(node: dict) -> str:
    name = node["name"]
    if is_blacklist(name):
        return "A_블랙리스트"
    if is_answer_text_noise(name):
        return "B_정답텍스트노이즈"
    if is_noise_pattern(name):
        return "C_노이즈패턴"
    return "D_진짜검토필요"


def main():
    if not AMBIGUOUS_PATH.exists():
        print(f"[ERROR] {AMBIGUOUS_PATH} 없음 → build_graphrag.py 먼저 실행")
        return

    data = json.load(open(AMBIGUOUS_PATH, encoding="utf-8"))
    print(f"총 ambiguous 노드: {len(data)}개\n")

    # 타입별 분포
    print("─" * 40)
    print("[타입별 분포]")
    types = Counter(d["type"] for d in data)
    for t, c in types.most_common():
        print(f"  {t:<12}: {c}개")

    # 패턴별 분류
    classified: dict[str, list] = {
        "A_블랙리스트":       [],
        "B_정답텍스트노이즈": [],
        "C_노이즈패턴":       [],
        "D_진짜검토필요":     [],
    }
    for node in data:
        cat = classify(node)
        classified[cat].append(node)

    print("\n─" * 40)
    print("[패턴별 분류 결과]")
    print(f"  A. 블랙리스트 (자동 제거 가능):      {len(classified['A_블랙리스트'])}개")
    print(f"  B. 정답텍스트 노이즈 (자동 제거):    {len(classified['B_정답텍스트노이즈'])}개")
    print(f"  C. 노이즈 패턴 (자동 제거):          {len(classified['C_노이즈패턴'])}개")
    print(f"  D. 진짜 검토 필요:                   {len(classified['D_진짜검토필요'])}개")

    # D 샘플 출력
    real_review = classified["D_진짜검토필요"]
    print(f"\n─" * 40)
    print(f"[D. 진짜 검토 필요 — 상위 30개]")
    print(f"{'이름':<20} {'현재타입':<12} {'confidence'}")
    print("─" * 45)
    for node in sorted(real_review, key=lambda x: x["confidence"])[:30]:
        print(f"  {node['name']:<20} {node['type']:<12} {node['confidence']:.2f}")

    # D만 저장
    with open(REVIEW_PATH, "w", encoding="utf-8") as f:
        json.dump(real_review, f, ensure_ascii=False, indent=2)

    print(f"\n─" * 40)
    print(f"→ 실제 검토 필요: {len(real_review)}개")
    print(f"→ {REVIEW_PATH} 저장 완료")
    print(f"   이 파일만 열어서 type 수정하면 됩니다.")

    # A+B+C 자동 제거 목록 요약
    auto_remove = (
        classified["A_블랙리스트"] +
        classified["B_정답텍스트노이즈"] +
        classified["C_노이즈패턴"]
    )
    print(f"\n→ 자동 제거 가능: {len(auto_remove)}개")
    print(f"   build_graphrag.py 재실행 시 자동 반영됩니다.")


if __name__ == "__main__":
    main()
