"""
build_graphrag.py
─────────────────
PDF (문제지 + 답지) → GraphRAG 전체 파이프라인

입력:
    data/raw/{회차}회_한국사_문제지_심화_.pdf
    data/raw/{회차}회_한국사_답지_심화_.pdf

출력:
    output/seed.json                     ← 파싱된 문항 데이터
    output/rag/faiss.index               ← 벡터 인덱스
    output/rag/bm25.pkl                  ← BM25 인덱스
    output/rag/metadata.json             ← 문항 메타
    output/ontology/graph.json           ← 온톨로지 그래프
    output/ontology/nodes.json           ← 노드 목록
    output/ontology/edges.json           ← 엣지 목록
    output/ontology/ambiguous_nodes.json ← 검토 필요 노드
    output/ontology/ontology.html        ← pyvis 시각화

실행:
    python build_graphrag.py

참고:
    ONTOLOGY_SCHEMA.md
"""

import re
import json
import uuid
import pickle
from pathlib import Path

import pdfplumber
import faiss
import numpy as np
from tqdm import tqdm
from rank_bm25 import BM25Okapi
from sentence_transformers import SentenceTransformer
import networkx as nx

try:
    from pyvis.network import Network
    PYVIS_AVAILABLE = True
except ImportError:
    PYVIS_AVAILABLE = False
    print("[WARN] pyvis 없음 → pip install pyvis")

# ─── 경로 설정 ────────────────────────────────────────────────
RAW_DIR      = Path("data/raw")
OUTPUT_DIR   = Path("output")
Q_DIR        = OUTPUT_DIR / "questions"
SEED_PATH    = OUTPUT_DIR / "seed.json"
RAG_DIR      = OUTPUT_DIR / "rag"
ONTOLOGY_DIR = OUTPUT_DIR / "ontology"

for d in [Q_DIR, RAG_DIR, ONTOLOGY_DIR]:
    d.mkdir(parents=True, exist_ok=True)

MODEL_NAME = "jhgan/ko-sroberta-multitask"

# ─────────────────────────────────────────────────────────────
# STEP 1. PDF 파싱
# ─────────────────────────────────────────────────────────────

CIRCLE_MAP = {"①": 1, "②": 2, "③": 3, "④": 4, "⑤": 5}

def find_exam_pairs() -> list[dict]:
    pairs = []
    for q_file in sorted(RAW_DIR.glob("*문제지*심화*.pdf")):
        m = re.match(r"(\d+)회", q_file.name)
        if not m:
            print(f"  [SKIP] 회차 파싱 실패: {q_file.name}")
            continue
        round_no = int(m.group(1))
        candidates = list(RAW_DIR.glob(f"{round_no}회*답지*심화*.pdf"))
        a_file = candidates[0] if candidates else None
        if not a_file:
            candidates = list(RAW_DIR.glob(f"{round_no}회*정답*심화*.pdf"))
            a_file = candidates[0] if candidates else None
        pairs.append({"round": round_no, "question_pdf": q_file, "answer_pdf": a_file})
    return pairs


def parse_answer_sheet(pdf_path: Path) -> dict[int, dict]:
    answers = {}
    if not pdf_path or not pdf_path.exists():
        return answers
    with pdfplumber.open(pdf_path) as pdf:
        text = "\n".join(p.extract_text() or "" for p in pdf.pages)
    pattern = re.compile(r"(\d{1,2})\s+([①②③④⑤])\s+(\d)", re.MULTILINE)
    for m in pattern.finditer(text):
        q_num = int(m.group(1))
        ans_ch = m.group(2)
        score = int(m.group(3))
        answers[q_num] = {
            "answer":     ans_ch,
            "answer_num": CIRCLE_MAP.get(ans_ch, 0),
            "score":      score,
        }
    print(f"    답지: {len(answers)}문항")
    return answers


def clean(text: str) -> str:
    text = re.sub(r"\s+", " ", text)
    return text.replace("\x08", "").strip()


def split_questions_raw(full_text: str) -> dict[int, str]:
    split_re = re.compile(r"(?m)^(\d{1,2})\.\s")
    positions = [(m.start(), int(m.group(1))) for m in split_re.finditer(full_text)]
    chunks = {}
    for i, (start, num) in enumerate(positions):
        end = positions[i + 1][0] if i + 1 < len(positions) else len(full_text)
        chunk = full_text[start:end]
        if len(chunk.strip()) < 100:
            continue
        chunks[num] = chunk
    return chunks


