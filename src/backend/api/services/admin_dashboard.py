from __future__ import annotations

from collections import Counter, defaultdict
from datetime import datetime, timezone
import re
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from api.models.attempt import Attempt
from api.models.error_note import ErrorNote
from api.models.question import Question
from api.models.review_queue import ReviewQueue
from api.models.weakness_profile import WeaknessProfile

_ROSTER_SEED = [
    ("김천수", "고3 A반"),
    ("박영희", "고3 A반"),
    ("이민호", "고3 B반"),
    ("정다은", "고3 B반"),
    ("최서윤", "고2 A반"),
    ("한지호", "고2 B반"),
    ("오하린", "고2 C반"),
    ("강민준", "고1 A반"),
]
_SOURCE_STATUS = ["자동 추출 완료", "관계 검토 필요", "업로드 대기"]
_REVIEW_SIGNAL_TONES = {
    "high": "집중",
    "mid": "주의",
    "low": "관찰",
}
_NOTE_SIGNAL_TONES = {
    "high": "집중",
    "mid": "주의",
    "low": "안정",
}


def build_admin_dashboard_bundle(db: Session) -> dict[str, Any]:
    now = datetime.now(timezone.utc)

    attempt_rows = db.execute(
        select(Attempt, Question)
        .join(Question, Attempt.question_id == Question.id)
        .order_by(Attempt.submitted_at.desc())
    ).all()
    note_rows = db.execute(
        select(ErrorNote, Attempt, Question)
        .join(Attempt, ErrorNote.attempt_id == Attempt.id)
        .join(Question, ErrorNote.question_id == Question.id)
        .order_by(ErrorNote.created_at.desc())
    ).all()
    review_rows = db.execute(
        select(ReviewQueue, ErrorNote, Question)
        .join(ErrorNote, ReviewQueue.error_note_id == ErrorNote.id)
        .join(Question, ErrorNote.question_id == Question.id)
        .where(ReviewQueue.status == "pending")
        .order_by(ReviewQueue.due_at.asc())
    ).all()
    weakness_rows = db.execute(select(WeaknessProfile)).scalars().all()

    user_ids = sorted(
        {
            *[attempt.user_id for attempt, _ in attempt_rows],
            *[note.user_id for note, _, _ in note_rows],
            *[queue.user_id for queue, _, _ in review_rows],
            *[profile.user_id for profile in weakness_rows],
        }
    )

    if not user_ids:
        return _empty_bundle()

    attempts_by_user: dict[str, list[tuple[Attempt, Question]]] = defaultdict(list)
    notes_by_user: dict[str, list[tuple[ErrorNote, Attempt, Question]]] = defaultdict(list)
    reviews_by_user: dict[str, list[tuple[ReviewQueue, ErrorNote, Question]]] = defaultdict(list)
    weakness_by_user: dict[str, list[WeaknessProfile]] = defaultdict(list)

    for attempt, question in attempt_rows:
        attempts_by_user[attempt.user_id].append((attempt, question))
    for note, attempt, question in note_rows:
        notes_by_user[note.user_id].append((note, attempt, question))
    for queue, note, question in review_rows:
        reviews_by_user[queue.user_id].append((queue, note, question))
    for profile in weakness_rows:
        weakness_by_user[profile.user_id].append(profile)

    base_students: list[dict[str, Any]] = []

    for index, user_id in enumerate(user_ids):
        student_meta = _student_meta(user_id, index)
        user_attempts = attempts_by_user.get(user_id, [])
        user_notes = notes_by_user.get(user_id, [])
        user_reviews = reviews_by_user.get(user_id, [])
        user_weakness = weakness_by_user.get(user_id, [])

        all_questions = [question for _, question in user_attempts]
        note_questions = [question for _, _, question in user_notes]

        era_counter = Counter(tag for question in note_questions + all_questions for tag in (question.era_tags or []))
        concept_counter = Counter(tag for question in note_questions for tag in (question.concept_tags or []))
        if not concept_counter:
            concept_counter = Counter(_concept_from_profile(profile.concept_key) for profile in user_weakness)
        concept_counter = Counter({key: value for key, value in concept_counter.items() if key})
        error_counter = Counter(note.error_type for note, _, _ in user_notes if note.error_type)

        primary_era = _pick_primary_era(era_counter)
        top_concepts = [item for item, _ in concept_counter.most_common(3)]
        primary_concept = top_concepts[0] if top_concepts else (primary_era or "학습 구조")
        primary_error = error_counter.most_common(1)[0][0] if error_counter else "핵심 포인트 미파악"

        due_reviews = [
            row for row in user_reviews
            if row[0].due_at.replace(tzinfo=timezone.utc) <= now
        ]
        overdue_count = len(due_reviews)
        max_delay_days = max(
            (
                (now - row[0].due_at.replace(tzinfo=timezone.utc)).days
                for row in due_reviews
            ),
            default=0,
        )

        latest_attempt = user_attempts[0][0] if user_attempts else None
        latest_note = user_notes[0][0] if user_notes else None

        risk = _derive_risk(len(user_notes), overdue_count, max_delay_days, len(top_concepts))
        recent_status = _derive_recent_status(latest_attempt, latest_note, user_reviews, now)
        leak_category = _derive_leak_category(primary_error, top_concepts, overdue_count)
        weak_link = _build_weak_link(primary_era, top_concepts, primary_error)
        missed_teaching = _build_missed_teaching(primary_era, primary_concept, primary_error)
        next_teaching_move = _build_next_move(primary_era, primary_concept, overdue_count)
        recommended_action, action_type = _build_recommended_action(overdue_count, len(top_concepts), len(user_notes))
        summary = _build_student_summary(primary_era, primary_concept, primary_error, len(user_notes), overdue_count)
        teacher_focus = _build_teacher_focus(primary_era, primary_concept, primary_error, overdue_count)

        focus_key = _slugify(f"{primary_era}-{primary_concept}") or f"student-{index + 1}"

        base_students.append(
            {
                "id": user_id,
                "name": student_meta["name"],
                "className": student_meta["className"],
                "currentEra": primary_era,
                "brokenFlows": max(len(top_concepts), len(user_notes), 1),
                "overdueReviews": overdue_count,
                "reviewDelayDays": max_delay_days,
                "weakLink": weak_link,
                "axisTag": _build_axis_tag(primary_era, primary_concept),
                "leakCategory": leak_category,
                "missedTeaching": missed_teaching,
                "nextTeachingMove": next_teaching_move,
                "recommendedAction": recommended_action,
                "actionType": action_type,
                "recentStatus": recent_status,
                "risk": risk,
                "summary": summary,
                "teacherFocus": teacher_focus,
                "topConcepts": top_concepts,
                "primaryConcept": primary_concept,
                "primaryError": primary_error,
                "focusKey": focus_key,
                "latestAttempt": latest_attempt,
                "latestNote": latest_note,
                "userNotes": user_notes,
                "userReviews": user_reviews,
                "userWeakness": user_weakness,
            }
        )

    groups: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for student in base_students:
        groups[student["focusKey"]].append(student)

    ranked_groups = sorted(
        groups.items(),
        key=lambda item: (
            -len(item[1]),
            -max(student["overdueReviews"] for student in item[1]),
            item[0],
        ),
    )

    ontology_tasks: list[dict[str, Any]] = []
    delivery_gaps: list[dict[str, Any]] = []
    hotspot_clusters: list[dict[str, Any]] = []
    source_queue: list[dict[str, Any]] = []
    task_id_by_focus: dict[str, str] = {}

    for group_index, (focus_key, members) in enumerate(ranked_groups[:6]):
        exemplar = members[0]
        task_id = f"task-{focus_key}"
        task_id_by_focus[focus_key] = task_id

        title = _build_task_title(exemplar["primaryConcept"])
        issue = (
            f"{exemplar['primaryConcept']} 축에서 학생들이 반복적으로 흐름을 끊고 있어 "
            f"설명 구조를 다시 묶어야 합니다."
        )
        editing_goal = (
            f"{exemplar['currentEra']}의 {exemplar['primaryConcept']} 개념을 "
            f"원인-전개-결과 흐름으로 다시 정리합니다."
        )
        student_impact_ids = [student["id"] for student in members]
        nodes_preview = _build_nodes_preview(exemplar["currentEra"], exemplar["primaryConcept"], exemplar["primaryError"])
        edges_preview = _build_edges_preview(nodes_preview)

        ontology_tasks.append(
            {
                "id": task_id,
                "title": title,
                "era": exemplar["currentEra"],
                "source": f"학생 오답 분석 {len(members)}명",
                "issue": issue,
                "nodes": len(nodes_preview),
                "edges": len(edges_preview),
                "editingGoal": editing_goal,
                "studentImpactIds": student_impact_ids,
                "nodesPreview": nodes_preview,
                "edgesPreview": edges_preview,
            }
        )

        delivery_gaps.append(
            {
                "title": f"{exemplar['primaryConcept']} 설명 누수",
                "detail": (
                    f"{exemplar['currentEra']} 단원에서 {exemplar['primaryConcept']} 축이 "
                    f"학생 답안에서 자주 끊기고 있습니다."
                ),
                "affectedStudents": len(members),
                "relatedTaskId": task_id,
            }
        )

        hotspot_clusters.append(
            {
                "title": exemplar["primaryConcept"],
                "era": exemplar["currentEra"],
                "affectedStudents": len(members),
                "signal": (
                    f"{len(members)}명의 학생이 {exemplar['primaryError']} 유형으로 "
                    f"{exemplar['primaryConcept']} 개념을 반복적으로 놓치고 있습니다."
                ),
                "recommendedAction": editing_goal,
            }
        )

        source_queue.append(
            {
                "title": f"{exemplar['primaryConcept']} 오답 근거 묶음",
                "status": _SOURCE_STATUS[group_index % len(_SOURCE_STATUS)],
                "note": (
                    f"{len(members)}명의 최근 오답과 복습 신호를 묶어 "
                    f"관계 편집 근거로 사용할 수 있습니다."
                ),
                "relatedTaskId": task_id,
            }
        )

    students: list[dict[str, Any]] = []
    student_leak_details: list[dict[str, Any]] = []

    for student in sorted(
        base_students,
        key=lambda item: (
            _risk_rank(item["risk"]),
            -item["overdueReviews"],
            -item["brokenFlows"],
            item["name"],
        ),
    ):
        related_task_id = task_id_by_focus.get(student["focusKey"])
        related_members = groups.get(student["focusKey"], [student])
        risk_label = (
            f"{student['currentEra']} {student['primaryConcept']} 복원 우선"
            if student["currentEra"]
            else f"{student['primaryConcept']} 복원 우선"
        )
        broken_chains = _build_broken_chains(student)
        review_signals = _build_review_signals(student)
        interventions = _build_interventions(student)
        teacher_notes = _build_teacher_notes(student)

        students.append(
            {
                "id": student["id"],
                "name": student["name"],
                "className": student["className"],
                "currentEra": student["currentEra"],
                "brokenFlows": student["brokenFlows"],
                "overdueReviews": student["overdueReviews"],
                "reviewDelayDays": student["reviewDelayDays"],
                "weakLink": student["weakLink"],
                "axisTag": student["axisTag"],
                "leakCategory": student["leakCategory"],
                "missedTeaching": student["missedTeaching"],
                "nextTeachingMove": student["nextTeachingMove"],
                "recommendedAction": student["recommendedAction"],
                "actionType": student["actionType"],
                "recentStatus": student["recentStatus"],
                "risk": student["risk"],
            }
        )

        student_leak_details.append(
            {
                "id": student["id"],
                "summary": student["summary"],
                "riskLabel": risk_label,
                "teacherFocus": student["teacherFocus"],
                "recommendedOntologyTaskId": related_task_id or ontology_tasks[0]["id"],
                "brokenChains": broken_chains,
                "reviewSignals": review_signals,
                "interventions": interventions,
                "teacherNotes": teacher_notes,
            }
        )

    summary_cards = _build_summary_cards(
        students=students,
        ontology_tasks=ontology_tasks,
        delivery_gaps=delivery_gaps,
        review_rows=review_rows,
    )

    return {
        "summaryCards": summary_cards,
        "students": students,
        "ontologyTasks": ontology_tasks,
        "deliveryGaps": delivery_gaps,
        "hotspotClusters": hotspot_clusters,
        "sourceQueue": source_queue,
        "studentLeakDetails": student_leak_details,
    }


