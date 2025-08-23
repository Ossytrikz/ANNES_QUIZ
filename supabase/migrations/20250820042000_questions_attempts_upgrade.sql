-- Upgrade migration: questions meta-based model, attempts status, composite uniqueness on attempt_answers
-- Safe, additive changes to keep backward compatibility with existing data

-- 1) Questions: add meta jsonb, points numeric, order_index, explanation (already exists), widen type check to accept new values
ALTER TABLE public.questions
  ADD COLUMN IF NOT EXISTS meta jsonb NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS order_index int NOT NULL DEFAULT 0;

-- Ensure points is numeric(6,2); if integer exists, cast via new column swap pattern
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='questions' AND column_name='points' AND data_type='integer'
  ) THEN
    ALTER TABLE public.questions ADD COLUMN points_tmp numeric(6,2) NOT NULL DEFAULT 1.0;
    UPDATE public.questions SET points_tmp = points;
    ALTER TABLE public.questions DROP COLUMN points;
    ALTER TABLE public.questions RENAME COLUMN points_tmp TO points;
  END IF;
EXCEPTION WHEN duplicate_column THEN NULL; END$$;

-- Extend type CHECK to accept both legacy and new names
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'questions' AND c.conname LIKE '%check%type%'
  ) THEN
    ALTER TABLE public.questions DROP CONSTRAINT IF EXISTS questions_type_check;
  END IF;
END$$;
ALTER TABLE public.questions
  ADD CONSTRAINT questions_type_check CHECK (type IN (
    'multiple_choice_single','multiple_choice_multiple','short_text','true_false','open_question','ordering','matching',
    'mc_single','mc_multi','open'
  ));

-- Updated timestamp trigger (idempotent)
CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS trigger AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_questions_set_updated_at ON public.questions;
CREATE TRIGGER trg_questions_set_updated_at
BEFORE UPDATE ON public.questions
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2) Attempts: add status, submitted_at, score_total, meta jsonb
ALTER TABLE public.attempts
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'in_progress',
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS score_total numeric(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS meta jsonb NOT NULL DEFAULT '{}';

-- 3) Attempt answers: add auto-graded fields and composite uniqueness
ALTER TABLE public.attempt_answers
  ADD COLUMN IF NOT EXISTS is_correct boolean,
  ADD COLUMN IF NOT EXISTS score_awarded numeric(6,2) DEFAULT 0;

-- Unique composite key; keep id PK if present, but enforce uniqueness for upsert semantics
DO $$
BEGIN
  ALTER TABLE public.attempt_answers ADD CONSTRAINT attempt_answers_attempt_question_unique UNIQUE (attempt_id, question_id);
EXCEPTION WHEN duplicate_object THEN NULL; END$$;

-- 4) Indexes for ordering and attempts
CREATE INDEX IF NOT EXISTS idx_questions_order_idx ON public.questions(quiz_id, order_index);
CREATE INDEX IF NOT EXISTS idx_attempts_quiz_user ON public.attempts(quiz_id, user_id);

-- 5) RLS policies adjustments
-- Allow editors (from quiz_collaborators) to manage questions in addition to owners
DO $$
BEGIN
  CREATE POLICY "Editors can manage questions" ON public.questions
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.quiz_collaborators qc
      WHERE qc.quiz_id = questions.quiz_id AND qc.user_id = auth.uid() AND qc.role IN ('owner','editor')
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.quiz_collaborators qc
      WHERE qc.quiz_id = questions.quiz_id AND qc.user_id = auth.uid() AND qc.role IN ('owner','editor')
    )
  );
EXCEPTION WHEN duplicate_object THEN NULL; END$$;

-- Attempts visibility for quiz owners to read attempts for their quiz
DO $$
BEGIN
  CREATE POLICY "Quiz owner can read attempts for their quiz" ON public.attempts
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.quizzes q WHERE q.id = attempts.quiz_id AND q.owner_id = auth.uid()
    )
  );
EXCEPTION WHEN duplicate_object THEN NULL; END$$;

-- Attempt answers visibility for quiz owners
DO $$
BEGIN
  CREATE POLICY "Quiz owner can read attempt answers for their quiz" ON public.attempt_answers
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.attempts a
      JOIN public.quizzes q ON q.id = a.quiz_id
      WHERE a.id = attempt_answers.attempt_id AND q.owner_id = auth.uid()
    )
  );
EXCEPTION WHEN duplicate_object THEN NULL; END$$;