def extract_score(chunk: str) -> int:
    m = re.search(r"\[(\d)점\]", chunk)
    return int(m.group(1)) if m else 0


def extract_stem(chunk: str) -> str:
    before_choices = re.split(r"[①②③④⑤]", chunk)[0]
    before_choices = re.sub(r"^\d{1,2}\.\s*", "", before_choices)
    before_choices = re.sub(r"\[\d점\]", "", before_choices)
    return clean(before_choices)


def extract_choices(chunk: str) -> dict[str, str]:
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
        "선사":       ["구석기", "신석기", "청동기", "철기", "고인돌", "빗살무늬",
                       "민무늬", "뗀석기", "간석기", "움집", "탄화미", "반달 돌칼",
                       "흔암리", "가락바퀴", "뼈바늘"],
        "고조선":     ["고조선", "위만", "우거왕", "범금", "왕검성", "8조법",
                       "한무제", "섭하", "비왕"],
        "삼국":       ["고구려", "백제", "신라", "가야", "삼국", "진흥왕", "광개토",
                       "장수왕", "근초고왕", "성왕", "을지문덕", "살수", "안시성",
                       "연개소문", "김유신", "계백", "의자왕", "사출도", "서옥제",
                       "민며느리", "욕살", "처려근지", "정사암", "화백", "골품",
                       "상수리", "담로"],
        "남북국":     ["통일신라", "발해", "무열왕", "문무왕", "신문왕", "경덕왕",
                       "장보고", "청해진", "대조영", "해동성국", "선종", "9산",
                       "독서삼품과", "원효", "의상", "혜초", "9서당", "10정",
                       "5경 15부", "주자감", "정혜공주", "서시", "남시",
                       "촌락 문서", "민정문서", "처용"],
        "고려":       ["고려", "왕건", "태조", "광종", "성종", "현종", "문종",
                       "무신정변", "삼별초", "몽골", "공민왕", "최씨정권",
                       "팔만대장경", "초조대장경", "귀주", "별무반", "윤관",
                       "서희", "강감찬", "묘청", "이자겸", "만적", "신돈",
                       "전민변정", "과전법", "쌍성총관부", "동녕부", "기철",
                       "공양왕", "현화사", "천태종", "조계종", "지눌", "의천",
                       "교정도감", "도방", "나전", "청자", "상감", "비국", "주사",
                       "개경", "개성", "은진 미륵", "관촉사"],
        "조선전기":   ["태조", "태종", "세종", "세조", "성종", "연산군", "중종",
                       "명종", "선조", "임진왜란", "훈민정음", "경국대전",
                       "의정부", "6조", "사헌부", "사간원", "홍문관", "승정원",
                       "의금부", "집현전", "경연", "직전법", "공법", "4군 6진",
                       "쓰시마", "계해약조", "삼포", "사화", "무오", "갑자",
                       "기묘", "을사", "훈구", "사림", "서원", "향약", "소학",
                       "이황", "이이", "조광조", "간경도감", "측우기", "거북선",
                       "비변사", "민무구", "민무질"],
        "조선후기":   ["광해군", "인조", "효종", "현종", "숙종", "영조", "정조",
                       "병자호란", "정묘호란", "탕평", "실학", "대동법", "균역법",
                       "홍경래", "환국", "붕당", "노론", "소론", "남인", "북인",
                       "공인", "상평통보", "금난전권", "신해통공", "도고",
                       "초량 왜관", "만상", "송상", "북학", "박지원", "박제가",
                       "정약용", "김정호", "세도정치", "삼정", "서원 철폐",
                       "흥선대원군", "당백전", "경복궁 중건", "척화비",
                       "병인양요", "신미양요", "탕평비", "규장각", "장용영",
                       "수원 화성", "초계문신", "금위영", "어영청", "훈련도감",
                       "경신환국", "기사환국", "갑술환국", "보사공신",
                       "에도 막부", "사로승구도", "통신사", "비변사"],
        "근대":       ["강화도조약", "갑신정변", "갑오개혁", "을미사변", "아관파천",
                       "대한제국", "독립협회", "을사조약", "통감부", "헤이그",
                       "안중근", "이토", "의병", "애국계몽", "신민회",
                       "보안회", "국채보상", "만민공동회", "중추원",
                       "박문국", "한성순보", "기기창", "전환국", "광혜원",
                       "배재학당", "이화학당", "원산학사", "육영공원", "동문학",
                       "교육입국", "을미개혁", "건양", "단발령", "태양력",
                       "친위대", "진위대", "양전", "지계", "원수부",
                       "정족산성", "양헌수", "묄렌도르프", "임오군란",
                       "조선책략", "오페르트", "운요호", "동학 농민군",
                       "동학농민", "전봉준", "황토현", "우금치", "집강소"],
        "일제강점기": ["일제", "강점", "3·1운동", "임시정부", "독립운동",
                       "신간회", "의열단", "한인애국단", "광복군", "창씨개명",
                       "국가총동원법", "토지조사", "산미증식", "문화통치",
                       "무단통치", "헌병경찰", "조선태형령", "회사령",
                       "동양척식", "조선식산은행", "나석주", "김원봉",
                       "윤봉길", "이봉창", "안창호", "신채호", "박은식",
                       "조소앙", "삼균주의", "한국독립군", "조선혁명군",
                       "양세봉", "지청천", "봉오동", "청산리", "간도참변",
                       "자유시", "훙커우", "형평운동", "물산장려", "민립대학",
                       "어린이날", "농촌진흥", "황국신민", "징용", "징병",
                       "공출", "애국반", "경성", "미쓰코시"],
        "현대":       ["광복", "미소공동위원회", "단독정부", "6·25", "이승만",
                       "박정희", "전두환", "민주화", "직선제", "남북정상회담",
                       "반민특위", "농지개혁", "발췌개헌", "사사오입",
                       "4·19", "5·16", "유신", "긴급명령", "금융실명제",
                       "부마항쟁", "5·18", "6월항쟁", "남북기본합의서",
                       "한·중수교", "외환위기", "IMF", "햇볕정책", "개성공단",
                       "OECD", "FTA", "새마을", "포항제철", "전태일",
                       "YH무역", "조봉암", "진보당", "박종철", "이한열",
                       "보도지침", "호헌", "양원제", "6·25", "유엔군",
                       "서울올림픽", "올림픽", "노벨", "국민교육헌장"],
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
    concept_keywords = {
        "왕권강화": ["왕권", "왕권 강화", "호족", "공신"],
        "대외관계": ["외교", "사신", "침략", "항쟁", "조공", "책봉"],
        "경제":     ["토지", "조세", "상업", "화폐", "무역", "수취"],
        "문화":     ["불교", "유교", "성리학", "실학", "서원", "문화유산"],
        "제도":     ["제도", "관제", "법령", "기구", "설치"],
        "인물":     ["왕", "장군", "학자", "의병", "독립운동가"],
        "사건":     ["전쟁", "난", "항쟁", "운동", "사건", "의거"],
    }
    found = []
    for concept, keywords in concept_keywords.items():
        for kw in keywords:
            if kw in text:
                if concept not in found:
                    found.append(concept)
                break
    return found


