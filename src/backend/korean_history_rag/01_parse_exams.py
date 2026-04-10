"""
01_parse_exams.py
─────────────────
한능검 심화 PDF (문제지 + 답지) → JSON seed 생성기

실행:
    python 01_parse_exams.py

출력:
    output/questions/{회차}.json   ← 회차별
    output/seed.json               ← 전체 통합본
"""

import re
import json
import uuid
from pathlib import Path

import pdfplumber

# ─── 경로 설정 ────────────────────────────────────────────────
RAW_DIR    = Path("data/raw")
OUTPUT_DIR = Path("output/questions")
SEED_PATH  = Path("output/seed.json")

OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
SEED_PATH.parent.mkdir(parents=True, exist_ok=True)


# ─── 1. 파일 페어 자동 탐지 ───────────────────────────────────
def find_exam_pairs(raw_dir: Path) -> list[dict]:
    """
    파일 네이밍 규칙:
        {회차}회_한국사_문제지_심화_.pdf
        {회차}회_한국사_답지_심화_.pdf
    """
    pairs = []
    for q_file in sorted(raw_dir.glob("*문제지*심화*.pdf")):
        # 회차 번호 추출
        m = re.match(r"(\d+)회", q_file.name)
        if not m:
            print(f"[SKIP] 회차 번호 파싱 실패: {q_file.name}")
            continue
        round_no = int(m.group(1))

        # 답지 파일 찾기
        a_file = raw_dir / f"{round_no}회_한국사_답지_심화_.pdf"
        if not a_file.exists():
            # 파일명 패턴이 다를 수 있으니 glob으로도 탐색
            candidates = list(raw_dir.glob(f"{round_no}회*답지*심화*.pdf"))
            a_file = candidates[0] if candidates else None

        if not a_file:
            print(f"[WARN] 답지 없음: {round_no}회 → 정답 없이 진행")

        pairs.append({"round": round_no, "question_pdf": q_file, "answer_pdf": a_file})

    return pairs


# ─── 2. 답지 파싱 ─────────────────────────────────────────────
def parse_answer_sheet(pdf_path: Path) -> dict[int, dict]:
    """
    반환: {문항번호: {"answer": "③", "answer_num": 3, "score": 2}, ...}
    """
    answers = {}
    if not pdf_path or not pdf_path.exists():
        return answers

    # ①②③④⑤ → 1~5 변환 테이블
    circle_map = {"①": 1, "②": 2, "③": 3, "④": 4, "⑤": 5}

    with pdfplumber.open(pdf_path) as pdf:
        text = "\n".join(p.extract_text() or "" for p in pdf.pages)

    # 패턴: "1    ③    1" (문항번호 / 정답원문자 / 배점)
    pattern = re.compile(
        r"(\d{1,2})\s+([①②③④⑤])\s+(\d)",
        re.MULTILINE
    )
    for m in pattern.finditer(text):
        q_num  = int(m.group(1))
        ans_ch = m.group(2)
        score  = int(m.group(3))
        answers[q_num] = {
            "answer":     ans_ch,
            "answer_num": circle_map.get(ans_ch, 0),
            "score":      score,
        }

    print(f"  [답지] {len(answers)}문항 파싱 완료")
    return answers


# ─── 3. 문제지 파싱 ───────────────────────────────────────────
CHOICE_PATTERN = re.compile(
    r"([①②③④⑤])\s+(.+?)(?=[①②③④⑤]|\Z)",
    re.DOTALL,
)
Q_HEADER_PATTERN = re.compile(
    r"(\d{1,2})\.\s+(.+?)(?=\[(\d)점\])",
    re.DOTALL,
)

def clean(text: str) -> str:
    """공백·제어문자 정리"""
    text = re.sub(r"\s+", " ", text)
    text = text.replace("\x08", "").strip()
    return text


def split_questions_raw(full_text: str) -> dict[int, str]:
    split_re = re.compile(r"(?m)^(\d{1,2})\.\s")
    positions = [(m.start(), int(m.group(1))) for m in split_re.finditer(full_text)]

    chunks = {}
    for i, (start, num) in enumerate(positions):
        end = positions[i + 1][0] if i + 1 < len(positions) else len(full_text)
        chunk = full_text[start:end]

        # 너무 짧은 청크(100자 미만)는 파싱 실패로 판단해서 건너뜀
        if len(chunk.strip()) < 100:
            continue

        chunks[num] = chunk

    return chunks


def extract_score(chunk: str) -> int:
    m = re.search(r"\[(\d)점\]", chunk)
    return int(m.group(1)) if m else 0


