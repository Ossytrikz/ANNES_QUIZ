-- Create enum type for collaborator roles
CREATE TYPE public.collaborator_role AS ENUM ('owner', 'editor', 'viewer');

-- Add owner_id and is_public to quizzes table
ALTER TABLE public.quizzes
ADD COLUMN owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
ADD COLUMN is_public BOOLEAN DEFAULT FALSE;

-- Create quiz_collaborators table
CREATE TABLE public.quiz_collaborators (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.collaborator_role NOT NULL DEFAULT 'viewer',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(quiz_id, user_id)
);

-- Create index for faster lookups
CREATE INDEX idx_quiz_collaborators_quiz_id ON public.quiz_collaborators(quiz_id);
CREATE INDEX idx_quiz_collaborators_user_id ON public.quiz_collaborators(user_id);

-- Set up RLS policies for quizzes table
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;

-- Enable RLS on quiz_collaborators
ALTER TABLE public.quiz_collaborators ENABLE ROW LEVEL SECURITY;

-- Create policy functions
CREATE OR REPLACE FUNCTION public.is_quiz_owner(user_id UUID, quiz_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.quizzes 
    WHERE id = quiz_id AND owner_id = user_id
  );
$$ LANGUAGE SQL SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_quiz_collaborator(user_id UUID, quiz_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.quiz_collaborators 
    WHERE quiz_id = $2 AND user_id = $1
  );
$$ LANGUAGE SQL SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.can_edit_quiz(user_id UUID, quiz_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.quizzes q
    LEFT JOIN public.quiz_collaborators qc ON q.id = qc.quiz_id
    WHERE q.id = $2 AND (
      q.owner_id = $1 OR
      (qc.user_id = $1 AND qc.role IN ('owner', 'editor'))
    )
  );
$$ LANGUAGE SQL SECURITY DEFINER;

-- RLS policies for quizzes table
CREATE POLICY "Enable read access for public quizzes"
  ON public.quizzes FOR SELECT
  USING (is_public = true);

CREATE POLICY "Enable all access for quiz owners"
  ON public.quizzes
  USING (auth.uid() = owner_id);

CREATE POLICY "Enable read access for collaborators"
  ON public.quizzes FOR SELECT
  USING (is_quiz_collaborator(auth.uid(), id));

-- RLS policies for quiz_collaborators table
CREATE POLICY "Enable insert for quiz owners"
  ON public.quiz_collaborators FOR INSERT
  WITH CHECK (is_quiz_owner(auth.uid(), quiz_id));

CREATE POLICY "Enable update for quiz owners"
  ON public.quiz_collaborators FOR UPDATE
  USING (is_quiz_owner(auth.uid(), quiz_id));

CREATE POLICY "Enable delete for quiz owners"
  ON public.quiz_collaborators FOR DELETE
  USING (is_quiz_owner(auth.uid(), quiz_id));

CREATE POLICY "Enable read access for collaborators"
  ON public.quiz_collaborators FOR SELECT
  USING (is_quiz_collaborator(auth.uid(), quiz_id));

-- Create function to add a collaborator
CREATE OR REPLACE FUNCTION public.add_quiz_collaborator(
  p_quiz_id UUID,
  p_email TEXT,
  p_role public.collaborator_role DEFAULT 'viewer'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_result JSONB;
BEGIN
  -- Get user ID from email
  SELECT id INTO v_user_id 
  FROM auth.users 
  WHERE email = p_email;
  
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'User not found with email: ' || p_email
    );
  END IF;
  
  -- Check if user is already a collaborator
  IF EXISTS (
    SELECT 1 FROM public.quiz_collaborators 
    WHERE quiz_id = p_quiz_id AND user_id = v_user_id
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'User is already a collaborator on this quiz'
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

-- Create function to check if user can edit quiz
CREATE OR REPLACE FUNCTION public.can_edit_quiz(p_quiz_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.quizzes q
    LEFT JOIN public.quiz_collaborators qc ON q.id = qc.quiz_id
    WHERE q.id = p_quiz_id AND (
      q.owner_id = auth.uid() OR
      (qc.user_id = auth.uid() AND qc.role IN ('owner', 'editor'))
    )
  );
$$;

-- Create trigger to set owner_id on insert
CREATE OR REPLACE FUNCTION public.set_quiz_owner()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  NEW.owner_id = auth.uid();
  RETURN NEW;
END;
$$;

-- Create trigger for setting owner on insert
CREATE TRIGGER set_quiz_owner_trigger
BEFORE INSERT ON public.quizzes
FOR EACH ROW
EXECUTE FUNCTION public.set_quiz_owner();

-- Create trigger for updating timestamps
CREATE OR REPLACE FUNCTION public.update_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Create trigger for updating timestamps on quiz_collaborators
CREATE TRIGGER update_quiz_collaborators_timestamp
BEFORE UPDATE ON public.quiz_collaborators
FOR EACH ROW
EXECUTE FUNCTION public.update_timestamp();

-- Create trigger for updating timestamps on quizzes
CREATE TRIGGER update_quizzes_timestamp
BEFORE UPDATE ON public.quizzes
FOR EACH ROW
EXECUTE FUNCTION public.update_timestamp();
