-- Add explicit INSERT policies for quizzes and user_profiles so authenticated users can create data

-- Quizzes: allow authenticated users to insert rows where they are the owner
CREATE POLICY IF NOT EXISTS "Users can insert their own quizzes"
  ON quizzes
  FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

-- user_profiles: allow authenticated users to create their own profile row if missing
CREATE POLICY IF NOT EXISTS "Users can insert their own profile"
  ON user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());
