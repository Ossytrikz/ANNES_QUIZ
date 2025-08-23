-- Drop and recreate the questions table with updated type constraints
DROP TABLE IF EXISTS public.questions CASCADE;

-- Create questions table
CREATE TABLE public.questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id uuid NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN (
    'multiple_choice',  -- For backward compatibility
    'multiple_choice_single', 
    'multiple_choice_multiple', 
    'short_answer',     -- More common alias for short_text
    'short_text', 
    'true_false', 
    'essay',            -- More common alias for open_question
    'open_question', 
    'ordering', 
    'matching',
    'fill_in_blank',
    'code'
  )),
  stem text NOT NULL,
  media_url text,
  options jsonb DEFAULT '[]',
  correct_answers jsonb DEFAULT '[]',
  explanation text,
  order_items jsonb DEFAULT '[]',
  match_pairs jsonb DEFAULT '[]',
  points integer DEFAULT 1,
  tags text[] DEFAULT '{}',
  meta jsonb DEFAULT '{}',
  order_index integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create index on quiz_id for better performance
CREATE INDEX IF NOT EXISTS idx_questions_quiz_id ON public.questions(quiz_id);

-- Add RLS policies
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can manage questions for their quizzes" ON public.questions;
DROP POLICY IF EXISTS "Users can view questions for accessible quizzes" ON public.questions;

-- Create updated policies
-- Policy for viewing questions
CREATE POLICY "Users can view questions for accessible quizzes"
  ON public.questions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.quizzes 
      WHERE public.quizzes.id = public.questions.quiz_id 
      AND (
        public.quizzes.visibility = 'public' 
        OR public.quizzes.owner_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.quiz_collaborators 
          WHERE public.quiz_collaborators.quiz_id = public.quizzes.id 
          AND public.quiz_collaborators.user_id = auth.uid()
          AND public.quiz_collaborators.role IN ('owner', 'editor', 'viewer')
        )
      )
    )
  );

-- Policy for all operations (INSERT, UPDATE, DELETE)
CREATE POLICY "Users can manage questions for accessible quizzes"
  ON public.questions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.quizzes 
      WHERE public.quizzes.id = public.questions.quiz_id 
      AND (
        public.quizzes.owner_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.quiz_collaborators 
          WHERE public.quiz_collaborators.quiz_id = public.quizzes.id 
          AND public.quiz_collaborators.user_id = auth.uid()
          AND public.quiz_collaborators.role IN ('owner', 'editor')
        )
      )
    )
  );

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_questions_updated_at
BEFORE UPDATE ON public.questions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
