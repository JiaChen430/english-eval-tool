-- ============================================================
-- English Eval — Initial Schema
-- ============================================================
-- Run this migration in your Supabase SQL editor or via the
-- Supabase CLI:  supabase db push
-- ============================================================

-- Enable UUID generation (available by default in Supabase)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ────────────────────────────────────────────────────────────
-- Table: error_notebook
-- Stores individual failed practice exercises so users can
-- review and master them over time.
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS error_notebook (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at         TIMESTAMPTZ NOT NULL    DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL    DEFAULT NOW(),

  -- Context: the full text that was evaluated
  original_text      TEXT        NOT NULL,
  corrected_text     TEXT        NOT NULL,

  -- The specific error
  error_category     TEXT        NOT NULL
    CHECK (error_category IN ('grammar', 'vocabulary', 'naturalness', 'punctuation')),
  error_description  TEXT        NOT NULL,   -- The explanation shown to the user
  error_original     TEXT        NOT NULL,   -- Problematic word/phrase from original
  error_corrected    TEXT        NOT NULL,   -- The corrected replacement

  -- The practice exercise linked to this error
  exercise_type      TEXT        NOT NULL
    CHECK (exercise_type IN ('fill-in-blank', 'multiple-choice')),
  exercise_data      JSONB       NOT NULL,   -- Full exercise object (see lib/types.ts)

  -- Tracking
  attempt_count      INTEGER     NOT NULL DEFAULT 0,
  last_attempted_at  TIMESTAMPTZ,
  mastered           BOOLEAN     NOT NULL DEFAULT FALSE
);

-- ────────────────────────────────────────────────────────────
-- Indexes
-- ────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_error_notebook_mastered
  ON error_notebook (mastered);

CREATE INDEX IF NOT EXISTS idx_error_notebook_category
  ON error_notebook (error_category);

CREATE INDEX IF NOT EXISTS idx_error_notebook_created_at
  ON error_notebook (created_at DESC);

-- ────────────────────────────────────────────────────────────
-- Trigger: auto-update updated_at on row changes
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_error_notebook_updated_at ON error_notebook;

CREATE TRIGGER trg_error_notebook_updated_at
  BEFORE UPDATE ON error_notebook
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ────────────────────────────────────────────────────────────
-- Row Level Security
-- The app uses the service role key server-side, so RLS is
-- enabled but all operations are allowed via service role.
-- If you add user authentication later, tighten these policies.
-- ────────────────────────────────────────────────────────────
ALTER TABLE error_notebook ENABLE ROW LEVEL SECURITY;

-- Allow all operations when using the service role key
-- (the Next.js API routes use the service role key, which bypasses RLS)
-- For a public anon key, you would scope these to auth.uid().
CREATE POLICY "service_role_all" ON error_notebook
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