def extract_stem(chunk: str) -> str:
    """
    문항 번호·점수·보기·지문 박스를 제외한 질문 핵심 문장 추출.
    한능검 문제는 보통 "~~에 대한 설명으로 옳은 것은?" 형태.
    """
    # 보기(①~⑤) 이전 텍스트에서 질문 문장 추출
    before_choices = re.split(r"[①②③④⑤]", chunk)[0]
    # 문항번호+점수 제거
    before_choices = re.sub(r"^\d{1,2}\.\s*", "", before_choices)
    before_choices = re.sub(r"\[\d점\]", "", before_choices)
    return clean(before_choices)


def extract_choices(chunk: str) -> dict[str, str]:
    """① ~ ⑤ 보기 텍스트 추출"""
    choices = {}
    circle_labels = ["①", "②", "③", "④", "⑤"]
    parts = re.split(r"([①②③④⑤])", chunk)

    current_label = None
    for part in parts:
        if part in circle_labels:
            current_label = part
        elif current_label:
            choices[current_label] = clean(part)
            current_label = None

    return choices


def extract_era_tags(text: str) -> list[str]:
    era_keywords = {
        "선사":     ["구석기", "신석기", "청동기", "철기", "고인돌", "빗살무늬",
                     "민무늬", "뗀석기", "간석기", "움집", "탄화미", "반달 돌칼",
                     "흔암리", "가락바퀴", "뼈바늘"],
        "고조선":   ["고조선", "위만", "우거왕", "범금", "왕검성", "8조법",
                     "한무제", "섭하", "비왕"],
        "삼국":     ["고구려", "백제", "신라", "가야", "삼국", "진흥왕", "광개토",
                     "장수왕", "근초고왕", "성왕", "을지문덕", "살수", "안시성",
                     "연개소문", "김유신", "계백", "의자왕", "미천왕", "소수림왕",
                     "사출도", "서옥제", "민며느리", "욕살", "처려근지",
                     "정사암", "화백", "골품", "상수리", "담로"],
        "남북국":   ["통일신라", "발해", "무열왕", "문무왕", "신문왕", "경덕왕",
                     "장보고", "청해진", "대조영", "해동성국", "선종", "9산",
                     "독서삼품과", "원효", "의상", "혜초", "9서당", "10정",
                     "5경 15부", "주자감", "정혜공주",  "처용", "처용무", "처용 설화"],
        "고려":     ["고려", "왕건", "태조", "광종", "성종", "현종", "문종",
                     "무신정변", "삼별초", "몽골", "공민왕", "최씨정권",
                     "팔만대장경", "초조대장경", "귀주", "별무반", "윤관",
                     "서희", "강감찬", "묘청", "이자겸", "만적", "신돈",
                     "전민변정", "과전법", "쌍성총관부", "동녕부", "기철",
                     "공양왕", "현화사", "천태종", "조계종", "지눌", "의천",
                     "교정도감", "도방", "삼사", "식목도감", "음서",
                     "나전", "청자", "상감", "비변사",
                     "개경", "개성", "만월대", "국립 중앙 박물관"],
        "조선전기": ["태조", "태종", "세종", "세조", "성종", "연산군", "중종",
                     "명종", "선조", "임진왜란", "훈민정음", "경국대전",
                     "의정부", "6조", "사헌부", "사간원", "홍문관", "승정원",
                     "의금부", "한성부", "집현전", "경연", "직전법",
                     "공법", "4군 6진", "쓰시마", "계해약조", "삼포",
                     "사화", "무오", "갑자", "기묘", "을사", "훈구", "사림",
                     "서원", "향약", "소학", "이황", "이이", "조광조",
                     "간경도감", "칠정산", "측우기", "자격루", "거북선",
                     "비변사", "을묘왜변", "군적수포제", "비국", "주사"],
        "조선후기": ["광해군", "인조", "효종", "현종", "숙종", "영조", "정조",
                     "병자호란", "정묘호란", "탕평", "실학", "대동법", "균역법",
                     "홍경래", "환국", "붕당", "노론", "소론", "남인", "북인",
                     "공인", "상평통보", "금난전권", "신해통공", "도고",
                     "초량 왜관", "만상", "송상", "북학", "박지원", "박제가",
                     "정약용", "김정호", "세도정치", "삼정", "서원 철폐",
                     "흥선대원군", "당백전", "경복궁 중건", "척화비",
                     "병인양요", "신미양요", "탕평비", "규장각", "장용영",
                     "수원 화성", "초계문신", "금위영", "어영청", "훈련도감",
                     "변박", "왜관도", "민화", "세책", "산대놀이", "사의찬미",
                     "경신환국", "기사환국", "갑술환국", "보사공신",
                     "비변사", "속오군", "어영청", "총융청", "수어청", 
                     "비국", "주사", "비변사",
                    "에도 막부", "사로승구도", "통신사",
                    "조선통신사", "막부"],
        "근대":     ["강화도조약", "갑신정변", "갑오개혁", "을미사변", "아관파천",
                     "대한제국", "독립협회", "을사조약", "통감부", "헤이그",
                     "안중근", "이토", "의병", "애국계몽", "신민회",
                     "보안회", "국채보상", "만민공동회", "중추원",
                     "박문국", "한성순보", "기기창", "전환국", "광혜원",
                     "배재학당", "이화학당", "원산학사", "육영공원", "동문학",
                     "교육입국", "을미개혁", "건양", "단발령", "태양력",
                     "친위대", "진위대", "양전", "지계", "원수부",
                     "정족산성", "양헌수", "묄렌도르프", "임오군란",
                     "조선책략", "오페르트", "제너럴셔먼", "척화비",
                     "운요호", "강화도", "조·미수호통상조약", 
                     "조·일수호조규", "조일수호조규", "강화도 조약",
                     "거문도", "방곡령", "조·미", "한·일의정서",
                     "을사늑약", "정미7조약", "기유각서"],
        "일제강점기": ["일제", "강점", "3·1운동", "임시정부", "독립운동",
                      "신간회", "의열단", "한인애국단", "광복군", "창씨개명",
                      "국가총동원법", "토지조사", "산미증식", "문화통치",
                      "무단통치", "헌병경찰", "조선태형령", "회사령",
                      "동양척식", "조선식산은행", "나석주", "김원봉",
                      "윤봉길", "이봉창", "안창호", "신채호", "박은식",
                      "조소앙", "삼균주의", "한국독립군", "조선혁명군",
                      "양세봉", "지청천", "봉오동", "청산리", "간도참변",
                      "자유시", "훙커우", "형평운동", "물산장려", "민립대학",
                      "어린이날", "브나로드", "농촌진흥", "황국신민",
                      "국민학교", "징용", "징병", "공출", "애국반",
                    "회사령", "조선태형령", "토지조사령", "민립대학",
                      "6·10만세", "광주학생", "조선어학회"],
        "현대":     ["광복", "미소공동위원회", "단독정부", "6·25", "이승만",
                     "박정희", "전두환", "민주화", "직선제", "남북정상회담",
                     "반민특위", "농지개혁", "발췌개헌", "사사오입",
                     "4·19", "5·16", "유신", "긴급명령", "금융실명제",
                     "부마항쟁", "5·18", "6월항쟁", "남북기본합의서",
                     "한·중수교", "외환위기", "IMF", "햇볕정책", "개성공단",
                     "OECD", "FTA", "새마을", "포항제철", "전태일",
                     "YH무역", "조봉암", "진보당", "박종철", "이한열",
                     "보도지침", "호헌", "직선제", "양원제", "사사오입",
                     "6·25", "유엔군", "인천상륙", "서울올림픽",
                    "올림픽", "노벨", "햇볕", "금강산",
                    "국민교육헌장", "새마을운동", "10월유신",
                    "긴급조치", "통일주체국민회의"],
    }

    found = []
    for era, keywords in era_keywords.items():
        for kw in keywords:
            if kw in text:
                if era not in found:
                    found.append(era)
                break

    return found if found else ["미분류"]


