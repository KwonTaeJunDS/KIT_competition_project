from __future__ import annotations

"""
api/services/admin_ingest.py
Admin 전용 인제스트 서비스 (시나리오 1·2·3 공통)

의존:
  - graphrag.py (경로 상수, 싱글턴)
  - 01_parse_exams.py 파싱 함수들 (동적 import)
  - 02_build_rag.py 인덱스 빌드 함수들 (동적 import)
  - build_ontology_gemma.py 온톨로지 함수들 (동적 import)
"""

import json
import logging
import os
import pickle
import re
import shutil
import tempfile
import urllib.error
import urllib.request
import uuid
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)

# ── 경로 (graphrag.py 와 동일 상수 재사용) ────────────────────
from api.services.graphrag import (
    RAG_BASE,
    FAISS_PATH,
    METADATA_PATH,
    BM25_PATH,
    GRAPH_PATH,
    OLLAMA_URL,
    GEMMA_MODEL,
    LLM_TIMEOUT,
    EMBED_MODEL,
)

SEED_PATH           = RAG_BASE / "output/seed.json"
ROUND_QUESTIONS_DIR = RAG_BASE / "output/questions"
ONTOLOGY_DIR        = RAG_BASE / "output/ontology"
NODES_PATH          = ONTOLOGY_DIR / "nodes.json"
EDGES_PATH          = ONTOLOGY_DIR / "edges.json"

VALID_TYPES = {
    "Era", "Person", "Event", "Concept",
    "Group", "Artifact", "Place", "Document",
}
VALID_RELATIONS = {
    "is_in_era", "related_to", "implemented_by",
    "participated_in", "led_by", "written_by",
    "member_of", "located_in", "confused_with",
}


# ──────────────────────────────────────────────────────────────
# 공통 유틸
# ──────────────────────────────────────────────────────────────

def _backup(paths: list[Path]) -> dict[Path, Path | None]:
    """파일이 존재하면 .bak 복사본 생성. {원본: bak경로} 반환."""
    bak: dict[Path, Path | None] = {}
    for p in paths:
        if p.exists():
            b = p.with_suffix(p.suffix + ".bak")
            shutil.copy2(p, b)
            bak[p] = b
        else:
            bak[p] = None
    return bak


def _restore(bak: dict[Path, Path | None]):
    """실패 시 원본 복구."""
    for original, backup in bak.items():
        if backup and backup.exists():
            shutil.copy2(backup, original)
        elif backup is None and original.exists():
            # 원래 없던 파일이 생겼으면 삭제
            original.unlink(missing_ok=True)


def _cleanup_bak(bak: dict[Path, Path | None]):
    for backup in bak.values():
        if backup and backup.exists():
            backup.unlink(missing_ok=True)


def _call_gemma(prompt: str) -> str | None:
    """Ollama REST /api/generate 호출 → 응답 텍스트 반환."""
    url = f"{OLLAMA_URL.rstrip('/')}/api/generate"
    payload = json.dumps({
        "model": GEMMA_MODEL,
        "prompt": prompt,
        "stream": False,
        "format": "json",
        "options": {"temperature": 0.1, "num_predict": 1024},
    }).encode()
    req = urllib.request.Request(
        url, data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=LLM_TIMEOUT) as resp:
            body = json.loads(resp.read())
        return body.get("response") or ""
    except Exception as exc:
        logger.debug("Gemma call failed: %s", exc)
        return None


def _parse_json_from_text(text: str) -> dict | None:
    if not text:
        return None
    text = re.sub(r"```json\s*", "", text)
    text = re.sub(r"```\s*", "", text).strip()
    start = text.find("{")
    end = text.rfind("}") + 1
    if start == -1 or end <= 0:
        return None
    try:
        return json.loads(text[start:end])
    except json.JSONDecodeError:
        return None


# ──────────────────────────────────────────────────────────────
# 시나리오 1 — 새 회차 시험 자동 확장
# ──────────────────────────────────────────────────────────────

