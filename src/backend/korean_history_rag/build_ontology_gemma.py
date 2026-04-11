"""
build_ontology_gemma.py
────────────────────────
위키백과 텍스트 → Gemma 관계 추출 → 온톨로지 구축

흐름:
    위키백과 수집 → Gemma가 노드/엣지 추출 (JSON)
    → graph.json + ontology.html

실행:
    python build_ontology_gemma.py

출력:
    output/wiki/raw/         ← 위키백과 원문 캐시
    output/ontology/graph.json
    output/ontology/nodes.json
    output/ontology/edges.json
    output/ontology/ontology.html
"""

import re
import json
import uuid
import time
import requests
from pathlib import Path
from tqdm import tqdm

import networkx as nx
from ollama import chat

try:
    from pyvis.network import Network
    PYVIS_AVAILABLE = True
except ImportError:
    PYVIS_AVAILABLE = False
    print("[WARN] pyvis 없음 → pip install pyvis")

# ─── 경로 설정 ────────────────────────────────────────────────
WIKI_RAW_DIR = Path("output/wiki/raw")
ONTOLOGY_DIR = Path("output/ontology")
for d in [WIKI_RAW_DIR, ONTOLOGY_DIR]:
    d.mkdir(parents=True, exist_ok=True)

MODEL_NAME = "gemma3:4b"

# ─── 수집 대상 항목 ───────────────────────────────────────────
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
    ],
    "조선후기": [
        "흥선대원군", "서원철폐", "경복궁 중건", "당백전",
        "대동법", "균역법", "탕평책",
        "실학", "정약용", "박지원", "박제가",
        "세도정치", "홍경래의 난",
        "병자호란", "인조",
        "규장각", "초계문신제",
        "북학의", "열하일기", "목민심서",
        "김정호", "대동여지도",
    ],
    "근대": [
        "병인양요", "신미양요", "척화비",
        "강화도조약", "임오군란", "갑신정변",
        "동학농민운동", "전봉준", "집강소",
        "갑오개혁", "을미사변", "아관파천",
        "대한제국", "독립협회", "만민공동회",
        "을사조약", "안중근",
        "신민회", "보안회",
    ],
    "일제강점기": [
        "3·1 운동", "대한민국 임시정부",
        "의열단", "김원봉",
        "한인애국단", "윤봉길", "이봉창",
        "신간회", "물산장려운동",
        "봉오동 전투", "청산리 전투",
        "한국광복군", "지청천",
        "토지조사사업", "산미증식계획",
        "형평운동",
    ],
    "현대": [
        "대한민국 정부 수립", "이승만",
        "6·25 전쟁", "인천상륙작전",
        "4·19 혁명", "5·16 군사정변",
        "박정희", "유신헌법",
        "5·18 민주화운동", "6월 민주항쟁",
        "남북기본합의서",
        "농지개혁",
    ],
}

# ─── 노드 색상/크기 ───────────────────────────────────────────
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
VALID_TYPES = set(NODE_COLORS.keys())
VALID_RELATIONS = {
    "is_in_era", "related_to", "implemented_by",
    "participated_in", "led_by", "written_by",
    "member_of", "located_in", "confused_with",
}


# ─── 위키백과 수집 ────────────────────────────────────────────

