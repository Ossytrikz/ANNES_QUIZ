-- Create quiz_collaborators table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.quiz_collaborators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id uuid NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('owner', 'editor', 'viewer')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(quiz_id, user_id)
);

-- Create index for better performance if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_quiz_collaborators_quiz_id') THEN
    CREATE INDEX idx_quiz_collaborators_quiz_id ON public.quiz_collaborators(quiz_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_quiz_collaborators_user_id') THEN
    CREATE INDEX idx_quiz_collaborators_user_id ON public.quiz_collaborators(user_id);
  END IF;
END
$$;

-- Enable RLS
ALTER TABLE public.quiz_collaborators ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'quiz_collaborators' AND policyname = 'Users can view their own collaborations') THEN
    DROP POLICY "Users can view their own collaborations" ON public.quiz_collaborators;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'quiz_collaborators' AND policyname = 'Quiz owners can manage collaborators') THEN
    DROP POLICY "Quiz owners can manage collaborators" ON public.quiz_collaborators;
  END IF;
END
$$;

-- Create policies for quiz_collaborators
CREATE POLICY "Users can view their own collaborations"
  ON public.quiz_collaborators
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Quiz owners can manage collaborators"
  ON public.quiz_collaborators
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.quizzes 
      WHERE public.quizzes.id = public.quiz_collaborators.quiz_id 
      AND public.quizzes.owner_id = auth.uid()
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

CREATE TRIGGER trg_quiz_collaborators_updated_at
BEFORE UPDATE ON public.quiz_collaborators
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
