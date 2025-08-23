-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view questions for accessible quizzes" ON public.questions;
DROP POLICY IF EXISTS "Users can manage questions for accessible quizzes" ON public.questions;

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

-- Add a policy to allow public access to questions for public quizzes
CREATE POLICY "Public questions are viewable by everyone"
  ON public.questions
  FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.quizzes 
      WHERE public.quizzes.id = public.questions.quiz_id 
      AND public.quizzes.visibility = 'public'
    )
  );
