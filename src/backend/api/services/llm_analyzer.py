from __future__ import annotations

"""Phase 5 — Gemma LLM 기반 오답 분석.

우선순위:
  1. Ollama 로컬 (OLLAMA_URL 환경변수, 기본 http://localhost:11434)
  2. Google Gemini API (GOOGLE_API_KEY 환경변수)
  3. None 반환 → error_analyzer.py가 rule-based fallback 사용
"""

import json
import logging
import os
import urllib.error
import urllib.request
from typing import Any

logger = logging.getLogger(__name__)

# ── 환경변수 ─────────────────────────────────────────────────
OLLAMA_URL   = os.getenv("OLLAMA_URL",    "http://localhost:11434")
GEMMA_MODEL  = os.getenv("GEMMA_MODEL",   "gemma3:27b")
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY", "")
GOOGLE_MODEL = os.getenv("GOOGLE_MODEL",  "gemma-3-27b-it")
LLM_TIMEOUT  = int(os.getenv("LLM_TIMEOUT_SEC", "30"))

# ── 오답 유형 Taxonomy (CONTRACT 고정값) ───────────────────────
TAXONOMY = [
    "시대 혼동",
    "인물-사건 매칭 오류",
    "정책/제도 혼동",
    "원인-결과 인과 오인",
    "비슷한 개념 혼동",
    "핵심 포인트 미파악",
    "지엽 정보 과몰입",
]
_TAXONOMY_SET = set(TAXONOMY)


# ── 공개 인터페이스 ──────────────────────────────────────────
def analyze_with_llm(question_dict: dict, student_answer_num: int) -> dict | None:
    """LLM 오답 분석. 실패 시 None 반환 (caller가 fallback 처리)."""
    prompt = _build_prompt(question_dict, student_answer_num)

    result = _call_ollama(prompt)
    if result is not None:
        return result

    if GOOGLE_API_KEY:
        result = _call_google(prompt)
        if result is not None:
            return result

    return None


# ── 프롬프트 빌더 ────────────────────────────────────────────
def _build_prompt(q: dict, student_num: int) -> str:
    choices: dict = q.get("choices") or {}
    answer: str   = q.get("answer") or ""

    def label(num: int) -> str:
        return {1: "①", 2: "②", 3: "③", 4: "④", 5: "⑤"}.get(num, "")

    student_label  = label(student_num)
    student_text   = str(choices.get(student_label) or "").strip()
    correct_label  = answer or label(q.get("answer_num") or 0)
    correct_text   = str(choices.get(correct_label) or q.get("answer_text") or "").strip()

    choices_block = "\n".join(
        f"  {k}: {v}" for k, v in choices.items() if k and v
    ) or "  (선택지 정보 없음)"

    taxonomy_str = " / ".join(TAXONOMY)
    era   = ", ".join(q.get("era_tags") or []) or "미분류"
    concept = ", ".join(q.get("concept_tags") or []) or "미분류"

    return f"""당신은 한국사능력검정시험 오답 분석 전문가입니다.
다음 문항에서 학생이 틀린 이유를 분석하고, 반드시 아래 JSON 형식으로만 응답하세요.
JSON 외 다른 텍스트는 절대 출력하지 마세요.

[문항 정보]
시대: {era}
개념: {concept}
문제: {(q.get("stem") or "").strip()}

[선택지]
{choices_block}

[학생 답안] {student_label} {student_text}
[정답]     {correct_label} {correct_text}

[오답 유형 목록] (아래 7가지 중 하나만 선택)
{taxonomy_str}

응답 JSON 형식:
{{
  "error_type": "<위 목록 중 하나>",
  "wrong_units": ["<취약 개념 1>", "<취약 개념 2>"],
  "why_wrong": "<학생이 왜 이 선택지를 골랐는지 1~2문장>",
  "correct_fact": "<정답의 핵심 사실 1문장>",
  "memory_hint": "<암기 키워드 10자 이내>",
  "review_front": "<복습 카드 앞면: 핵심 질문 한 줄>",
  "review_back": "<복습 카드 뒷면: 정답 근거 1~2문장>"
}}"""


# ── Ollama 호출 ──────────────────────────────────────────────
def _call_ollama(prompt: str) -> dict | None:
    url = f"{OLLAMA_URL.rstrip('/')}/api/generate"
    payload = json.dumps({
        "model": GEMMA_MODEL,
        "prompt": prompt,
        "stream": False,
        "format": "json",
        "options": {"temperature": 0.2, "num_predict": 512},
    }).encode()

    req = urllib.request.Request(
        url, data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=LLM_TIMEOUT) as resp:
            body = json.loads(resp.read())
        raw = body.get("response") or ""
        return _parse_and_validate(raw)
    except Exception as exc:
        logger.debug("Ollama call failed: %s", exc)
        return None


# ── Google Gemini API 호출 ───────────────────────────────────
def _call_google(prompt: str) -> dict | None:
    url = (
        f"https://generativelanguage.googleapis.com/v1beta/models/"
        f"{GOOGLE_MODEL}:generateContent"
    )
    payload = json.dumps({
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.2,
            "maxOutputTokens": 512,
            "responseMimeType": "application/json",
        },
    }).encode()

    req = urllib.request.Request(
        url, data=payload,
        headers={
            "Content-Type": "application/json",
            "x-goog-api-key": GOOGLE_API_KEY,
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=LLM_TIMEOUT) as resp:
            body = json.loads(resp.read())
        raw = (
            body.get("candidates", [{}])[0]
            .get("content", {})
            .get("parts", [{}])[0]
            .get("text", "")
        )
        return _parse_and_validate(raw)
    except Exception as exc:
        logger.debug("Google Gemini call failed: %s", exc)
        return None


# ── 응답 파싱 + 검증 ─────────────────────────────────────────
def _parse_and_validate(raw: str) -> dict | None:
    """JSON 파싱 후 필수 필드 + taxonomy 검증. 실패 시 None."""
    if not raw:
        return None

    # JSON 블록 추출 (```json ... ``` 방어)
    text = raw.strip()
    if text.startswith("```"):
        lines = text.splitlines()
        text = "\n".join(
            l for l in lines if not l.strip().startswith("```")
        ).strip()

    try:
        data: dict[str, Any] = json.loads(text)
    except json.JSONDecodeError:
        logger.debug("LLM response is not valid JSON: %.200s", raw)
        return None

    # 필수 필드 확인
    required = {"error_type", "why_wrong", "correct_fact", "memory_hint",
                "review_front", "review_back"}
    if not required.issubset(data.keys()):
        logger.debug("LLM response missing fields: %s", required - data.keys())
        return None

    # error_type taxonomy 강제
    if data.get("error_type") not in _TAXONOMY_SET:
        logger.debug("LLM returned invalid error_type: %s", data.get("error_type"))
        data["error_type"] = "핵심 포인트 미파악"

    # wrong_units 타입 보장
    if not isinstance(data.get("wrong_units"), list):
        data["wrong_units"] = []

    # 빈 문자열 방어
    for key in ("why_wrong", "correct_fact", "memory_hint", "review_front", "review_back"):
        if not str(data.get(key) or "").strip():
            return None  # 핵심 필드 비어있으면 fallback이 낫다

    return data
