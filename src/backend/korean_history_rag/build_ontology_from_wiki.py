"""
build_ontology_from_wiki.py
────────────────────────────
나무위키 한국사 핵심 항목 수집 → 온톨로지 구축

흐름:
    나무위키 API 수집 → 텍스트 파싱 → kiwipiepy 명사 추출
    → 노드/엣지 생성 → graph.json + ontology.html

실행:
    python build_ontology_from_wiki.py

출력:
    output/wiki/raw/         ← 수집된 원문 텍스트
    output/ontology/graph.json
    output/ontology/nodes.json
    output/ontology/edges.json
    output/ontology/ontology.html

참고:
    ONTOLOGY_SCHEMA.md
"""

import re
import json
import uuid
import time
import requests
from pathlib import Path
from tqdm import tqdm

import networkx as nx

try:
    from kiwipiepy import Kiwi
    kiwi = Kiwi()
    KIWI_AVAILABLE = True
except ImportError:
    KIWI_AVAILABLE = False
    print("[WARN] kiwipiepy 없음 → pip install kiwipiepy")

try:
    from pyvis.network import Network
    PYVIS_AVAILABLE = True
except ImportError:
    PYVIS_AVAILABLE = False

# ─── 경로 설정 ────────────────────────────────────────────────
WIKI_RAW_DIR = Path("output/wiki/raw")
ONTOLOGY_DIR = Path("output/ontology")

for d in [WIKI_RAW_DIR, ONTOLOGY_DIR]:
    d.mkdir(parents=True, exist_ok=True)

# ─── 수집 대상 항목 (시대별 핵심 100개) ──────────────────────
WIKI_TARGETS = {
    "선사/고조선": [
        "고조선", "단군왕검", "위만조선", "고인돌",
        "청동기시대", "철기시대",
    ],
    "삼국": [
        "고구려", "백제", "신라", "가야",
        "광개토대왕", "장수왕", "근초고왕", "진흥왕",
        "을지문덕", "살수대첩", "안시성 전투",
        "김유신", "계백", "황산벌 전투",
        "화백회의", "골품제", "서옥제",
    ],
    "남북국": [
        "통일신라", "발해",
        "태종무열왕", "문무왕", "신문왕",
        "장보고", "청해진",
        "원효", "의상", "혜초",
        "독서삼품과",
    ],
    "고려": [
        "고려", "왕건", "광종", "성종",
        "귀주대첩", "강감찬", "서희",
        "무신정변", "최씨 무신 정권",
        "삼별초", "팔만대장경",
        "공민왕", "신돈", "전민변정도감",
        "지눌", "의천", "천태종", "조계종",
        "과전법", "쌍성총관부",
        "별무반", "윤관",
        "묘청의 난", "이자겸의 난",
    ],
    "조선전기": [
        "조선", "이성계", "태종", "세종대왕",
        "훈민정음", "집현전", "경국대전",
        "임진왜란", "이순신", "한산도대첩",
        "조광조", "기묘사화",
        "사림", "훈구", "서원",
        "4군 6진", "계해약조",
        "직전법", "공법",
        "간경도감",
    ],
    "조선후기": [
        "흥선대원군", "서원철폐", "경복궁 중건", "당백전",
        "대동법", "균역법", "탕평책",
        "실학", "정약용", "박지원", "박제가",
        "세도정치", "홍경래의 난",
        "병자호란", "인조",
        "규장각", "장용영", "초계문신제",
        "북학의", "열하일기", "목민심서",
        "김정호", "대동여지도",
    ],
    "근대": [
        "병인양요", "신미양요", "척화비",
        "강화도조약", "임오군란", "갑신정변",
        "동학농민운동", "전봉준", "집강소",
        "갑오개혁", "을미사변", "아관파천",
        "대한제국", "독립협회", "만민공동회",
        "을사조약", "안중근", "이토 히로부미",
        "헤이그 특사", "의병운동",
        "신민회", "보안회",
    ],
    "일제강점기": [
        "3·1 운동", "대한민국 임시정부",
        "의열단", "김원봉",
        "한인애국단", "윤봉길", "이봉창",
        "신간회", "물산장려운동", "민립대학설립운동",
        "봉오동 전투", "청산리 전투",
        "한국광복군", "지청천",
        "창씨개명", "국가총동원법",
        "토지조사사업", "산미증식계획",
        "형평운동",
    ],
    "현대": [
        "대한민국 정부 수립", "이승만",
        "6·25 전쟁", "인천상륙작전",
        "4·19 혁명", "5·16 군사정변",
        "박정희", "유신헌법",
        "5·18 민주화운동", "6월 민주항쟁",
        "남북기본합의서", "금강산 관광",
        "농지개혁", "경제개발 5개년 계획",
    ],
}