def extract_concept_tags(text: str) -> list[str]:
    """주요 개념 태그 추출"""
    concept_keywords = {
        "왕권강화": ["왕권", "왕권 강화", "호족", "공신"],
        "대외관계": ["외교", "사신", "침략", "항쟁", "조공", "책봉"],
        "경제": ["토지", "조세", "상업", "화폐", "무역", "수취"],
        "문화": ["불교", "유교", "성리학", "실학", "서원", "문화유산"],
        "제도": ["제도", "관제", "법령", "기구", "설치"],
        "인물": ["왕", "장군", "학자", "의병", "독립운동가"],
        "사건": ["전쟁", "난", "항쟁", "운동", "사건", "의거"],
    }

    found = []
    for concept, keywords in concept_keywords.items():
        for kw in keywords:
            if kw in text:
                if concept not in found:
                    found.append(concept)
                break

    return found


def parse_question_pdf(pdf_path: Path) -> list[dict]:
    questions = []

    with pdfplumber.open(pdf_path) as pdf:
        full_text = ""
        for page in pdf.pages:
            w = page.width
            h = page.height
            # 왼쪽 컬럼 → 오른쪽 컬럼 순서로 이어 붙이기
            left  = page.crop((0,    0, w/2, h)).extract_text() or ""
            right = page.crop((w/2,  0, w,   h)).extract_text() or ""
            full_text += left + "\n" + right + "\n"

    chunks = split_questions_raw(full_text)
    print(f"  [문제지] {len(chunks)}문항 청크 분리")

    for q_num, chunk in sorted(chunks.items()):
        if q_num < 1 or q_num > 50:
            continue

        stem         = extract_stem(chunk)
        choices      = extract_choices(chunk)
        score        = extract_score(chunk)
        era_tags     = extract_era_tags(stem + " " + " ".join(choices.values()))
        concept_tags = extract_concept_tags(stem + " " + " ".join(choices.values()))

        questions.append({
            "q_num":        q_num,
            "stem":         stem,
            "choices":      choices,
            "score":        score,
            "era_tags":     era_tags,
            "concept_tags": concept_tags,
            "raw_chunk":    clean(chunk),
        })

    return questions