def build_embedding_text(stem: str, era_tags: list, answer_text: str) -> str:
    era_str = " ".join(era_tags)
    return f"{era_str} {stem[:120]} 정답: {answer_text}"


def parse_question_pdf(pdf_path: Path) -> list[dict]:
    with pdfplumber.open(pdf_path) as pdf:
        full_text = ""
        for page in pdf.pages:
            w = page.width
            h = page.height
            left  = page.crop((0, 0, w/2, h)).extract_text() or ""
            right = page.crop((w/2, 0, w, h)).extract_text() or ""
            full_text += left + "\n" + right + "\n"

    chunks = split_questions_raw(full_text)
    print(f"    문제지: {len(chunks)}문항")

    questions = []
    for q_num, chunk in sorted(chunks.items()):
        if q_num < 1 or q_num > 50:
            continue
        stem         = extract_stem(chunk)
        choices      = extract_choices(chunk)
        score        = extract_score(chunk)
        era_tags     = extract_era_tags(stem + " " + " ".join(choices.values()))
        concept_tags = extract_concept_tags(stem + " " + " ".join(choices.values()))
        questions.append({
            "q_num": q_num, "stem": stem, "choices": choices,
            "score": score, "era_tags": era_tags,
            "concept_tags": concept_tags, "raw_chunk": clean(chunk),
        })
    return questions