def _empty_bundle() -> dict[str, Any]:
    return {
        "summaryCards": [],
        "students": [],
        "ontologyTasks": [],
        "deliveryGaps": [],
        "hotspotClusters": [],
        "sourceQueue": [],
        "studentLeakDetails": [],
    }


def _student_meta(user_id: str, index: int) -> dict[str, str]:
    if index < len(_ROSTER_SEED):
        name, class_name = _ROSTER_SEED[index]
        return {"name": name, "className": class_name}

    return {
        "name": f"학생 {index + 1:02d}",
        "className": f"학습 {index % 3 + 1}반",
    }


def _pick_primary_era(counter: Counter[str]) -> str:
    if not counter:
        return "학습 흐름 미분류"
    return counter.most_common(1)[0][0]


def _concept_from_profile(concept_key: str) -> str:
    if not concept_key:
        return ""
    if "_" not in concept_key:
        return concept_key
    return concept_key.split("_", 1)[1]


def _derive_risk(note_count: int, overdue_count: int, max_delay_days: int, concept_count: int) -> str:
    if overdue_count >= 3 or note_count >= 4 or max_delay_days >= 5:
        return "높음"
    if overdue_count >= 1 or note_count >= 2 or concept_count >= 2:
        return "중간"
    return "관찰"