def fetch_wikipedia(title: str) -> str | None:
    """위키백과 본문 수집"""
    headers = {"User-Agent": "KoreanHistoryRAG/1.0 (educational)"}

    # 전체 본문
    url = "https://ko.wikipedia.org/w/api.php"
    params = {
        "action":          "query",
        "titles":          title,
        "prop":            "extracts",
        "explaintext":     True,
        "exsectionformat": "plain",
        "format":          "json",
    }
    try:
        resp = requests.get(url, params=params,
                            headers=headers, timeout=10)
        if resp.status_code == 200:
            pages = (resp.json()
                     .get("query", {})
                     .get("pages", {}))
            for page in pages.values():
                text = page.get("extract", "")
                if text and len(text) > 50:
                    # 앞 3000자만 사용 (Gemma 컨텍스트 절약)
                    return _clean_wiki(text[:3000])

        # 검색으로 재시도
        search_params = {
            "action":   "query",
            "list":     "search",
            "srsearch": title,
            "srlimit":  1,
            "format":   "json",
        }
        resp2 = requests.get(url, params=search_params,
                             headers=headers, timeout=10)
        if resp2.status_code == 200:
            results = (resp2.json()
                       .get("query", {})
                       .get("search", []))
            if results:
                found = results[0]["title"]
                if found != title:
                    return fetch_wikipedia(found)
    except Exception as e:
        print(f"    [수집 오류] {title}: {e}")
    return None