def build_seed_records(round_no: int, questions: list, answers: dict) -> list[dict]:
    records = []
    num_map = {1: "①", 2: "②", 3: "③", 4: "④", 5: "⑤"}
    for q in questions:
        num       = q["q_num"]
        ans       = answers.get(num, {})
        answer_ch = ans.get("answer", "")
        answer_num = ans.get("answer_num", 0)
        score     = ans.get("score") or q["score"]
        choices   = q["choices"]
        answer_text = choices.get(answer_ch, "")
        confusion_choices = {k: v for k, v in choices.items() if k != answer_ch}
        record = {
            "id":             str(uuid.uuid4()),
            "round":          round_no,
            "q_num":          num,
            "subject":        "한국사",
            "exam_type":      "심화",
            "stem":           q["stem"],
            "choices":        choices,
            "score":          score,
            "answer":         answer_ch,
            "answer_num":     answer_num,
            "answer_text":    answer_text,
            "era_tags":       q["era_tags"],
            "concept_tags":   q["concept_tags"],
            "embedding_text": build_embedding_text(
                q["stem"], q["era_tags"], answer_text
            ),
            "confusion_pairs": confusion_choices,
            "explanation":    "",
            "memory_hint":    "",
            "source":         f"제{round_no}회_한국사능력검정시험_심화",
        }
        records.append(record)
    return records


def step1_parse(pairs: list) -> list[dict]:
    print("\n" + "="*50)
    print("STEP 1. PDF 파싱")
    print("="*50)
    all_records = []
    for pair in pairs:
        round_no = pair["round"]
        print(f"\n[{round_no}회]")
        answers   = parse_answer_sheet(pair["answer_pdf"]) if pair["answer_pdf"] else {}
        questions = parse_question_pdf(pair["question_pdf"])
        records   = build_seed_records(round_no, questions, answers)
        out_path  = Q_DIR / f"{round_no:02d}회.json"
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump(records, f, ensure_ascii=False, indent=2)
        print(f"    저장: {out_path} ({len(records)}문항)")
        all_records.extend(records)

    with open(SEED_PATH, "w", encoding="utf-8") as f:
        json.dump(all_records, f, ensure_ascii=False, indent=2)
    print(f"\n→ seed.json 저장 완료 (총 {len(all_records)}문항)")
    return all_records


# ─────────────────────────────────────────────────────────────
# STEP 2. RAG 인덱스 빌드
# ─────────────────────────────────────────────────────────────

