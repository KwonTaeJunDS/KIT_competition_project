from __future__ import annotations

"""Track weakness profiles per era/concept combination."""

import logging
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from api.models.weakness_profile import WeaknessProfile

logger = logging.getLogger(__name__)
UNCLASSIFIED = "미분류"


def update_weakness(
    db: Session,
    user_id: str,
    era_tags: list[str],
    concept_tags: list[str],
    is_correct: bool,
) -> None:
    """Update weakness counters without breaking the parent transaction."""
    try:
        with db.begin_nested():
            keys = _build_concept_keys(era_tags, concept_tags)
            for key in keys:
                _upsert(db, user_id, key, is_correct)
    except Exception:
        logger.exception("weakness_updater failed for user=%s", user_id)


def _build_concept_keys(era_tags: list, concept_tags: list) -> list[str]:
    era = _first_valid(era_tags)
    tags = [str(tag).strip() for tag in (concept_tags or []) if str(tag).strip()]

    if tags and era:
        return [f"{era}_{tag}" for tag in tags]
    if tags:
        return tags
    if era:
        return [era]
    return [UNCLASSIFIED]


def _first_valid(tags: list) -> str:
    for tag in tags or []:
        normalized = str(tag).strip()
        if normalized and normalized != UNCLASSIFIED:
            return normalized
    return ""


def _upsert(db: Session, user_id: str, concept_key: str, is_correct: bool) -> None:
    stmt = select(WeaknessProfile).where(
        WeaknessProfile.user_id == user_id,
        WeaknessProfile.concept_key == concept_key,
    )
    profile = db.execute(stmt).scalar_one_or_none()

    if profile is None:
        profile = WeaknessProfile(
            user_id=user_id,
            concept_key=concept_key,
            weakness_score=0,
            wrong_count=0,
            correct_count=0,
        )
        db.add(profile)
        db.flush()

    if is_correct:
        profile.correct_count += 1
    else:
        profile.wrong_count += 1

    total = profile.wrong_count + profile.correct_count
    profile.weakness_score = profile.wrong_count / total if total else 0
    profile.updated_at = datetime.now(timezone.utc)
