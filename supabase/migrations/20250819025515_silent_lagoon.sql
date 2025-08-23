/*
  # Initial Schema for Anne's Quiz Platform

  1. New Tables
    - `user_profiles`
      - `id` (uuid, references auth.users)
      - `display_name` (text)
      - `bio` (text)
      - `avatar_url` (text)
      - `subjects` (text array)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `quizzes`
      - `id` (uuid, primary key)
      - `owner_id` (uuid, references user_profiles)
      - `title` (text)
      - `description` (text)
      - `subject` (text)
      - `tags` (text array)
      - `difficulty` (text: beginner, intermediate, advanced)
      - `visibility` (text: private, unlisted, public)
      - `collaborative` (boolean)
      - `time_limit` (integer, minutes)
      - `pass_mark` (integer, percentage)
      - `shuffle_questions` (boolean)
      - `shuffle_options` (boolean)
      - `immediate_feedback` (boolean)
      - `show_rationale` (boolean)
      - `attempt_limit` (integer)
      - `settings` (jsonb)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `quiz_collaborators`
      - `quiz_id` (uuid, references quizzes)
      - `user_id` (uuid, references user_profiles)
      - `role` (text: owner, editor, viewer)
      - `created_at` (timestamp)
    
    - `questions`
      - `id` (uuid, primary key)
      - `quiz_id` (uuid, references quizzes)
      - `type` (text: multiple_choice_single, multiple_choice_multiple, short_text, true_false, open_question, ordering, matching)
      - `stem` (text)
      - `media_url` (text)
      - `options` (jsonb array)
      - `correct_answers` (jsonb array)
      - `explanation` (text)
      - `order_items` (jsonb array)
      - `match_pairs` (jsonb array)
      - `points` (integer, default 1)
      - `tags` (text array)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `attempts`
      - `id` (uuid, primary key)
      - `quiz_id` (uuid, references quizzes)
      - `user_id` (uuid, references user_profiles)
      - `started_at` (timestamp)
      - `finished_at` (timestamp)
      - `score` (integer)
      - `max_score` (integer)
      - `percentage` (integer)
      - `time_taken` (integer, seconds)
      - `metadata` (jsonb)
      - `created_at` (timestamp)
    
    - `attempt_answers`
      - `id` (uuid, primary key)
      - `attempt_id` (uuid, references attempts)
      - `question_id` (uuid, references questions)
      - `response` (jsonb)
      - `correct` (boolean)
      - `points_earned` (integer, default 0)
      - `time_taken` (integer, seconds)
      - `created_at` (timestamp)
    
    - `quiz_likes`
      - `quiz_id` (uuid, references quizzes)
      - `user_id` (uuid, references user_profiles)
      - `created_at` (timestamp)
    
    - `quiz_saves`
      - `quiz_id` (uuid, references quizzes)
      - `user_id` (uuid, references user_profiles)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data
    - Add collaboration policies for quiz access
    - Add public read policies for public quizzes
*/

-- Create user_profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  bio text,
  avatar_url text,
  subjects text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create quizzes table
CREATE TABLE IF NOT EXISTS quizzes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  subject text,
  tags text[] DEFAULT '{}',
  difficulty text DEFAULT 'beginner' CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  visibility text DEFAULT 'private' CHECK (visibility IN ('private', 'unlisted', 'public')),
  collaborative boolean DEFAULT false,
  time_limit integer, -- minutes
  pass_mark integer DEFAULT 60, -- percentage
  shuffle_questions boolean DEFAULT false,
  shuffle_options boolean DEFAULT false,
  immediate_feedback boolean DEFAULT true,
  show_rationale boolean DEFAULT true,
  attempt_limit integer, -- null means unlimited
  settings jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create quiz_collaborators table
CREATE TABLE IF NOT EXISTS quiz_collaborators (
  quiz_id uuid NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('owner', 'editor', 'viewer')),
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (quiz_id, user_id)
);

-- Create questions table
CREATE TABLE IF NOT EXISTS questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id uuid NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('multiple_choice_single', 'multiple_choice_multiple', 'short_text', 'true_false', 'open_question', 'ordering', 'matching')),
  stem text NOT NULL,
  media_url text,
  options jsonb DEFAULT '[]',
  correct_answers jsonb DEFAULT '[]',
  explanation text,
  order_items jsonb DEFAULT '[]',
  match_pairs jsonb DEFAULT '[]',
  points integer DEFAULT 1,
  tags text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create attempts table