def _clean_wiki(text: str) -> str:
    text = re.sub(r"\[[\d]+\]", "", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    text = re.sub(r"[ \t]+", " ", text)
    return text.strip()


# ─── Gemma 관계 추출 ──────────────────────────────────────────

EXTRACT_PROMPT = """
다음은 한국사 위키백과 문서입니다.
이 텍스트에서 역사적 개념과 관계를 추출해주세요.

문서 제목: {title}
시대: {era}

텍스트:
{text}

아래 JSON 형식으로만 답하세요. 설명이나 마크다운 없이 JSON만 출력하세요.

노드 타입 규칙:
- Era: 시대 (선사, 삼국, 고려, 조선전기, 조선후기, 근대, 일제강점기, 현대 등)
- Person: 인물 (왕, 장군, 학자, 독립운동가 등)
- Event: 사건 (전투, 운동, 조약, 난 등)
- Concept: 정책/제도/사상 (법령, 제도, 이념 등)
- Group: 세력/단체 (군사조직, 정치세력, 독립운동단체 등)
- Artifact: 유물/문화재 (책, 탑, 건축물 등)
- Place: 장소/지역
- Document: 문헌/서적

관계 타입 규칙:
- is_in_era: 해당 시대에 속함
- related_to: 관련 있음 (인과, 연결)
- implemented_by: 정책/제도를 시행한 인물/단체
- participated_in: 인물이 사건에 참여
- led_by: 사건/단체를 이끈 인물
- written_by: 문헌을 저술한 인물
- member_of: 인물이 단체에 소속
- located_in: 장소에서 발생
- confused_with: 혼동하기 쉬운 개념

{{
  "nodes": [
    {{"name": "노드이름", "type": "노드타입"}},
    ...
  ],
  "edges": [
    {{"from": "출발노드이름", "to": "도착노드이름", "relation": "관계타입"}},
    ...
  ]
}}

주의:
- 노드는 최대 15개
- 엣지는 최대 20개
- 반드시 JSON만 출력
- 한국어로 노드 이름 작성
"""


def extract_with_gemma(
    title: str, era: str, text: str,
    max_retries: int = 3
) -> dict | None:
    """Gemma로 노드/엣지 추출"""
    prompt = EXTRACT_PROMPT.format(
        title=title, era=era, text=text[:2000]
    )

    for attempt in range(max_retries):
        try:
            response = chat(
                model=MODEL_NAME,
                messages=[{"role": "user", "content": prompt}],
                options={"temperature": 0.1},  # 일관성을 위해 낮게
            )
            raw = response.message.content.strip()

            # JSON 파싱
            result = _parse_json_safe(raw)
            if result:
                return result

        except Exception as e:
            print(f"    [Gemma 오류] {title} (시도 {attempt+1}): {e}")
            time.sleep(1)

    return None


def _parse_json_safe(text: str) -> dict | None:
    """JSON 안전 파싱 — 마크다운 코드블록 제거 포함"""
    # ```json ... ``` 제거
    text = re.sub(r"```json\s*", "", text)
    text = re.sub(r"```\s*", "", text)
    text = text.strip()

    # { 로 시작하는 부분만 추출
    start = text.find("{")
    end   = text.rfind("}") + 1
    if start == -1 or end == 0:
        return None

    try:
        data = json.loads(text[start:end])
        if "nodes" in data and "edges" in data:
            return data
    except json.JSONDecodeError:
        pass
    return None


# ─── 노드/엣지 변환 ───────────────────────────────────────────

def _make_node(
    name: str, node_type: str,
    confidence: float, source: str
) -> dict | None:
    if not name or len(name) <= 1 or len(name) > 20:
        return None
    if node_type not in VALID_TYPES:
        node_type = "Concept"
    return {
        "id":             str(uuid.uuid5(uuid.NAMESPACE_DNS, name)),
        "name":           name,
        "type":           node_type,
        "era_tags":       [],
        "description":    "",
        "embedding_text": f"{node_type} {name}",
        "confidence":     round(confidence, 3),
        "source":         source,
        "is_ambiguous":   False,
    }


def _make_edge(
    src_id: str, tgt_id: str,
    relation: str, confidence: float, source: str
) -> dict:
    return {
        "id":         str(uuid.uuid4()),
        "source_id":  src_id,
        "target_id":  tgt_id,
        "relation":   relation,
        "confidence": round(confidence, 3),
        "source":     source,
    }


def convert_gemma_output(
    gemma_result: dict,
    era_name: str,
    source: str
) -> tuple[list[dict], list[dict]]:
    """Gemma 출력 → nodes/edges 리스트 변환"""
    nodes: list[dict] = []
    edges: list[dict] = []

    # Era 노드 추가
    era_node = _make_node(era_name, "Era", 1.0, source)
    if era_node:
        nodes.append(era_node)

    # Gemma가 추출한 노드 변환
    name_to_id: dict[str, str] = {}
    if era_node:
        name_to_id[era_name] = era_node["id"]

    for n in gemma_result.get("nodes", []):
        name      = str(n.get("name", "")).strip()
        node_type = str(n.get("type", "Concept")).strip()
        node = _make_node(name, node_type, 0.88, source)
        if node:
            nodes.append(node)
            name_to_id[name] = node["id"]

    # Gemma가 추출한 엣지 변환
    for e in gemma_result.get("edges", []):
        from_name = str(e.get("from", "")).strip()
        to_name   = str(e.get("to", "")).strip()
        relation  = str(e.get("relation", "related_to")).strip()

        if relation not in VALID_RELATIONS:
            relation = "related_to"

        src_id = name_to_id.get(from_name)
        tgt_id = name_to_id.get(to_name)

        if src_id and tgt_id and src_id != tgt_id:
            edges.append(_make_edge(
                src_id, tgt_id, relation, 0.85, source
            ))

    return nodes, edges


# ─── 그래프 저장 + 시각화 ─────────────────────────────────────

def build_and_save_graph(
    all_nodes: list[dict], all_edges: list[dict]
):
    G = nx.DiGraph()
    seen_nodes: dict = {}

    for node in all_nodes:
        nid = node["id"]
        if nid not in seen_nodes:
            seen_nodes[nid] = node
            G.add_node(nid, **node)

    seen_edges: set = set()
    valid_edges = []
    for edge in all_edges:
        key = (edge["source_id"], edge["target_id"], edge["relation"])
        if (key not in seen_edges
                and G.has_node(edge["source_id"])
                and G.has_node(edge["target_id"])):
            seen_edges.add(key)
            G.add_edge(edge["source_id"], edge["target_id"], **edge)
            valid_edges.append(edge)

    # 저장
    unique_nodes = list(seen_nodes.values())
    with open(ONTOLOGY_DIR / "nodes.json", "w", encoding="utf-8") as f:
        json.dump(unique_nodes, f, ensure_ascii=False, indent=2)
    with open(ONTOLOGY_DIR / "edges.json", "w", encoding="utf-8") as f:
        json.dump(valid_edges, f, ensure_ascii=False, indent=2)
    with open(ONTOLOGY_DIR / "graph.json", "w", encoding="utf-8") as f:
        json.dump(nx.node_link_data(G), f, ensure_ascii=False, indent=2)

    print(f"→ 노드: {G.number_of_nodes()}개")
    print(f"→ 엣지: {G.number_of_edges()}개")

    # 타입 분포
    from collections import Counter
    type_counts = Counter(
        d.get("type") for _, d in G.nodes(data=True)
    )
    print("\n[노드 타입별 분포]")
    for t, c in sorted(type_counts.items(), key=lambda x: -x[1]):
        print(f"  {t:<12}: {c}개")

    # 시각화
    if PYVIS_AVAILABLE:
        _visualize(G)
    else:
        print("[SKIP] pip install pyvis")

    return G


def _visualize(G: nx.DiGraph):
    net = Network(
        height="800px", width="100%",
        bgcolor="#1a1a2e", font_color="white",
        directed=True,
    )
    net.barnes_hut(
        gravity=-8000, central_gravity=0.3, spring_length=150
    )
    for nid, data in G.nodes(data=True):
        ntype = data.get("type", "Concept")
        color = NODE_COLORS.get(ntype, "#888888")
        size  = NODE_SIZES.get(ntype, 15)
        label = data.get("name", nid[:8])
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
        "led_by":         "#FF6600",
        "participated_in": "#FFAA00",
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
    print("→ ontology.html 생성 완료")


# ─── 메인 ─────────────────────────────────────────────────────

def main():
    print("Gemma 온톨로지 구축 시작")
    print(f"모델: {MODEL_NAME}\n")

    all_nodes: list[dict] = []
    all_edges: list[dict] = []
    failed:    list[str]  = []
    success:   int        = 0

    total = sum(len(v) for v in WIKI_TARGETS.values())
    print(f"수집 대상: {total}개 항목\n")

    for era_name, titles in WIKI_TARGETS.items():
        print(f"[{era_name}] {len(titles)}개 항목")

        for title in tqdm(titles, desc=f"  {era_name}"):

            # 1. 위키백과 수집 (캐시 우선)
            cache_path = WIKI_RAW_DIR / f"{title}.txt"
            if cache_path.exists():
                text = cache_path.read_text(encoding="utf-8")
            else:
                text = fetch_wikipedia(title)
                if not text:
                    failed.append(title)
                    continue
                cache_path.write_text(text, encoding="utf-8")
                time.sleep(0.3)

            # 2. Gemma로 노드/엣지 추출
            gemma_result = extract_with_gemma(title, era_name, text)
            if not gemma_result:
                failed.append(f"{title} (Gemma 실패)")
                continue

            # 3. 변환 및 누적
            source = f"위키백과_{title}"
            nodes, edges = convert_gemma_output(
                gemma_result, era_name, source
            )
            all_nodes.extend(nodes)
            all_edges.extend(edges)
            success += 1

    # 4. 그래프 구축 및 저장
    print(f"\n[그래프 구축 중...]")
    print(f"성공: {success}개 / 실패: {len(failed)}개\n")
    build_and_save_graph(all_nodes, all_edges)

    if failed:
        print(f"\n[실패 항목: {len(failed)}개]")
        for f in failed[:10]:
            print(f"  - {f}")
        if len(failed) > 10:
            print(f"  ... 외 {len(failed)-10}개")

    print(f"\n{'='*50}")
    print("완료!")
    print(f"  graph.json:    {ONTOLOGY_DIR / 'graph.json'}")
    print(f"  ontology.html: {ONTOLOGY_DIR / 'ontology.html'}")
    print(f"  원문 캐시:     {WIKI_RAW_DIR}")


if __name__ == "__main__":
    main()
