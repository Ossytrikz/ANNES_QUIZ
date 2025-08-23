-- Create quizzes table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.quizzes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  subject text,
  tags text[],
  difficulty text CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  visibility text NOT NULL DEFAULT 'private' CHECK (visibility IN ('public', 'private', 'unlisted')),
  collaborative boolean DEFAULT false,
  time_limit integer,
  pass_mark integer DEFAULT 60,
  shuffle_questions boolean DEFAULT false,
  shuffle_options boolean DEFAULT false,
  immediate_feedback boolean DEFAULT true,
  show_rationale boolean DEFAULT true,
  attempt_limit integer,
  settings jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_quizzes_owner_id ON public.quizzes(owner_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_visibility ON public.quizzes(visibility);
CREATE INDEX IF NOT EXISTS idx_quizzes_created_at ON public.quizzes(created_at);

-- Enable RLS
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view public quizzes"
  ON public.quizzes
  FOR SELECT
  TO authenticated
  USING (visibility = 'public');

CREATE POLICY "Users can view their own quizzes"
  ON public.quizzes
  FOR SELECT
  TO authenticated
  USING (owner_id = auth.uid());

CREATE POLICY "Users can manage their own quizzes"
  ON public.quizzes
  FOR ALL
  TO authenticated
  USING (owner_id = auth.uid());

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_quizzes_updated_at
BEFORE UPDATE ON public.quizzes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