# ─── ONTOLOGY_SCHEMA.md 기준 ──────────────────────────────────
KEYWORD_NODE_MAP = {
    # Person
    "광개토대왕": "Person", "장수왕": "Person", "근초고왕": "Person",
    "진흥왕": "Person", "을지문덕": "Person", "김유신": "Person",
    "계백": "Person", "원효": "Person", "의상": "Person",
    "장보고": "Person", "왕건": "Person", "광종": "Person",
    "강감찬": "Person", "서희": "Person", "윤관": "Person",
    "지눌": "Person", "의천": "Person", "공민왕": "Person",
    "신돈": "Person", "이성계": "Person", "세종대왕": "Person",
    "이순신": "Person", "조광조": "Person", "이황": "Person",
    "이이": "Person", "흥선대원군": "Person", "정약용": "Person",
    "박지원": "Person", "박제가": "Person", "김정호": "Person",
    "전봉준": "Person", "안중근": "Person", "김원봉": "Person",
    "윤봉길": "Person", "이봉창": "Person", "지청천": "Person",
    "신채호": "Person", "박은식": "Person", "이승만": "Person",
    "박정희": "Person",
    # Event
    "살수대첩": "Event", "안시성 전투": "Event", "황산벌 전투": "Event",
    "귀주대첩": "Event", "한산도대첩": "Event", "임진왜란": "Event",
    "병자호란": "Event", "병인양요": "Event", "신미양요": "Event",
    "강화도조약": "Event", "임오군란": "Event", "갑신정변": "Event",
    "동학농민운동": "Event", "갑오개혁": "Event", "을미사변": "Event",
    "3·1 운동": "Event", "봉오동 전투": "Event", "청산리 전투": "Event",
    "6·25 전쟁": "Event", "4·19 혁명": "Event", "5·16 군사정변": "Event",
    "5·18 민주화운동": "Event", "6월 민주항쟁": "Event",
    "묘청의 난": "Event", "이자겸의 난": "Event", "홍경래의 난": "Event",
    # Concept
    "골품제": "Concept", "화백회의": "Concept", "서옥제": "Concept",
    "독서삼품과": "Concept", "과전법": "Concept", "전민변정도감": "Concept",
    "훈민정음": "Concept", "집현전": "Concept", "경국대전": "Concept",
    "직전법": "Concept", "공법": "Concept", "서원철폐": "Concept",
    "대동법": "Concept", "균역법": "Concept", "탕평책": "Concept",
    "실학": "Concept", "집강소": "Concept", "토지조사사업": "Concept",
    "산미증식계획": "Concept", "창씨개명": "Concept",
    "국가총동원법": "Concept", "농지개혁": "Concept",
    "유신헌법": "Concept",
    # Group
    "삼별초": "Group", "별무반": "Group", "의열단": "Group",
    "한인애국단": "Group", "신간회": "Group", "한국광복군": "Group",
    "독립협회": "Group", "신민회": "Group", "보안회": "Group",
    # Artifact
    "팔만대장경": "Artifact", "훈민정음": "Artifact",
    "대동여지도": "Artifact", "직지심체요절": "Artifact",
    # Place
    "청해진": "Place", "강화도": "Place", "한성": "Place",
    "평양": "Place", "개성": "Place",
    # Document
    "삼국사기": "Document", "삼국유사": "Document",
    "북학의": "Document", "열하일기": "Document",
    "목민심서": "Document", "동의보감": "Document",
}

NODE_COLORS = {
    "Era": "#1A3C6E", "Person": "#E8A020", "Event": "#CC3333",
    "Concept": "#217346", "Group": "#8B4513", "Artifact": "#9B59B6",
    "Place": "#17A589", "Document": "#85929E",
}
NODE_SIZES = {
    "Era": 30, "Person": 20, "Event": 20, "Concept": 18,
    "Group": 18, "Artifact": 15, "Place": 15, "Document": 15,
}

