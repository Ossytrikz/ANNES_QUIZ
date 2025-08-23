export interface Quiz {
  id: string;
  title: string;
  description?: string;
  subject?: string;
  tags: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  time_limit: number | null;
  pass_mark: number | null;
  shuffle_questions: boolean;
  shuffle_options: boolean;
  visibility: 'private' | 'unlisted' | 'public';
  collaborative: boolean;
  immediate_feedback: boolean;
  show_rationale: boolean;
  attempt_limit: number | null;
  created_at: string;
  updated_at: string;
  owner_id?: string;
  is_public?: boolean;
}
