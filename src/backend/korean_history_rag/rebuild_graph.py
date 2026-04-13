"""
rebuild_graph.py
────────────────
nodes.json, edges.json을 읽어서
graph.json과 ontology.html만 다시 생성

nodes.json에서 노이즈 노드를 직접 삭제한 후 이 파일 실행.

실행:
    python rebuild_graph.py

출력:
    output/ontology/graph.json    ← 재생성
    output/ontology/ontology.html ← 재생성
"""

import json
from pathlib import Path

import networkx as nx

try:
    from pyvis.network import Network
    PYVIS_AVAILABLE = True
except ImportError:
    PYVIS_AVAILABLE = False
    print("[WARN] pyvis 없음 → pip install pyvis")

# ─── 경로 설정 ────────────────────────────────────────────────
ONTOLOGY_DIR = Path("output/ontology")
NODES_PATH   = ONTOLOGY_DIR / "nodes.json"
EDGES_PATH   = ONTOLOGY_DIR / "edges.json"
GRAPH_PATH   = ONTOLOGY_DIR / "graph.json"
VISUAL_PATH  = ONTOLOGY_DIR / "ontology.html"

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


def main():
    # 파일 존재 확인
    if not NODES_PATH.exists():
        print(f"[ERROR] {NODES_PATH} 없음")
        return
    if not EDGES_PATH.exists():
        print(f"[ERROR] {EDGES_PATH} 없음")
        return

    # 노드/엣지 로드
    nodes = json.load(open(NODES_PATH, encoding="utf-8"))
    edges = json.load(open(EDGES_PATH, encoding="utf-8"))
    print(f"[로드] 노드: {len(nodes)}개 / 엣지: {len(edges)}개")

    # 그래프 구축
    G = nx.DiGraph()
    node_ids = set()

    for node in nodes:
        G.add_node(node["id"], **node)
        node_ids.add(node["id"])

    # 삭제된 노드 참조하는 엣지 자동 제거
    valid_edges = []
    removed_edges = 0
    for edge in edges:
        src = edge["source_id"]
        tgt = edge["target_id"]
        if src in node_ids and tgt in node_ids:
            key = (src, tgt, edge["relation"])
            if not G.has_edge(src, tgt):
                G.add_edge(src, tgt, **edge)
            valid_edges.append(edge)
        else:
            removed_edges += 1

    print(f"→ 유효 엣지: {len(valid_edges)}개")
    if removed_edges > 0:
        print(f"→ 삭제된 노드 참조 엣지 자동 제거: {removed_edges}개")

    # 노드 타입별 분포
    from collections import Counter
    type_counts = Counter(
        data.get("type", "Unknown")
        for _, data in G.nodes(data=True)
    )
    print("\n[노드 타입별 분포]")
    for t, cnt in sorted(type_counts.items(), key=lambda x: -x[1]):
        print(f"  {t:<12}: {cnt}개")

    # graph.json 저장
    graph_data = nx.node_link_data(G)
    with open(GRAPH_PATH, "w", encoding="utf-8") as f:
        json.dump(graph_data, f, ensure_ascii=False, indent=2)
    print(f"\n→ graph.json 저장 완료")

    # edges.json 업데이트 (삭제된 노드 참조 엣지 반영)
    with open(EDGES_PATH, "w", encoding="utf-8") as f:
        json.dump(valid_edges, f, ensure_ascii=False, indent=2)
    print(f"→ edges.json 업데이트 완료")

    # 시각화
    if PYVIS_AVAILABLE:
        _visualize(G)
    else:
        print("[SKIP] pip install pyvis 후 재실행")

    print("\n완료!")
    print(f"  graph.json:    {GRAPH_PATH}")
    print(f"  ontology.html: {VISUAL_PATH}")


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
        color     = NODE_COLORS.get(node_type, "#888888")
        size      = NODE_SIZES.get(node_type, 15)
        label     = data.get("name", node_id[:8])
        is_ambiguous = data.get("is_ambiguous", False)
        border_color = "#FF4444" if is_ambiguous else color
        border_width = 3 if is_ambiguous else 1

        net.add_node(
            node_id, label=label,
            color={"background": color, "border": border_color},
            size=size, borderWidth=border_width,
            title=f"[{node_type}] {label}\nconfidence: {data.get('confidence', 0):.2f}",
        )

    edge_colors = {
        "is_in_era":       "#4444FF",
        "related_to":      "#888888",
        "implemented_by":  "#44AA44",
        "participated_in": "#FFAA00",
        "led_by":          "#FF6600",
        "written_by":      "#AA44AA",
        "member_of":       "#44AAAA",
        "located_in":      "#AAAAAA",
        "confused_with":   "#FF4444",
    }

    for src, tgt, data in G.edges(data=True):
        relation = data.get("relation", "related_to")
        net.add_edge(
            src, tgt,
            color=edge_colors.get(relation, "#888888"),
            title=relation,
            arrows="to",
        )

    net.set_options("""
    var options = {
      "nodes": {"font": {"size": 12}},
      "edges": {"smooth": {"type": "dynamic"}},
      "physics": {"stabilization": {"iterations": 150}}
    }
    """)
    net.write_html(str(VISUAL_PATH))
    print(f"→ ontology.html 생성 완료")
    print(f"   브라우저에서 열어서 확인하세요.")


if __name__ == "__main__":
    main()