def _derive_recent_status(
    latest_attempt: Attempt | None,
    latest_note: ErrorNote | None,
    reviews: list[tuple[ReviewQueue, ErrorNote, Question]],
    now: datetime,
) -> str:
    if latest_note and (now - latest_note.created_at.replace(tzinfo=timezone.utc)).days <= 3:
        return "재실패"
    if latest_attempt and (now - latest_attempt.submitted_at.replace(tzinfo=timezone.utc)).days <= 7:
        return "신규"
    if reviews:
        return "진행 중"
    return "안정"


def _derive_leak_category(primary_error: str, concepts: list[str], overdue_count: int) -> str:
    if "시대" in primary_error:
        return "시대 흐름 누락"
    if overdue_count >= 2 or len(concepts) >= 2:
        return "반복 누수 축 있음"
    return "개념 연결 불안정"


def _build_weak_link(primary_era: str, concepts: list[str], primary_error: str) -> str:
    tokens = [primary_era, *concepts[:2], primary_error]
    normalized = [token.strip() for token in tokens if token and token.strip()]
    return " -> ".join(normalized[:4])


def _build_axis_tag(primary_era: str, primary_concept: str) -> str:
    if primary_era == "학습 흐름 미분류":
        return f"{primary_concept} 축"
    return f"{primary_era} {primary_concept} 축"