# ─── 4. 문항 + 정답 병합 → seed 레코드 생성 ──────────────────
CIRCLE_TO_NUM = {"①": 1, "②": 2, "③": 3, "④": 4, "⑤": 5}


def build_seed_records(round_no: int, questions: list[dict], answers: dict) -> list[dict]:
    records = []
    for q in questions:
        num = q["q_num"]
        ans = answers.get(num, {})

        answer_ch  = ans.get("answer", "")
        answer_num = ans.get("answer_num", 0)
        score      = ans.get("score") or q["score"]
        choices    = q["choices"]

        # 정답 텍스트 (보기에서 꺼내기)
        answer_text = choices.get(answer_ch, "")

        # 혼동 가능 보기 목록 (정답 제외한 나머지)
        confusion_choices = {k: v for k, v in choices.items() if k != answer_ch}

        record = {
            "id":              str(uuid.uuid4()),
            "round":           round_no,
            "q_num":           num,
            "subject":         "한국사",
            "exam_type":       "심화",

            # 문제
            "stem":            q["stem"],
            "choices":         choices,
            "score":           score,

            # 정답
            "answer":          answer_ch,
            "answer_num":      answer_num,
            "answer_text":     answer_text,

            # 태그 (온톨로지 연결용)
            "era_tags":        q["era_tags"],
            "concept_tags":    q["concept_tags"],

            # RAG 임베딩용 통합 텍스트
            "embedding_text":  _build_embedding_text(q, answer_ch, answer_text),

            # 혼동 쌍 (오답 분석용)
            "confusion_pairs": confusion_choices,

            # 해설 (현재는 빈 값 → 이후 수동 보완 또는 LLM 생성)
            "explanation":     "",
            "memory_hint":     "",

            # 메타
            "source":          f"제{round_no}회_한국사능력검정시험_심화",
        }
        records.append(record)

    return records


def _build_embedding_text(q: dict, answer_ch: str, answer_text: str) -> str:
    """
    RAG 검색 품질을 높이기 위해 문항 정보를 하나의 문장으로 압축.
    예: "선사시대 청동기 시대 생활 모습 정답: 많은 인력을 동원하여 고인돌을 축조하였다."
    """
    era_str     = " ".join(q["era_tags"])
    concept_str = " ".join(q["concept_tags"])
    stem_short  = q["stem"][:120]  # 너무 길면 임베딩 품질 저하
    return f"{era_str} {concept_str} {stem_short} 정답: {answer_text}"


# ─── 5. 메인 실행 ─────────────────────────────────────────────
def main():
    pairs = find_exam_pairs(RAW_DIR)
    if not pairs:
        print(f"[ERROR] {RAW_DIR}에 PDF 파일이 없습니다.")
        print("  네이밍 규칙: {회차}회_한국사_문제지_심화_.pdf")
        return

    all_records = []

    for pair in pairs:
        round_no = pair["round"]
        print(f"\n{'─'*40}")
        print(f"[{round_no}회] 처리 시작")

        # 답지 파싱
        answers = parse_answer_sheet(pair["answer_pdf"]) if pair["answer_pdf"] else {}

        # 문제지 파싱
        questions = parse_question_pdf(pair["question_pdf"])

        # 병합
        records = build_seed_records(round_no, questions, answers)

        # 회차별 저장
        out_path = OUTPUT_DIR / f"{round_no:02d}회.json"
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump(records, f, ensure_ascii=False, indent=2)

        print(f"  → {out_path} 저장 ({len(records)}문항)")
        all_records.extend(records)

    # 전체 통합 seed 저장
    with open(SEED_PATH, "w", encoding="utf-8") as f:
        json.dump(all_records, f, ensure_ascii=False, indent=2)

    print(f"\n{'='*40}")
    print(f"완료: 총 {len(all_records)}문항 → {SEED_PATH}")
    print(f"회차별 파일: {OUTPUT_DIR}/")

    # 샘플 출력
    if all_records:
        sample = all_records[0]
        print(f"\n[샘플 레코드 — {sample['round']}회 {sample['q_num']}번]")
        print(f"  stem:          {sample['stem'][:60]}...")
        print(f"  answer:        {sample['answer']} ({sample['answer_text'][:40]})")
        print(f"  era_tags:      {sample['era_tags']}")
        print(f"  embedding_text:{sample['embedding_text'][:80]}...")


if __name__ == "__main__":
    main()
