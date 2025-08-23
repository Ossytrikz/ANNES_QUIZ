-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

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

-- Add owner_id and is_public to quizzes if they don't exist
DO $$
BEGIN
  -- Add owner_id column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_schema = 'public' 
                AND table_name = 'quizzes' 
                AND column_name = 'owner_id') THEN
    ALTER TABLE public.quizzes ADD COLUMN owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
  
  -- Add is_public column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_schema = 'public' 
                AND table_name = 'quizzes' 
                AND column_name = 'is_public') THEN
    ALTER TABLE public.quizzes ADD COLUMN is_public BOOLEAN NOT NULL DEFAULT FALSE;
  END IF;
END $$;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_quiz_collaborators_quiz ON public.quiz_collaborators(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_collaborators_user ON public.quiz_collaborators(user_id);

-- Enable RLS on quiz_collaborators
ALTER TABLE public.quiz_collaborators ENABLE ROW LEVEL SECURITY;

-- Function to check if user is collaborator with specific role
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

-- RLS Policies for quiz_collaborators
-- Owners can manage collaborators
CREATE POLICY "Owners can manage collaborators" 
ON public.quiz_collaborators
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.quizzes q
    WHERE q.id = quiz_collaborators.quiz_id
    AND q.owner_id = auth.uid()
  )
  OR
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
  -- Check if current user is owner
  IF NOT EXISTS (
    SELECT 1 FROM public.quizzes 
    WHERE id = p_quiz_id AND (owner_id = auth.uid() OR EXISTS (
      SELECT 1 FROM public.quiz_collaborators 
      WHERE quiz_id = p_quiz_id AND user_id = auth.uid() AND role = 'owner'
    ))
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'You do not have permission to add collaborators to this quiz.'
    );
  END IF;

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
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'message', 'Error adding collaborator: ' || SQLERRM
  );
END;
$$;

-- Update quizzes RLS if needed
DO $$
BEGIN
  -- Enable RLS if not already enabled
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'quizzes' 
    AND policyname = 'Enable access for quiz collaborators'
  ) THEN
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "Enable read access for all users" ON public.quizzes;
    
    -- Create new policy
    CREATE POLICY "Enable access for quiz collaborators"
    ON public.quizzes
    FOR ALL USING (
      is_public = true OR
      owner_id = auth.uid() OR
      public.is_quiz_collaborator(id, 'viewer')
    );
  END IF;
END $$;

-- Update questions RLS if needed
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'questions' 
    AND policyname = 'Enable access for quiz collaborators'
  ) THEN
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
  END IF;
END $$;

-- Update attempts RLS if needed
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'attempts' 
    AND policyname = 'Enable access for quiz collaborators'
  ) THEN
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
  END IF;
END $$;

-- Update attempt_answers RLS if needed
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'attempt_answers' 
    AND policyname = 'Enable access for quiz collaborators'
  ) THEN
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
  END IF;
END $$;

-- Create function to check edit permissions
CREATE OR REPLACE FUNCTION public.can_edit_quiz(p_quiz_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
AS $$
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
$$;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