CREATE TABLE IF NOT EXISTS attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id uuid NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  started_at timestamptz DEFAULT now(),
  finished_at timestamptz,
  score integer DEFAULT 0,
  max_score integer DEFAULT 0,
  percentage integer DEFAULT 0,
  time_taken integer DEFAULT 0, -- seconds
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Create attempt_answers table
CREATE TABLE IF NOT EXISTS attempt_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id uuid NOT NULL REFERENCES attempts(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  response jsonb DEFAULT '{}',
  correct boolean DEFAULT false,
  points_earned integer DEFAULT 0,
  time_taken integer DEFAULT 0, -- seconds
  created_at timestamptz DEFAULT now()
);

-- Create quiz_likes table
CREATE TABLE IF NOT EXISTS quiz_likes (
  quiz_id uuid NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (quiz_id, user_id)
);

-- Create quiz_saves table
CREATE TABLE IF NOT EXISTS quiz_saves (
  quiz_id uuid NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (quiz_id, user_id)
);

-- Enable Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE attempt_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_saves ENABLE ROW LEVEL SECURITY;

-- User profiles policies
CREATE POLICY "Users can view all public profiles"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON user_profiles
  FOR ALL
  TO authenticated
  USING (auth.uid() = id);

-- Quizzes policies
CREATE POLICY "Public quizzes are viewable by everyone"
  ON quizzes
  FOR SELECT
  TO authenticated
  USING (visibility = 'public');

CREATE POLICY "Users can view their own quizzes"
  ON quizzes
  FOR SELECT
  TO authenticated
  USING (owner_id = auth.uid());

CREATE POLICY "Users can view quizzes they collaborate on"
  ON quizzes
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM quiz_collaborators 
      WHERE quiz_collaborators.quiz_id = quizzes.id 
      AND quiz_collaborators.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage their own quizzes"
  ON quizzes
  FOR ALL
  TO authenticated
  USING (owner_id = auth.uid());

-- Quiz collaborators policies
CREATE POLICY "Collaborators can view quiz collaborations"
  ON quiz_collaborators
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM quizzes 
    WHERE quizzes.id = quiz_collaborators.quiz_id 
    AND quizzes.owner_id = auth.uid()
  ));

CREATE POLICY "Quiz owners can manage collaborators"
  ON quiz_collaborators
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM quizzes 
    WHERE quizzes.id = quiz_collaborators.quiz_id 
    AND quizzes.owner_id = auth.uid()
  ));

-- Questions policies
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
        )
      )
    )
  );

CREATE POLICY "Users can manage questions for their quizzes"
  ON questions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM quizzes 
      WHERE quizzes.id = questions.quiz_id 
      AND quizzes.owner_id = auth.uid()
    )
  );

-- Attempts policies
CREATE POLICY "Users can view their own attempts"
  ON attempts
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create attempts for accessible quizzes"
  ON attempts
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM quizzes 
      WHERE quizzes.id = attempts.quiz_id 
      AND (
        quizzes.visibility = 'public' 
        OR quizzes.owner_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM quiz_collaborators 
          WHERE quiz_collaborators.quiz_id = quizzes.id 
          AND quiz_collaborators.user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Users can update their own attempts"
  ON attempts
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- Attempt answers policies
CREATE POLICY "Users can view their own attempt answers"
  ON attempt_answers
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM attempts 
      WHERE attempts.id = attempt_answers.attempt_id 
      AND attempts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage their own attempt answers"
  ON attempt_answers
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM attempts 
      WHERE attempts.id = attempt_answers.attempt_id 
      AND attempts.user_id = auth.uid()
    )
  );

-- Quiz likes policies
CREATE POLICY "Users can manage their own likes"
  ON quiz_likes
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid());

-- Quiz saves policies
CREATE POLICY "Users can manage their own saves"
  ON quiz_saves
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid());

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_quizzes_owner_id ON quizzes(owner_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_visibility ON quizzes(visibility);
CREATE INDEX IF NOT EXISTS idx_quizzes_subject ON quizzes(subject);
CREATE INDEX IF NOT EXISTS idx_quizzes_tags ON quizzes USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_quiz_collaborators_quiz_id ON quiz_collaborators(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_collaborators_user_id ON quiz_collaborators(user_id);
CREATE INDEX IF NOT EXISTS idx_questions_quiz_id ON questions(quiz_id);
CREATE INDEX IF NOT EXISTS idx_attempts_quiz_id ON attempts(quiz_id);
CREATE INDEX IF NOT EXISTS idx_attempts_user_id ON attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_attempt_answers_attempt_id ON attempt_answers(attempt_id);
CREATE INDEX IF NOT EXISTS idx_attempt_answers_question_id ON attempt_answers(question_id);

-- Function to handle user profile creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for automatic profile creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Function to update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_quizzes_updated_at
  BEFORE UPDATE ON quizzes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_questions_updated_at
  BEFORE UPDATE ON questions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();