def ingest_exam(q_pdf_bytes: bytes, a_pdf_bytes: bytes) -> dict:
    """
    문제지 + 답지 PDF bytes → seed.json 업데이트 + 인덱스 재빌드.
    반환: {"round": int, "added_count": int}
    실패 시 기존 파일 복구.
    """
    from api.services import _parse_exams_funcs as _pef  # noqa
    parse_answer_sheet = _pef.parse_answer_sheet
    parse_question_pdf  = _pef.parse_question_pdf
    build_seed_records  = _pef.build_seed_records

    # ① 임시 파일로 저장
    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as qf:
        qf.write(q_pdf_bytes)
        q_tmp = Path(qf.name)
    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as af:
        af.write(a_pdf_bytes)
        a_tmp = Path(af.name)

    try:
        # ② 파싱
        answers   = parse_answer_sheet(a_tmp)
        questions = parse_question_pdf(q_tmp)

        # ③ 회차 번호: 기존 seed.json 최대 회차 + 1
        existing = _load_seed()
        existing_rounds = {r["round"] for r in existing} if existing else set()
        round_no = (max(existing_rounds) + 1) if existing_rounds else 78

        records = build_seed_records(round_no, questions, answers)
        if not records:
            raise ValueError("문제지 파싱 결과 0건")

        # ④ seed.json 업데이트
        bak_files = [SEED_PATH, FAISS_PATH, METADATA_PATH, BM25_PATH]
        bak = _backup(bak_files)
        try:
            new_seed = existing + records
            SEED_PATH.parent.mkdir(parents=True, exist_ok=True)
            SEED_PATH.write_text(
                json.dumps(new_seed, ensure_ascii=False, indent=2),
                encoding="utf-8",
            )

            # ⑤ 회차별 파일 저장
            ROUND_QUESTIONS_DIR.mkdir(parents=True, exist_ok=True)
            (ROUND_QUESTIONS_DIR / f"{round_no:02d}회.json").write_text(
                json.dumps(records, ensure_ascii=False, indent=2),
                encoding="utf-8",
            )

            # ⑥ FAISS + BM25 재빌드
            _rebuild_rag_index(new_seed)

            # ⑦ graphrag 싱글턴 reload
            _reload_graphrag()

            _cleanup_bak(bak)
        except Exception:
            _restore(bak)
            raise

        return {"round": round_no, "added_count": len(records)}

    finally:
        q_tmp.unlink(missing_ok=True)
        a_tmp.unlink(missing_ok=True)


def _load_seed() -> list[dict]:
    if not SEED_PATH.exists():
        return []
    return json.loads(SEED_PATH.read_text(encoding="utf-8"))