def step2_rag(records: list, model: SentenceTransformer):
    print("\n" + "="*50)
    print("STEP 2. RAG 인덱스 빌드")
    print("="*50)

    # Dense 임베딩
    texts = [r["embedding_text"] for r in records]
    print(f"\n[임베딩] {len(texts)}개 문항 벡터화 중...")
    embeddings = model.encode(
        texts, batch_size=32,
        show_progress_bar=True,
        normalize_embeddings=True,
    )
    embeddings = np.array(embeddings, dtype="float32")
    dim = embeddings.shape[1]

    if len(records) < 1000:
        index = faiss.IndexFlatIP(dim)
    else:
        nlist = min(100, len(records) // 10)
        quantizer = faiss.IndexFlatIP(dim)
        index = faiss.IndexIVFFlat(quantizer, dim, nlist, faiss.METRIC_INNER_PRODUCT)
        index.train(embeddings)

    index.add(embeddings)
    faiss.write_index(index, str(RAG_DIR / "faiss.index"))
    print(f"→ faiss.index 저장 ({index.ntotal}개 벡터)")

    # BM25
    corpus = []
    for r in records:
        choices_str = " ".join(r.get("choices", {}).values())
        corpus.append((r["embedding_text"] + " " + choices_str).split())
    bm25 = BM25Okapi(corpus)
    with open(RAG_DIR / "bm25.pkl", "wb") as f:
        pickle.dump(bm25, f)
    print("→ bm25.pkl 저장")

    # 메타데이터
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
    with open(RAG_DIR / "metadata.json", "w", encoding="utf-8") as f:
        json.dump(metadata, f, ensure_ascii=False, indent=2)
    print("→ metadata.json 저장")


# ─────────────────────────────────────────────────────────────
# STEP 3. 온톨로지 구축
# ─────────────────────────────────────────────────────────────

NODE_COLORS = {
    "Era":      "#1A3C6E",
    "Person":   "#E8A020",
    "Event":    "#CC3333",
    "Concept":  "#217346",
    "Group":    "#8B4513",
    "Artifact": "#9B59B6",
    "Place":    "#17A589",
    "Document": "#85929E",
}

NODE_SIZES = {
    "Era": 30, "Person": 20, "Event": 20, "Concept": 18,
    "Group": 18, "Artifact": 15, "Place": 15, "Document": 15,
}

PATTERN_CONFIDENCE = [
    (re.compile(r"([가-힣]{2,6})이?가? 추진"),  "Person",   0.90),
    (re.compile(r"([가-힣]{2,6})이?가? 주도"),  "Person",   0.90),
    (re.compile(r"([가-힣]{2,6})이?가? 건의"),  "Person",   0.88),
    (re.compile(r"([가-힣]{2,6})이?가? 저술"),  "Person",   0.88),
    (re.compile(r"([가-힣]{2,6})이?가? 파견"),  "Person",   0.85),
    (re.compile(r"([가-힣]{2,6})이?가? 즉위"),  "Person",   0.92),
    (re.compile(r"([가-힣·\d]+) 전투"),         "Event",    0.88),
    (re.compile(r"([가-힣·\d]+) 운동"),         "Event",    0.82),
    (re.compile(r"([가-힣·\d]+) 항쟁"),         "Event",    0.85),
    (re.compile(r"([가-힣·\d]+) 사변"),         "Event",    0.85),
    (re.compile(r"([가-힣·\d]+)[의] 난"),       "Event",    0.85),
    (re.compile(r"([가-힣·\d]+) 의거"),         "Event",    0.85),
    (re.compile(r"([가-힣]{2,8}) 정책"),        "Concept",  0.82),
    (re.compile(r"([가-힣]{2,8}) 제도"),        "Concept",  0.83),
    (re.compile(r"([가-힣]{2,8}) 조약"),        "Concept",  0.85),
    (re.compile(r"([가-힣]{2,8}) 개혁"),        "Concept",  0.80),
    (re.compile(r"([가-힣]{2,8}) 단체"),        "Group",    0.83),
    (re.compile(r"([가-힣]{2,8}) 세력"),        "Group",    0.80),
    (re.compile(r"([가-힣]{2,8})파\b"),         "Group",    0.80),
    (re.compile(r"『([가-힣·\w]+)』"),          "Document", 0.90),
    (re.compile(r"([가-힣]{2,8})을?를? 편찬"),  "Document", 0.90),
    (re.compile(r"([가-힣]{2,8})을?를? 저술"),  "Document", 0.90),
    (re.compile(r"([가-힣]{2,6})에서 발생"),    "Place",    0.85),
    (re.compile(r"([가-힣]{2,6})을?를? 점령"),  "Place",    0.83),
    (re.compile(r"([가-힣]{2,4})도\b"),         "Place",    0.80),
    (re.compile(r"([가-힣]{2,4})성\b"),         "Place",    0.78),
]

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
    "화백제도": "Concept", "토지조사사업": "Concept", "대동법": "Concept",
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


def _make_node(name: str, node_type: str, confidence: float, source: str) -> dict:
    return {
        "id":             str(uuid.uuid5(uuid.NAMESPACE_DNS, name)),
        "name":           name,
        "type":           node_type,
        "era_tags":       [],
        "description":    "",
        "embedding_text": f"{node_type} {name}",
        "confidence":     round(confidence, 3),
        "source":         source,
        "is_ambiguous":   confidence < 0.7,
    }


def _make_edge(src_id, tgt_id, relation, confidence, source) -> dict:
    return {
        "id":         str(uuid.uuid4()),
        "source_id":  src_id,
        "target_id":  tgt_id,
        "relation":   relation,
        "confidence": round(confidence, 3),
        "source":     source,
    }


def extract_nodes(record: dict) -> list[dict]:
    nodes = []
    text = record["stem"] + " " + " ".join(record.get("choices", {}).values())
    source = record["source"]

    for era in record.get("era_tags", []):
        if era != "미분류":
            nodes.append(_make_node(era, "Era", 1.0, source))

    for keyword, node_type in KEYWORD_NODE_MAP.items():
        if keyword in text:
            nodes.append(_make_node(keyword, node_type, 0.95, source))

    matched_names = {n["name"] for n in nodes}
    for pattern, node_type, confidence in PATTERN_CONFIDENCE:
        for m in pattern.finditer(text):
            name = m.group(1).strip()
            if name and name not in matched_names and len(name) >= 2:
                nodes.append(_make_node(name, node_type, confidence, source))
                matched_names.add(name)

 

    return nodes


def extract_edges(record: dict, nodes: list[dict]) -> list[dict]:
    edges = []
    source = record["source"]

    era_nodes   = [n for n in nodes if n["type"] == "Era"]
    other_nodes = [n for n in nodes if n["type"] != "Era"]

    for node in other_nodes:
        for era_node in era_nodes:
            edges.append(_make_edge(
                node["id"], era_node["id"], "is_in_era", 0.95, source
            ))

    choices     = record.get("choices", {})
    answer_ch   = record.get("answer", "")
    answer_text = record.get("answer_text", "")
    wrong_choices = {k: v for k, v in choices.items() if k != answer_ch}

    for wrong_text in wrong_choices.values():
        if wrong_text and answer_text and wrong_text != answer_text:
            ans_id   = str(uuid.uuid5(uuid.NAMESPACE_DNS, answer_text[:20]))
            wrong_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, wrong_text[:20]))
            edges.append(_make_edge(
                ans_id, wrong_id, "confused_with", 0.90, source
            ))

    concept_nodes = [n for n in nodes if n["type"] == "Concept"]
    actor_nodes   = [n for n in nodes if n["type"] in ("Person", "Group")]
    for c in concept_nodes:
        for a in actor_nodes:
            if a["name"] in record["stem"]:
                edges.append(_make_edge(
                    c["id"], a["id"], "implemented_by", 0.75, source
                ))

    event_nodes = [n for n in nodes if n["type"] == "Event"]
    for i, e1 in enumerate(event_nodes):
        for e2 in event_nodes[i+1:]:
            if e1["id"] != e2["id"]:
                edges.append(_make_edge(
                    e1["id"], e2["id"], "related_to", 0.70, source
                ))

    return edges


