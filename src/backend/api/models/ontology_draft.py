"""
Lightweight persistence for teacher ontology workbench drafts.
"""

from datetime import datetime, timezone

from sqlalchemy import JSON, Column, DateTime, String

from api.database import Base


class OntologyDraft(Base):
    __tablename__ = "ontology_drafts"

    task_id = Column(String, primary_key=True)
    title = Column(String, nullable=False, default="")
    era = Column(String, nullable=False, default="")
    nodes_preview = Column(JSON, nullable=False, default=list)
    edges_preview = Column(JSON, nullable=False, default=list)
    updated_at = Column(
        DateTime,
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