NOUN_TAGS      = {"NNG", "NNP"}
NOUN_BLACKLIST = {
    "것", "수", "때", "등", "중", "위", "후", "전", "간",
    "국가", "사회", "경제", "문화", "정치", "활동", "관련",
    "내용", "방법", "결과", "시기", "당시", "이후", "이전",
    "인물", "사건", "제도", "정책", "지역", "시대", "기록",
    "설명", "근거", "사실", "의미", "영향", "목적", "배경",
    "발전", "변화", "강화", "확대", "추진", "실시", "시행",
}


# ─── 나무위키 수집 ────────────────────────────────────────────


def _clean_namuwiki(text: str) -> str:
    """위키백과 텍스트 정리"""
    # 각주 제거
    text = re.sub(r"\[[\d]+\]", "", text)
    # 연속 줄바꿈 정리
    text = re.sub(r"\n{3,}", "\n\n", text)
    # 연속 공백 정리
    text = re.sub(r"[ \t]+", " ", text)
    return text.strip()

def fetch_namuwiki(title: str, retries: int = 3) -> str | None:
    """
    위키백과 API로 본문 텍스트 수집
    나무위키는 공식 API 없음 → 위키백과로 대체
    """
    # 방법 1: REST API (요약문)
    url = (f"https://ko.wikipedia.org/api/rest_v1/page/summary/"
           f"{requests.utils.quote(title)}")
    headers = {"User-Agent": "KoreanHistoryRAG/1.0 (educational)"}

    for attempt in range(retries):
        try:
            resp = requests.get(url, headers=headers, timeout=10)
            if resp.status_code == 200:
                data = resp.json()
                summary = data.get("extract", "")
                if summary:
                    # 방법 2: 전체 본문도 추가 수집
                    full_text = _fetch_wiki_fulltext(title, headers)
                    return (summary + "\n\n" + full_text
                            if full_text else summary)
            elif resp.status_code == 404:
                # 제목 검색으로 재시도
                return _fetch_wiki_search(title, headers)
        except Exception:
            time.sleep(1)
        time.sleep(0.5)
    return None


def _fetch_wiki_fulltext(title: str, headers: dict) -> str:
    """위키백과 전체 본문 수집"""
    url = "https://ko.wikipedia.org/w/api.php"
    params = {
        "action":  "query",
        "titles":  title,
        "prop":    "extracts",
        "explaintext": True,
        "exsectionformat": "plain",
        "format": "json",
    }
    try:
        resp = requests.get(url, params=params,
                            headers=headers, timeout=10)
        if resp.status_code == 200:
            data  = resp.json()
            pages = data.get("query", {}).get("pages", {})
            for page in pages.values():
                text = page.get("extract", "")
                if text:
                    return text[:5000]  # 앞 5000자만
    except Exception:
        pass
    return ""


def _fetch_wiki_search(title: str, headers: dict) -> str | None:
    """제목이 정확히 없을 때 검색으로 찾기"""
    url = "https://ko.wikipedia.org/w/api.php"
    params = {
        "action":   "query",
        "list":     "search",
        "srsearch": title,
        "srlimit":  1,
        "format":   "json",
    }
    try:
        resp = requests.get(url, params=params,
                            headers=headers, timeout=10)
        if resp.status_code == 200:
            results = (resp.json()
                       .get("query", {})
                       .get("search", []))
            if results:
                found_title = results[0]["title"]
                return _fetch_wiki_fulltext(found_title, headers)
    except Exception:
        pass
    return None




# ─── 온톨로지 구축 ────────────────────────────────────────────

def extract_nouns(text: str) -> list[str]:
    if not KIWI_AVAILABLE:
        # fallback: 단순 공백 분리
        return [w for w in text.split() if len(w) >= 2]
    try:
        result = kiwi.analyze(text)
        nouns  = []
        for token in result[0][0]:
            if token.tag in NOUN_TAGS:
                form = token.form.strip()
                if len(form) >= 2 and form not in NOUN_BLACKLIST:
                    nouns.append(form)
        return list(dict.fromkeys(nouns))
    except Exception:
        return []