def step3_ontology(records: list):
    print("\n" + "="*50)
    print("STEP 3. 온톨로지 구축 (GraphRAG)")
    print("="*50)

    all_nodes, all_edges = [], []
    for record in tqdm(records, desc="노드/엣지 추출"):
        nodes = extract_nodes(record)
        edges = extract_edges(record, nodes)
        all_nodes.extend(nodes)
        all_edges.extend(edges)

    # 그래프 구축
    G = nx.DiGraph()
    seen_node_ids = {}
    for node in all_nodes:
        nid = node["id"]
        if nid not in seen_node_ids:
            seen_node_ids[nid] = node
            G.add_node(nid, **node)

    seen_edges = set()
    for edge in all_edges:
        key = (edge["source_id"], edge["target_id"], edge["relation"])
        if key not in seen_edges:
            src, tgt = edge["source_id"], edge["target_id"]
            if G.has_node(src) and G.has_node(tgt):
                seen_edges.add(key)
                G.add_edge(src, tgt, **edge)

    print(f"\n→ 노드: {G.number_of_nodes()}개")
    print(f"→ 엣지: {G.number_of_edges()}개")

    # 저장
    unique_nodes = list(seen_node_ids.values())
    ambiguous = [n for n in unique_nodes if n["is_ambiguous"]]

    with open(ONTOLOGY_DIR / "nodes.json", "w", encoding="utf-8") as f:
        json.dump(unique_nodes, f, ensure_ascii=False, indent=2)
    with open(ONTOLOGY_DIR / "edges.json", "w", encoding="utf-8") as f:
        json.dump(all_edges, f, ensure_ascii=False, indent=2)
    with open(ONTOLOGY_DIR / "ambiguous_nodes.json", "w", encoding="utf-8") as f:
        json.dump(ambiguous, f, ensure_ascii=False, indent=2)
    with open(ONTOLOGY_DIR / "graph.json", "w", encoding="utf-8") as f:
        json.dump(nx.node_link_data(G), f, ensure_ascii=False, indent=2)

    print(f"→ 검토 필요 노드: {len(ambiguous)}개 → ambiguous_nodes.json")

    # 노드 타입 분포
    print("\n[노드 타입별 분포]")
    type_counts: dict = {}
    for _, data in G.nodes(data=True):
        t = data.get("type", "Unknown")
        type_counts[t] = type_counts.get(t, 0) + 1
    for t, cnt in sorted(type_counts.items(), key=lambda x: -x[1]):
        print(f"  {t:<12}: {cnt}개")

    # 시각화
    if PYVIS_AVAILABLE:
        _visualize(G)
    else:
        print("\n[SKIP] pip install pyvis 후 재실행하면 시각화 생성됩니다.")

    return G


