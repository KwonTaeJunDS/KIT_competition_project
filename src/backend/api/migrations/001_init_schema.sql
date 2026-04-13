-- =============================================================
-- 001_init_schema.sql
-- Phase 2 — Solve & Judge 기준 스키마
-- Phase 3: review_queue 추가 예정
-- Phase 4: weakness_profiles 추가 예정
-- =============================================================

-- ── extensions ───────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- gen_random_uuid()

-- ── questions ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS questions (
    id            TEXT        PRIMARY KEY,           -- UUID (seed.json 기준)
    round         INTEGER     NOT NULL,              -- 회차 (71~77)
    q_num         INTEGER     NOT NULL,              -- 문항 번호
    subject       TEXT        NOT NULL DEFAULT '한국사',
    exam_type     TEXT        NOT NULL DEFAULT '심화',
    stem          TEXT        NOT NULL,              -- 문제 본문
    choices       JSONB       NOT NULL,              -- {"①": "...", ...}
    score         INTEGER     NOT NULL DEFAULT 1,
    answer        TEXT        NOT NULL,              -- "①"~"⑤"
    answer_num    INTEGER     NOT NULL,              -- 1~5
    answer_text   TEXT        NOT NULL DEFAULT '',
    era_tags      JSONB       NOT NULL DEFAULT '[]',
    concept_tags  JSONB       NOT NULL DEFAULT '[]',
    confusion_pairs JSONB,
    explanation   TEXT        NOT NULL DEFAULT '',
    memory_hint   TEXT        NOT NULL DEFAULT '',
    source        TEXT        NOT NULL DEFAULT '',
    UNIQUE (round, q_num)
);

CREATE INDEX IF NOT EXISTS idx_questions_era_tags
    ON questions USING GIN (era_tags);

CREATE INDEX IF NOT EXISTS idx_questions_concept_tags
    ON questions USING GIN (concept_tags);

-- ── attempts ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS attempts (
    id             TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id        TEXT        NOT NULL,
    question_id    TEXT        NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    student_answer TEXT        NOT NULL,             -- "①"~"⑤"
    is_correct     BOOLEAN     NOT NULL,
    submitted_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_attempts_user_id    ON attempts (user_id);
CREATE INDEX IF NOT EXISTS idx_attempts_question_id ON attempts (question_id);

-- ── error_notes ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS error_notes (
    id            TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
    attempt_id    TEXT        NOT NULL REFERENCES attempts(id)  ON DELETE CASCADE,
    user_id       TEXT        NOT NULL,
    question_id   TEXT        NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    error_type    TEXT        NOT NULL,
    wrong_units   JSONB,                             -- list[str]
    why_wrong     TEXT,
    correct_fact  TEXT,
    review_front  TEXT,
    review_back   TEXT,
    memory_hint   TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_error_notes_user_id ON error_notes (user_id);
CREATE INDEX IF NOT EXISTS idx_error_notes_created ON error_notes (created_at DESC);

-- ── review_queue (Phase 3 준비 — 지금은 빈 테이블) ───────────
CREATE TABLE IF NOT EXISTS review_queue (
    id            TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id       TEXT        NOT NULL,
    error_note_id TEXT        NOT NULL REFERENCES error_notes(id) ON DELETE CASCADE,
    due_at        TIMESTAMPTZ NOT NULL,
    status        TEXT        NOT NULL DEFAULT 'pending',  -- pending | done
    review_count  INTEGER     NOT NULL DEFAULT 0,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_review_queue_user_due
    ON review_queue (user_id, due_at)
    WHERE status = 'pending';

-- ── weakness_profiles (Phase 4 준비 — 지금은 빈 테이블) ──────
CREATE TABLE IF NOT EXISTS weakness_profiles (
    id              TEXT    PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id         TEXT    NOT NULL,
    concept_key     TEXT    NOT NULL,
    weakness_score  NUMERIC NOT NULL DEFAULT 0,
    wrong_count     INTEGER NOT NULL DEFAULT 0,
    correct_count   INTEGER NOT NULL DEFAULT 0,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, concept_key)
);
