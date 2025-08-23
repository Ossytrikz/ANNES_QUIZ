-- Fix RLS policies for questions table
BEGIN;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can manage questions for their quizzes" ON questions;
DROP POLICY IF EXISTS "Users can view questions for accessible quizzes" ON questions;

-- Create updated policies
-- Policy for viewing questions
CREATE POLICY "Users can view questions for accessible quizzes"
  ON questions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM quizzes 
      WHERE quizzes.id = questions.quiz_id 
      AND (
        quizzes.visibility = 'public' 
        OR quizzes.owner_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM quiz_collaborators 
          WHERE quiz_collaborators.quiz_id = quizzes.id 
          AND quiz_collaborators.user_id = auth.uid()
          AND quiz_collaborators.role IN ('owner', 'editor', 'viewer')
        )
      )
    )
  );

-- Policy for all operations (INSERT, UPDATE, DELETE)
CREATE POLICY "Users can manage questions for accessible quizzes"
  ON questions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM quizzes 
      WHERE quizzes.id = questions.quiz_id 
      AND (
        quizzes.owner_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM quiz_collaborators 
          WHERE quiz_collaborators.quiz_id = quizzes.id 
          AND quiz_collaborators.user_id = auth.uid()
          AND quiz_collaborators.role IN ('owner', 'editor')
        )
      )
    )
  );

COMMIT;