def _make_node(name: str, node_type: str,
               confidence: float, source: str) -> dict | None:
    if len(name) <= 1 or len(name) > 20:
        return None
    if not re.search(r"[가-힣]", name):
        return None
    noise_endings = ["하여", "하고", "되어", "이다", "에서",
                     "으로", "하였다", "되었다", "있었다"]
    if any(name.endswith(e) for e in noise_endings):
        return None
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


def build_nodes_from_article(
    title: str, text: str, era_name: str
) -> list[dict]:
    """
    나무위키 문서 1개 → 노드 생성
    """
    nodes  = []
    source = f"나무위키_{title}"

    # 1. 제목 자체를 노드로 (KEYWORD_NODE_MAP 우선)
    if title in KEYWORD_NODE_MAP:
        node = _make_node(title, KEYWORD_NODE_MAP[title], 1.0, source)
    else:
        node = _make_node(title, "Concept", 0.85, source)
    if node:
        nodes.append(node)

    # 2. Era 노드
    era_node = _make_node(era_name, "Era", 1.0, source)
    if era_node:
        nodes.append(era_node)

    matched = {n["name"] for n in nodes}

    # 3. kiwipiepy 명사 추출 → KEYWORD_NODE_MAP 매칭
    nouns = extract_nouns(text[:3000])  # 앞 3000자만 처리
    for noun in nouns:
        if noun in matched:
            continue
        if noun in KEYWORD_NODE_MAP:
            node = _make_node(noun, KEYWORD_NODE_MAP[noun], 0.90, source)
            if node:
                nodes.append(node)
                matched.add(noun)

    return nodes


def build_edges_from_article(
    title: str, text: str, nodes: list[dict]
) -> list[dict]:
    """
    나무위키 문서 1개 → 엣지 생성
    """
    edges  = []
    source = f"나무위키_{title}"

    title_node = next((n for n in nodes if n["name"] == title), None)
    era_nodes  = [n for n in nodes if n["type"] == "Era"]
    other      = [n for n in nodes if n["type"] != "Era"]

    # is_in_era 엣지
    if title_node:
        for era in era_nodes:
            edges.append(_make_edge(
                title_node["id"], era["id"],
                "is_in_era", 0.95, source
            ))

    # 모든 노드 → Era 연결
    for node in other:
        for era in era_nodes:
            if node["id"] != (title_node["id"] if title_node else None):
                edges.append(_make_edge(
                    node["id"], era["id"],
                    "is_in_era", 0.90, source
                ))

    # related_to 엣지 (제목 노드 ↔ 본문 등장 노드)
    if title_node:
        for node in other:
            if node["type"] not in ("Era",) and node["name"] in text:
                edges.append(_make_edge(
                    title_node["id"], node["id"],
                    "related_to", 0.80, source
                ))

    # implemented_by 엣지
    concept_nodes = [n for n in nodes if n["type"] == "Concept"]
    person_nodes  = [n for n in nodes
                     if n["type"] in ("Person", "Group")]
    for c in concept_nodes:
        for p in person_nodes:
            if p["name"] in text and c["name"] in text:
                edges.append(_make_edge(
                    c["id"], p["id"],
                    "implemented_by", 0.75, source
                ))

    return edges


# ─── 그래프 저장 + 시각화 ─────────────────────────────────────

def save_graph(G: nx.DiGraph,
               all_nodes: list[dict], all_edges: list[dict]):
    unique_nodes = list({n["id"]: n for n in all_nodes}.values())

    with open(ONTOLOGY_DIR / "nodes.json", "w", encoding="utf-8") as f:
        json.dump(unique_nodes, f, ensure_ascii=False, indent=2)
    with open(ONTOLOGY_DIR / "edges.json", "w", encoding="utf-8") as f:
        json.dump(all_edges, f, ensure_ascii=False, indent=2)
    with open(ONTOLOGY_DIR / "graph.json", "w", encoding="utf-8") as f:
        json.dump(nx.node_link_data(G),
                  f, ensure_ascii=False, indent=2)

    print(f"→ nodes.json: {len(unique_nodes)}개")
    print(f"→ edges.json: {len(all_edges)}개")
    print(f"→ graph.json 저장 완료")