def _rebuild_rag_index(records: list[dict]):
    """FAISS + BM25 + metadata 전체 재빌드 (02_build_rag.py 로직 인라인)."""
    import faiss
    import numpy as np
    import pickle
    from rank_bm25 import BM25Okapi
    from sentence_transformers import SentenceTransformer

    model = SentenceTransformer(EMBED_MODEL)

    # ─ FAISS ─
    texts = [r["embedding_text"] for r in records]
    embeddings = model.encode(
        texts, batch_size=32, normalize_embeddings=True,
    ).astype("float32")

    dim = embeddings.shape[1]
    n = len(records)
    if n < 1000:
        index = faiss.IndexFlatIP(dim)
    else:
        nlist = min(100, n // 10)
        quantizer = faiss.IndexFlatIP(dim)
        index = faiss.IndexIVFFlat(quantizer, dim, nlist, faiss.METRIC_INNER_PRODUCT)
        index.train(embeddings)

    index.add(embeddings)
    FAISS_PATH.parent.mkdir(parents=True, exist_ok=True)
    faiss.write_index(index, str(FAISS_PATH))

    # ─ BM25 ─
    corpus = []
    for r in records:
        choices_str = " ".join((r.get("choices") or {}).values())
        tokens = (r["embedding_text"] + " " + choices_str).split()
        corpus.append(tokens)
    bm25 = BM25Okapi(corpus)
    with open(BM25_PATH, "wb") as f:
        pickle.dump(bm25, f)

    # ─ metadata ─
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
            "explanation":  r.get("explanation", ""),
            "memory_hint":  r.get("memory_hint", ""),
            "source":       r.get("source", ""),
        }
        for i, r in enumerate(records)
    }
    METADATA_PATH.write_text(
        json.dumps(metadata, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    logger.info("RAG index rebuilt: %d records", len(records))


def _reload_graphrag():
    """graphrag 싱글턴 강제 리셋 → 다음 호출 시 새 인덱스 로드."""
    import api.services.graphrag as _gr
    _gr._instance = None
    logger.info("GraphRAG singleton reset (will reload on next access)")


# ──────────────────────────────────────────────────────────────
# 시나리오 2 — 교육자 교안 업로드
# ──────────────────────────────────────────────────────────────

_MATERIAL_EXTRACT_PROMPT = """
당신은 한국사 교육 전문가입니다.
아래 교안 텍스트에서 역사적 개념과 관계를 추출해주세요.

교안 텍스트:
{text}

아래 JSON 형식으로만 출력하세요. 설명 없이 JSON만.

{{
  "nodes": [
    {{"name": "노드이름", "type": "노드타입"}}
  ],
  "edges": [
    {{"from": "출발노드이름", "to": "도착노드이름", "relation": "관계타입"}}
  ]
}}

노드 타입 (8가지 고정): Era, Person, Event, Concept, Group, Artifact, Place, Document
엣지 타입 (9가지 고정): is_in_era, related_to, implemented_by, participated_in, led_by, written_by, member_of, located_in, confused_with

주의:
- 노드 최대 15개, 엣지 최대 20개
- 반드시 JSON만 출력
- 한국어로 노드 이름 작성
"""


def ingest_material(pdf_bytes: bytes, source_name: str = "교안") -> dict:
    """
    교안 PDF → 온톨로지 확장.
    반환: {"added_nodes": int, "added_edges": int}
    """
    try:
        import pdfplumber
    except ImportError:
        raise RuntimeError("pdfplumber 미설치. pip install pdfplumber")

    # ① PDF → 텍스트
    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
        tmp.write(pdf_bytes)
        tmp_path = Path(tmp.name)

    try:
        with pdfplumber.open(tmp_path) as pdf:
            full_text = "\n".join(
                p.extract_text() or "" for p in pdf.pages
            )[:4000]  # Gemma 컨텍스트 절약
    finally:
        tmp_path.unlink(missing_ok=True)

    if not full_text.strip():
        raise ValueError("PDF 텍스트 추출 실패")

    # ② Gemma로 노드/엣지 추출
    # PDF 텍스트의 중괄호가 str.format() 필드로 해석되지 않도록 이스케이프
    escaped_text = full_text[:2000].replace("{", "{{").replace("}", "}}")
    prompt = _MATERIAL_EXTRACT_PROMPT.format(text=escaped_text)
    raw = _call_gemma(prompt)
    gemma_result = _parse_json_from_text(raw) if raw else None

    if not gemma_result or "nodes" not in gemma_result:
        raise RuntimeError("Gemma 추출 실패 — Ollama 서버 상태 확인")

    # ③ 기존 graph.json 로드
    bak = _backup([GRAPH_PATH, NODES_PATH, EDGES_PATH])
    try:
        added_nodes, added_edges = _merge_into_graph(
            gemma_result, source=source_name
        )
        _reload_graphrag()
        _cleanup_bak(bak)
    except Exception:
        _restore(bak)
        raise

    return {"added_nodes": added_nodes, "added_edges": added_edges}


def _merge_into_graph(
    gemma_result: dict, source: str
) -> tuple[int, int]:
    """Gemma 추출 결과를 기존 graph.json 에 병합. (추가된 노드/엣지 수 반환)"""
    import networkx as nx

    # 기존 그래프 로드
    if GRAPH_PATH.exists():
        graph_data = json.loads(GRAPH_PATH.read_text(encoding="utf-8"))
        G: nx.DiGraph = nx.node_link_graph(graph_data)
    else:
        G = nx.DiGraph()

    ONTOLOGY_DIR.mkdir(parents=True, exist_ok=True)

    # 이름 → node_id 맵 (기존)
    name_to_id: dict[str, str] = {}
    for nid, data in G.nodes(data=True):
        n = data.get("name", "")
        if n:
            name_to_id[n] = nid

    added_nodes = 0
    added_edges = 0

    # ── 새 노드 추가 ──
    new_name_to_id: dict[str, str] = {}
    for n in gemma_result.get("nodes", []):
        name = str(n.get("name", "")).strip()
        ntype = str(n.get("type", "Concept")).strip()
        if not name or len(name) <= 1 or len(name) > 30:
            continue
        if ntype not in VALID_TYPES:
            ntype = "Concept"

        if name in name_to_id:
            new_name_to_id[name] = name_to_id[name]
            continue  # 이미 존재

        node_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, name))
        node_data = {
            "id":             node_id,
            "name":           name,
            "type":           ntype,
            "era_tags":       [],
            "description":    "",
            "embedding_text": f"{ntype} {name}",
            "confidence":     0.88,
            "source":         source,
            "is_ambiguous":   False,
        }
        G.add_node(node_id, **node_data)
        name_to_id[name] = node_id
        new_name_to_id[name] = node_id
        added_nodes += 1

    # ── 새 엣지 추가 ──
    existing_edge_keys: set = {
        (u, v, d.get("relation")) for u, v, d in G.edges(data=True)
    }
    for e in gemma_result.get("edges", []):
        from_name = str(e.get("from", "")).strip()
        to_name   = str(e.get("to", "")).strip()
        relation  = str(e.get("relation", "related_to")).strip()

        if relation not in VALID_RELATIONS:
            relation = "related_to"

        src_id = name_to_id.get(from_name)
        tgt_id = name_to_id.get(to_name)
        if not src_id or not tgt_id or src_id == tgt_id:
            continue

        key = (src_id, tgt_id, relation)
        if key in existing_edge_keys:
            continue

        edge_data = {
            "id":         str(uuid.uuid4()),
            "source_id":  src_id,
            "target_id":  tgt_id,
            "relation":   relation,
            "confidence": 0.85,
            "source":     source,
        }
        G.add_edge(src_id, tgt_id, **edge_data)
        existing_edge_keys.add(key)
        added_edges += 1

    # ── 저장 ──
    _save_graph(G)
    logger.info(
        "Ontology merged: +%d nodes, +%d edges", added_nodes, added_edges
    )
    return added_nodes, added_edges


