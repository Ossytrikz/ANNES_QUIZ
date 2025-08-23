-- Create collaborator roles enum type
CREATE TYPE public.collaborator_role AS ENUM ('owner', 'editor', 'viewer');

-- Create collaborators junction table
CREATE TABLE IF NOT EXISTS public.quiz_collaborators (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.collaborator_role NOT NULL DEFAULT 'viewer',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(quiz_id, user_id)
);

-- Add owner_id and is_public to quizzes
ALTER TABLE public.quizzes
  ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT FALSE;

-- Set owner_id for existing quizzes
DO $$
BEGIN
  UPDATE public.quizzes 
  SET owner_id = auth.uid()
  WHERE owner_id IS NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error setting owner_id: %', SQLERRM;
END $$;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_quiz_collaborators_quiz ON public.quiz_collaborators(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_collaborators_user ON public.quiz_collaborators(user_id);

-- Add RLS policies
ALTER TABLE public.quiz_collaborators ENABLE ROW LEVEL SECURITY;

-- Function to check if user is collaborator
CREATE OR REPLACE FUNCTION public.is_quiz_collaborator(
  p_quiz_id UUID, 
  p_required_role public.collaborator_role DEFAULT 'viewer'
)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.quiz_collaborators
    WHERE quiz_id = p_quiz_id
    AND user_id = auth.uid()
    AND (
      role = 'owner' OR
      (p_required_role = 'viewer' AND role IN ('viewer', 'editor', 'owner')) OR
      (p_required_role = 'editor' AND role IN ('editor', 'owner'))
    )
  );
$$;

-- Owner can manage collaborators
CREATE POLICY "Owners can manage collaborators" 
ON public.quiz_collaborators
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.quiz_collaborators qc
    WHERE qc.quiz_id = quiz_collaborators.quiz_id
    AND qc.user_id = auth.uid()
    AND qc.role = 'owner'
  )
);

-- Users can view their own collaborations
CREATE POLICY "Users can view their collaborations"
ON public.quiz_collaborators
FOR SELECT USING (auth.uid() = user_id);

-- Function to add collaborator
CREATE OR REPLACE FUNCTION public.add_quiz_collaborator(
  p_quiz_id UUID,
  p_email TEXT,
  p_role public.collaborator_role
) 
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_result JSONB;
BEGIN
  -- Look up user by email
  SELECT id INTO v_user_id 
  FROM auth.users
  WHERE email = p_email
  LIMIT 1;

  -- Check if user exists
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'User not found. Please ask them to sign up first.'
    );
  END IF;

  -- Check if user is already a collaborator
  IF EXISTS (
    SELECT 1 FROM public.quiz_collaborators
    WHERE quiz_id = p_quiz_id AND user_id = v_user_id
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'User is already a collaborator on this quiz.'
    );
  END IF;

  -- Add collaborator
  INSERT INTO public.quiz_collaborators (quiz_id, user_id, role)
  VALUES (p_quiz_id, v_user_id, p_role);

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Collaborator added successfully'
  );
END;
$$;

-- Update quizzes RLS
DROP POLICY IF EXISTS "Enable read access for all users" ON public.quizzes;
CREATE POLICY "Enable access for quiz collaborators"
ON public.quizzes
FOR ALL USING (
  is_public = true OR
  owner_id = auth.uid() OR
  public.is_quiz_collaborator(id, 'viewer')
);

-- Update questions RLS
DROP POLICY IF EXISTS "Enable read access for all users" ON public.questions;
CREATE POLICY "Enable access for quiz collaborators"
ON public.questions
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.quizzes q
    WHERE q.id = questions.quiz_id
    AND (
      q.is_public = true OR
      q.owner_id = auth.uid() OR
      public.is_quiz_collaborator(q.id, 'viewer')
    )
  )
);

-- Update attempts RLS
DROP POLICY IF EXISTS "Enable read access for all users" ON public.attempts;
CREATE POLICY "Enable access for quiz collaborators"
ON public.attempts
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.quizzes q
    WHERE q.id = attempts.quiz_id
    AND (
      q.owner_id = auth.uid() OR
      public.is_quiz_collaborator(q.id, 'viewer')
    )
  )
);

-- Update attempt_answers RLS
DROP POLICY IF EXISTS "Enable read access for all users" ON public.attempt_answers;
CREATE POLICY "Enable access for quiz collaborators"
ON public.attempt_answers
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.attempts a
    JOIN public.quizzes q ON q.id = a.quiz_id
    WHERE a.id = attempt_answers.attempt_id
    AND (
      q.owner_id = auth.uid() OR
      public.is_quiz_collaborator(q.id, 'viewer')
    )
  )
);

-- Create function to check edit permissions
CREATE OR REPLACE FUNCTION public.can_edit_quiz(p_quiz_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.quizzes q
    WHERE q.id = p_quiz_id
    AND (
      q.owner_id = auth.uid() OR
      EXISTS (
        SELECT 1 FROM public.quiz_collaborators qc
        WHERE qc.quiz_id = p_quiz_id
        AND qc.user_id = auth.uid()
        AND qc.role IN ('owner', 'editor')
      )
    )
  );
$$ LANGUAGE SQL SECURITY DEFINER;