def visualize(G: nx.DiGraph):
    if not PYVIS_AVAILABLE:
        print("[SKIP] pip install pyvis")
        return

    net = Network(
        height="800px", width="100%",
        bgcolor="#1a1a2e", font_color="white",
        directed=True,
    )
    net.barnes_hut(
        gravity=-8000, central_gravity=0.3, spring_length=150
    )

    for nid, data in G.nodes(data=True):
        ntype  = data.get("type", "Concept")
        color  = NODE_COLORS.get(ntype, "#888888")
        size   = NODE_SIZES.get(ntype, 15)
        label  = data.get("name", nid[:8])
        net.add_node(
            nid, label=label,
            color={"background": color, "border": color},
            size=size,
            title=f"[{ntype}] {label}",
        )

    edge_colors = {
        "is_in_era":      "#4444FF",
        "related_to":     "#888888",
        "implemented_by": "#44AA44",
        "confused_with":  "#FF4444",
    }
    for src, tgt, data in G.edges(data=True):
        rel = data.get("relation", "related_to")
        net.add_edge(
            src, tgt,
            color=edge_colors.get(rel, "#888888"),
            title=rel, arrows="to",
        )

    net.set_options("""
    var options = {
      "nodes": {"font": {"size": 12}},
      "edges": {"smooth": {"type": "dynamic"}},
      "physics": {"stabilization": {"iterations": 150}}
    }
    """)
    net.write_html(str(ONTOLOGY_DIR / "ontology.html"))
    print(f"→ ontology.html 생성 완료")


# ─── 메인 ─────────────────────────────────────────────────────

def main():
    print("나무위키 한국사 온톨로지 구축 시작\n")

    all_nodes: list[dict] = []
    all_edges: list[dict] = []
    failed:    list[str]  = []

    total = sum(len(v) for v in WIKI_TARGETS.values())
    print(f"수집 대상: {total}개 항목\n")

    for era_name, titles in WIKI_TARGETS.items():
        print(f"[{era_name}] {len(titles)}개 항목")

        for title in tqdm(titles, desc=f"  {era_name}"):
            # 캐시 확인
            cache_path = WIKI_RAW_DIR / f"{title}.txt"
            if cache_path.exists():
                text = cache_path.read_text(encoding="utf-8")
            else:
                text = fetch_namuwiki(title)
                if not text:
                    failed.append(title)
                    continue
                cache_path.write_text(text, encoding="utf-8")
                time.sleep(0.3)  # 요청 간격

            # 노드/엣지 추출
            nodes = build_nodes_from_article(title, text, era_name)
            edges = build_edges_from_article(title, text, nodes)
            all_nodes.extend(nodes)
            all_edges.extend(edges)

    # 그래프 구축
    print("\n[그래프 구축 중...]")
    G = nx.DiGraph()
    seen_nodes: dict = {}
    for node in all_nodes:
        nid = node["id"]
        if nid not in seen_nodes:
            seen_nodes[nid] = node
            G.add_node(nid, **node)

    seen_edges: set = set()
    for edge in all_edges:
        key = (edge["source_id"], edge["target_id"], edge["relation"])
        if (key not in seen_edges
                and G.has_node(edge["source_id"])
                and G.has_node(edge["target_id"])):
            seen_edges.add(key)
            G.add_edge(edge["source_id"], edge["target_id"], **edge)

    print(f"→ 노드: {G.number_of_nodes()}개")
    print(f"→ 엣지: {G.number_of_edges()}개")

    # 노드 타입 분포
    from collections import Counter
    type_counts = Counter(
        d.get("type") for _, d in G.nodes(data=True)
    )
    print("\n[노드 타입별 분포]")
    for t, c in sorted(type_counts.items(), key=lambda x: -x[1]):
        print(f"  {t:<12}: {c}개")

    # 저장
    print("\n[저장 중...]")
    save_graph(G, list(seen_nodes.values()), all_edges)

    # 시각화
    print("\n[시각화 생성 중...]")
    visualize(G)

    # 수집 실패 항목
    if failed:
        print(f"\n[수집 실패: {len(failed)}개]")
        for f in failed:
            print(f"  - {f}")

    print(f"\n{'='*50}")
    print("완료!")
    print(f"  graph.json:    {ONTOLOGY_DIR / 'graph.json'}")
    print(f"  ontology.html: {ONTOLOGY_DIR / 'ontology.html'}")
    print(f"  원문 캐시:     {WIKI_RAW_DIR}")


if __name__ == "__main__":
    main()