def _save_graph(G):
    import networkx as nx
    ONTOLOGY_DIR.mkdir(parents=True, exist_ok=True)

    GRAPH_PATH.write_text(
        json.dumps(nx.node_link_data(G), ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    nodes = [data for _, data in G.nodes(data=True)]
    edges = [data for _, _, data in G.edges(data=True)]
    NODES_PATH.write_text(
        json.dumps(nodes, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    EDGES_PATH.write_text(
        json.dumps(edges, ensure_ascii=False, indent=2), encoding="utf-8"
    )


# ──────────────────────────────────────────────────────────────
# 시나리오 3 — 학생 오답 패턴 온톨로지 보강
# ──────────────────────────────────────────────────────────────

_CONFUSE_ANALYSIS_PROMPT = """
당신은 한국사 교육 전문가입니다.
많은 학생들이 '{concept}' 개념을 반복적으로 틀립니다.

이 개념과 자주 혼동하는 역사적 개념들을 분석해주세요.

반드시 아래 JSON 형식으로만 출력하세요. 설명 없이 JSON만.

{{
  "confused_concepts": ["혼동 개념1", "혼동 개념2", "혼동 개념3"]
}}

주의:
- confused_concepts 는 최대 3개
- 실제로 학생들이 혼동할 법한 개념만 포함
- 반드시 JSON만 출력
"""


def reinforce_ontology(db_session, top_n: int = 10) -> dict:
    """
    weakness_profiles 상위 개념 → confused_with 엣지 보강.
    반환: {"reinforced_concepts": [str, ...]}
    """
    from sqlalchemy import select, desc
    from api.models.weakness_profile import WeaknessProfile

    # ① 상위 오답 개념 추출
    stmt = (
        select(WeaknessProfile)
        .order_by(desc(WeaknessProfile.wrong_count))
        .limit(top_n)
    )
    profiles = db_session.execute(stmt).scalars().all()

    if not profiles:
        return {"reinforced_concepts": []}

    # concept_key → concept 이름 파싱 ("조선후기_대동법" → "대동법")
    concept_names = []
    for p in profiles:
        parts = p.concept_key.split("_", 1)
        name = parts[-1] if len(parts) > 1 else p.concept_key
        if name and name not in concept_names:
            concept_names.append(name)

    bak = _backup([GRAPH_PATH, NODES_PATH, EDGES_PATH])
    reinforced: list[str] = []

    try:
        for concept in concept_names:
            try:
                success = _reinforce_concept(concept)
                if success:
                    reinforced.append(concept)
            except Exception as exc:
                logger.warning("reinforce_concept(%s) failed: %s", concept, exc)
                continue

        _reload_graphrag()
        _cleanup_bak(bak)
    except Exception:
        _restore(bak)
        raise

    return {"reinforced_concepts": reinforced}


def _reinforce_concept(concept: str) -> bool:
    """
    단일 개념에 대해 Gemma로 혼동 원인 분석 후 confused_with 엣지 보강.
    그래프에 실제로 변경이 있으면 True 반환.
    """
    import networkx as nx

    if not GRAPH_PATH.exists():
        return False

    G: nx.DiGraph = nx.node_link_graph(
        json.loads(GRAPH_PATH.read_text(encoding="utf-8"))
    )

    # 해당 개념 노드 찾기
    concept_node_id = None
    for nid, data in G.nodes(data=True):
        if data.get("name") == concept:
            concept_node_id = nid
            break

    if concept_node_id is None:
        logger.debug("Node not found in graph: %s", concept)
        return False

    # Gemma로 혼동 개념 분석
    prompt = _CONFUSE_ANALYSIS_PROMPT.format(concept=concept)
    raw = _call_gemma(prompt)
    parsed = _parse_json_from_text(raw) if raw else None

    if not parsed or "confused_concepts" not in parsed:
        logger.debug("Gemma confusion analysis failed for: %s", concept)
        return False

    confused_list: list[str] = parsed.get("confused_concepts", [])
    if not confused_list:
        return False

    # 이름 → node_id 맵
    name_to_id: dict[str, str] = {
        data.get("name", ""): nid
        for nid, data in G.nodes(data=True)
        if data.get("name")
    }

    changed = False
    existing_edges: set = {
        (u, v, d.get("relation")) for u, v, d in G.edges(data=True)
    }

    for confused_name in confused_list[:3]:
        confused_name = confused_name.strip()
        if not confused_name:
            continue

        # 온톨로지에 없으면 노드 추가
        if confused_name not in name_to_id:
            new_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, confused_name))
            node_data = {
                "id":             new_id,
                "name":           confused_name,
                "type":           "Concept",
                "era_tags":       [],
                "description":    "",
                "embedding_text": f"Concept {confused_name}",
                "confidence":     0.75,
                "source":         "student_weakness_analysis",
                "is_ambiguous":   False,
            }
            G.add_node(new_id, **node_data)
            name_to_id[confused_name] = new_id

        tgt_id = name_to_id[confused_name]

        # confused_with 엣지 추가 (양방향)
        for src, tgt in [
            (concept_node_id, tgt_id),
            (tgt_id, concept_node_id),
        ]:
            key = (src, tgt, "confused_with")
            if key not in existing_edges:
                G.add_edge(src, tgt, **{
                    "id":         str(uuid.uuid4()),
                    "source_id":  src,
                    "target_id":  tgt,
                    "relation":   "confused_with",
                    "confidence": 0.80,
                    "source":     "student_weakness_analysis",
                })
                existing_edges.add(key)
                changed = True

    if changed:
        _save_graph(G)
        logger.info("Reinforced confused_with edges for: %s", concept)

    return changed