def _visualize(G: nx.DiGraph):
    print("\n[시각화 생성 중...]")
    net = Network(
        height="800px", width="100%",
        bgcolor="#1a1a2e", font_color="white",
        directed=True,
    )
    net.barnes_hut(gravity=-8000, central_gravity=0.3, spring_length=150)

    for node_id, data in G.nodes(data=True):
        node_type = data.get("type", "Concept")
        color = NODE_COLORS.get(node_type, "#888888")
        size  = NODE_SIZES.get(node_type, 15)
        label = data.get("name", node_id[:8])
        border_width = 3 if data.get("is_ambiguous") else 1
        border_color = "#FF4444" if data.get("is_ambiguous") else color
        net.add_node(
            node_id, label=label,
            color={"background": color, "border": border_color},
            size=size, borderWidth=border_width,
            title=f"[{node_type}] {label}\nconfidence: {data.get('confidence', 0):.2f}",
        )

    edge_colors = {
        "is_in_era": "#4444FF", "related_to": "#888888",
        "implemented_by": "#44AA44", "participated_in": "#FFAA00",
        "led_by": "#FF6600", "written_by": "#AA44AA",
        "member_of": "#44AAAA", "located_in": "#AAAAAA",
        "confused_with": "#FF4444",
    }
    for src, tgt, data in G.edges(data=True):
        relation = data.get("relation", "related_to")
        net.add_edge(src, tgt, color=edge_colors.get(relation, "#888888"),
                     title=relation, arrows="to")

    net.set_options("""
    var options = {
      "nodes": {"font": {"size": 12}},
      "edges": {"smooth": {"type": "dynamic"}},
      "physics": {"stabilization": {"iterations": 150}}
    }
    """)
    net.write_html(str(ONTOLOGY_DIR / "ontology.html"))
    print(f"→ ontology.html 생성 완료")
    print(f"   브라우저에서 열어서 확인하세요.")


# ─────────────────────────────────────────────────────────────
# 메인
# ─────────────────────────────────────────────────────────────

def main():
    print("한국사능력검정시험 GraphRAG 파이프라인 시작")
    print(f"PDF 폴더: {RAW_DIR.resolve()}\n")

    pairs = find_exam_pairs()
    if not pairs:
        print(f"[ERROR] {RAW_DIR}에 PDF가 없습니다.")
        print("  네이밍 규칙: {회차}회_한국사_문제지_심화_.pdf")
        return
    print(f"발견된 시험: {[p['round'] for p in pairs]}회")

    # STEP 1. PDF 파싱
    records = step1_parse(pairs)

    # STEP 2. RAG 인덱스
    print(f"\n[임베딩 모델 로드] {MODEL_NAME}")
    model = SentenceTransformer(MODEL_NAME)
    step2_rag(records, model)

    # STEP 3. 온톨로지 (GraphRAG)
    step3_ontology(records)

    print("\n" + "="*50)
    print("전체 파이프라인 완료!")
    print(f"  seed.json:       {SEED_PATH}")
    print(f"  faiss.index:     {RAG_DIR / 'faiss.index'}")
    print(f"  graph.json:      {ONTOLOGY_DIR / 'graph.json'}")
    print(f"  ontology.html:   {ONTOLOGY_DIR / 'ontology.html'}")
    print(f"  검토 필요:       {ONTOLOGY_DIR / 'ambiguous_nodes.json'}")
    print("="*50)


if __name__ == "__main__":
    main()