def _build_missed_teaching(primary_era: str, primary_concept: str, primary_error: str) -> str:
    return (
        f"{primary_era} 단원에서 {primary_concept} 개념을 설명할 때 "
        f"{primary_error} 유형의 연결 고리가 비어 있습니다."
    )


def _build_next_move(primary_era: str, primary_concept: str, overdue_count: int) -> str:
    if overdue_count >= 2:
        return (
            f"{primary_era}의 {primary_concept} 흐름을 다시 설명한 뒤 "
            "밀린 복습을 바로 재배정해야 합니다."
        )
    return f"{primary_era}의 {primary_concept} 구조를 원인-전개-결과로 다시 묶어 설명합니다."


def _build_recommended_action(overdue_count: int, concept_count: int, note_count: int) -> tuple[str, str]:
    if concept_count >= 2 or note_count >= 3:
        return ("관계 편집 후보", "ontology")
    if overdue_count >= 2:
        return ("복습 재배정 필요", "review")
    if note_count >= 1:
        return ("구조 설명 다시 하기", "explain")
    return ("추가 관찰 유지", "observe")


def _build_student_summary(
    primary_era: str,
    primary_concept: str,
    primary_error: str,
    note_count: int,
    overdue_count: int,
) -> str:
    return (
        f"{primary_era} 단원에서 {primary_concept} 축이 {primary_error} 형태로 반복되고 있습니다. "
        f"오답 노트 {note_count}건, 밀린 복습 {overdue_count}건이 쌓여 있어 흐름 복원이 필요합니다."
    )


