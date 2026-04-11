"""
check_keyword_coverage.py
─────────────────────────
KEYWORD_NODE_MAP의 키워드가 seed.json에서
stem/choices/answer_text 중 어디에 나오는지 확인

실행:
    python check_keyword_coverage.py
"""

import json
from pathlib import Path
from collections import defaultdict

SEED_PATH = Path("output/seed.json")

# build_graphrag.py와 동일한 맵
KEYWORD_NODE_MAP = {
    "흥선대원군": "Person", "김옥균": "Person", "전봉준": "Person",
    "을지문덕": "Person", "이순신": "Person", "광개토대왕": "Person",
    "세종": "Person", "정약용": "Person", "안중근": "Person",
    "윤봉길": "Person", "이봉창": "Person", "박지원": "Person",
    "박제가": "Person", "양세봉": "Person", "지청천": "Person",
    "신채호": "Person", "박은식": "Person", "김구": "Person",
    "일연": "Person", "김부식": "Person", "이승휴": "Person",
    "임진왜란": "Event", "병자호란": "Event", "갑신정변": "Event",
    "갑오개혁": "Event", "3·1운동": "Event", "동학농민운동": "Event",
    "임오군란": "Event", "을미사변": "Event", "6·25": "Event",
    "4·19": "Event", "5·16": "Event", "5·18": "Event",
    "봉오동전투": "Event", "청산리대첩": "Event", "병인양요": "Event",
    "신미양요": "Event",
    "서원철폐": "Concept", "대동법": "Concept", "균역법": "Concept",
    "탕평책": "Concept", "훈민정음": "Concept", "경국대전": "Concept",
    "과전법": "Concept", "직전법": "Concept", "골품제": "Concept",
    "화백제도": "Concept", "토지조사사업": "Concept",
    "신간회": "Group", "의열단": "Group", "한인애국단": "Group",
    "별무반": "Group", "삼별초": "Group", "광복군": "Group",
    "동학농민군": "Group", "독립협회": "Group", "보안회": "Group",
    "팔만대장경": "Artifact", "직지심체요절": "Artifact",
    "첨성대": "Artifact", "경복궁": "Artifact", "수원화성": "Artifact",
    "강화도": "Place", "한성": "Place", "평양": "Place",
    "개성": "Place", "부산": "Place", "제주도": "Place",
    "삼국사기": "Document", "삼국유사": "Document",
    "북학의": "Document", "열하일기": "Document",
    "목민심서": "Document", "동의보감": "Document",
}


def main():
    data = json.load(open(SEED_PATH, encoding="utf-8"))
    print(f"총 문항: {len(data)}개\n")

    # 키워드별로 stem/choices/answer_text 중 어디에 나오는지 분류
    result = defaultdict(lambda: {
        "stem": [], "choices": [], "answer_text": [], "없음": []
    })

    for record in data:
        stem        = record.get("stem", "")
        choices_str = " ".join(record.get("choices", {}).values())
        answer_text = record.get("answer_text", "")
        r_id        = f"{record['round']}회 {record['q_num']}번"

        for keyword in KEYWORD_NODE_MAP:
            in_stem   = keyword in stem
            in_choices = keyword in choices_str
            in_answer = keyword in answer_text

            if in_stem:
                result[keyword]["stem"].append(r_id)
            elif in_choices:
                result[keyword]["choices"].append(r_id)
            elif in_answer:
                result[keyword]["answer_text"].append(r_id)

    # 결과 출력
    print("─" * 60)
    print(f"{'키워드':<16} {'타입':<10} {'stem':<6} {'choices':<8} {'answer':<8} {'합계'}")
    print("─" * 60)

    found_total    = 0
    not_found      = []

    for keyword, node_type in KEYWORD_NODE_MAP.items():
        s = len(result[keyword]["stem"])
        c = len(result[keyword]["choices"])
        a = len(result[keyword]["answer_text"])
        total = s + c + a

        if total == 0:
            not_found.append(keyword)
        else:
            found_total += 1
            print(f"  {keyword:<16} {node_type:<10} {s:<6} {c:<8} {a:<8} {total}")

    print("─" * 60)
    print(f"\n발견된 키워드: {found_total}개 / 전체 {len(KEYWORD_NODE_MAP)}개")

    if not_found:
        print(f"\n[seed.json에서 한 번도 안 나온 키워드: {len(not_found)}개]")
        for kw in not_found:
            print(f"  - {kw} ({KEYWORD_NODE_MAP[kw]})")

    # stem에 없고 choices/answer_text에만 있는 것 → 온톨로지 누락 원인
    stem_missing = []
    for keyword in KEYWORD_NODE_MAP:
        s = len(result[keyword]["stem"])
        c = len(result[keyword]["choices"])
        a = len(result[keyword]["answer_text"])
        if s == 0 and (c > 0 or a > 0):
            stem_missing.append((keyword, c, a))

    if stem_missing:
        print(f"\n[stem에는 없고 choices/answer_text에만 있는 키워드: {len(stem_missing)}개]")
        print("→ 이것들이 온톨로지에서 누락된 원인입니다.")
        print(f"  {'키워드':<16} {'choices':<10} {'answer_text'}")
        print("  " + "─" * 40)
        for kw, c, a in stem_missing:
            print(f"  {kw:<16} {c:<10} {a}")

    # 흥선대원군 상세 확인
    print(f"\n[흥선대원군 상세]")
    for record in data:
        stem        = record.get("stem", "")
        choices_str = " ".join(record.get("choices", {}).values())
        answer_text = record.get("answer_text", "")
        if "흥선대원군" in stem + choices_str + answer_text:
            loc = []
            if "흥선대원군" in stem:        loc.append("stem")
            if "흥선대원군" in choices_str:  loc.append("choices")
            if "흥선대원군" in answer_text:  loc.append("answer_text")
            print(f"  [{record['round']}회 {record['q_num']}번] "
                  f"위치: {loc} | stem: {stem[:50]}...")


if __name__ == "__main__":
    main()