def _build_teacher_focus(
    primary_era: str,
    primary_concept: str,
    primary_error: str,
    overdue_count: int,
) -> str:
    review_sentence = (
        "복습 지연이 커서 재설명 직후 바로 확인 질문을 묶어야 합니다."
        if overdue_count >= 2
        else "다음 문제로 넘어가기 전에 연결 질문을 짧게 확인하는 편이 좋습니다."
    )
    return (
        f"{primary_era}의 {primary_concept} 개념을 {primary_error} 오류 없이 "
        f"원인-전개-결과 순으로 다시 세워야 합니다. {review_sentence}"
    )


def _build_task_title(primary_concept: str) -> str:
    return f"{primary_concept} 구조 정리"


def _build_nodes_preview(primary_era: str, primary_concept: str, primary_error: str) -> list[dict[str, str]]:
    return [
        {
            "id": _slugify(f"{primary_era}-era") or "era",
            "label": primary_era,
            "role": "시대 축",
            "note": "학습 흐름을 묶는 기준 시기입니다.",
        },
        {
            "id": _slugify(f"{primary_concept}-concept") or "concept",
            "label": primary_concept,
            "role": "핵심 개념",
            "note": "학생들이 가장 자주 끊기는 개념 연결 지점입니다.",
        },
        {
            "id": _slugify(f"{primary_error}-error") or "error",
            "label": primary_error,
            "role": "오류 축",
            "note": "오답 노트에서 반복적으로 관측된 오류 유형입니다.",
        },
    ]


def _build_edges_preview(nodes: list[dict[str, str]]) -> list[dict[str, str]]:
    if len(nodes) < 3:
        return []
    return [
        {
            "from": nodes[0]["label"],
            "to": nodes[1]["label"],
            "label": "설명 흐름 연결",
            "status": "보강",
        },
        {
            "from": nodes[1]["label"],
            "to": nodes[2]["label"],
            "label": "오답 원인 추적",
            "status": "추가",
        },
        {
            "from": nodes[0]["label"],
            "to": nodes[2]["label"],
            "label": "시기-오류 연결",
            "status": "유지",
        },
    ]


def _build_broken_chains(student: dict[str, Any]) -> list[dict[str, Any]]:
    concept_tokens = student["topConcepts"][:2] or [student["primaryConcept"]]
    chains: list[dict[str, Any]] = []
    for index, concept in enumerate(concept_tokens, start=1):
        chains.append(
            {
                "title": f"{concept} 연결 고리",
                "era": student["currentEra"],
                "chain": [
                    student["currentEra"],
                    concept,
                    student["primaryError"],
                ],
                "whyItBreaks": (
                    f"{concept} 설명이 {student['primaryError']} 유형으로 끊겨 "
                    "학생이 다음 문제에서 같은 축을 다시 놓칩니다."
                ),
                "examAxis": f"{student['currentEra']} -> {concept} -> {student['primaryError']}",
            }
        )
        if index >= 2:
            break
    return chains


def _build_review_signals(student: dict[str, Any]) -> list[dict[str, str]]:
    review_level = "high" if student["overdueReviews"] >= 3 else "mid" if student["overdueReviews"] >= 1 else "low"
    note_level = "high" if student["brokenFlows"] >= 3 else "mid" if student["brokenFlows"] >= 2 else "low"
    weakness_level = "high" if len(student["userWeakness"]) >= 3 else "mid" if student["userWeakness"] else "low"
    return [
        {
            "title": f"밀린 복습 {student['overdueReviews']}건",
            "status": _REVIEW_SIGNAL_TONES[review_level],
            "note": (
                f"최대 {student['reviewDelayDays']}일 지연된 복습 항목이 있어 "
                "학습 흐름 확인이 필요합니다."
            ),
        },
        {
            "title": f"오답 노트 {student['brokenFlows']}건",
            "status": _NOTE_SIGNAL_TONES[note_level],
            "note": "반복 오답 축이 끊긴 흐름으로 누적되고 있습니다.",
        },
        {
            "title": f"약점 프로필 {len(student['userWeakness'])}개",
            "status": _NOTE_SIGNAL_TONES[weakness_level],
            "note": "weakness profile 기준으로 추가 설명 축을 정리할 수 있습니다.",
        },
    ]


def _build_interventions(student: dict[str, Any]) -> list[dict[str, str]]:
    interventions: list[dict[str, str]] = []
    if student["latestNote"]:
        interventions.append(
            {
                "date": _format_short_date(student["latestNote"].created_at),
                "type": "오답 노트 생성",
                "action": f"{student['primaryConcept']} 축에 대한 오답 분석이 저장되었습니다.",
                "result": "다음 설명 흐름과 복습 큐에 반영할 수 있는 근거가 쌓였습니다.",
            }
        )
    if student["userReviews"]:
        queue = student["userReviews"][0][0]
        interventions.append(
            {
                "date": _format_short_date(queue.due_at),
                "type": "복습 큐 배정",
                "action": f"{student['overdueReviews']}건의 복습 큐가 현재 보류 중입니다.",
                "result": "재설명 이후 바로 복습 재확인을 붙이는 것이 효과적입니다.",
            }
        )
    if student["latestAttempt"]:
        interventions.append(
            {
                "date": _format_short_date(student["latestAttempt"].submitted_at),
                "type": "최근 풀이 기록",
                "action": f"{student['currentEra']} 단원에서 최근 풀이가 기록되었습니다.",
                "result": f"현재 상태는 {student['recentStatus']}으로 분류됩니다.",
            }
        )
    return interventions[:3]


def _build_teacher_notes(student: dict[str, Any]) -> list[str]:
    return [
        (
            f"{student['primaryConcept']} 개념을 단일 사실로 다시 암기시키기보다 "
            "원인-전개-결과 흐름으로 묶어 설명하는 편이 좋습니다."
        ),
        (
            f"{student['currentEra']} 문제를 풀기 전에 {student['primaryError']} 유형을 "
            "짧은 질문으로 먼저 확인하면 재실패 확률을 줄일 수 있습니다."
        ),
    ]


def _build_summary_cards(
    students: list[dict[str, Any]],
    ontology_tasks: list[dict[str, Any]],
    delivery_gaps: list[dict[str, Any]],
    review_rows: list[tuple[ReviewQueue, ErrorNote, Question]],
) -> list[dict[str, str]]:
    urgent_students = sum(1 for student in students if student["risk"] == "높음")
    review_students = len({queue.user_id for queue, _, _ in review_rows})

    return [
        {
            "label": "집중 관리 학생",
            "value": f"{len(students)}명",
            "detail": "학습 신호가 감지된 학생",
            "tone": "rose",
        },
        {
            "label": "전달 실패 알림",
            "value": f"{len(delivery_gaps)}건",
            "detail": "설명 구조를 다시 묶어야 하는 축",
            "tone": "amber",
        },
        {
            "label": "편집 대기 노드",
            "value": f"{sum(task['nodes'] for task in ontology_tasks)}개",
            "detail": "온톨로지 편집 후보 개념",
            "tone": "blue",
        },
        {
            "label": "이번 주 재확인권",
            "value": f"{max(review_students, urgent_students)}명",
            "detail": "복습 재배정이 필요한 학생",
            "tone": "emerald",
        },
    ]


def _slugify(value: str) -> str:
    slug = re.sub(r"[^a-zA-Z0-9가-힣]+", "-", value).strip("-").lower()
    return slug


def _format_short_date(value: datetime | None) -> str:
    if value is None:
        return ""
    date = value.replace(tzinfo=timezone.utc)
    return f"{date.month}월 {date.day}일"


def _risk_rank(risk: str) -> int:
    if risk == "높음":
        return 0
    if risk == "중간":
        return 1
    return 2
