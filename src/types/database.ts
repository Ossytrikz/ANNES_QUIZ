export interface Database {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          id: string;
          display_name: string | null;
          bio: string | null;
          avatar_url: string | null;
          subjects: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          display_name?: string | null;
          bio?: string | null;
          avatar_url?: string | null;
          subjects?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          display_name?: string | null;
          bio?: string | null;
          avatar_url?: string | null;
          subjects?: string[];
          created_at?: string;
          updated_at?: string;
        };
      };
      quizzes: {
        Row: {
          id: string;
          owner_id: string;
          title: string;
          description: string | null;
          subject: string | null;
          tags: string[];
          difficulty: 'beginner' | 'intermediate' | 'advanced';
          visibility: 'private' | 'unlisted' | 'public';
          collaborative: boolean;
          time_limit: number | null;
          pass_mark: number;
          shuffle_questions: boolean;
          shuffle_options: boolean;
          immediate_feedback: boolean;
          show_rationale: boolean;
          attempt_limit: number | null;
          settings: Record<string, any>;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          title: string;
          description?: string | null;
          subject?: string | null;
          tags?: string[];
          difficulty?: 'beginner' | 'intermediate' | 'advanced';
          visibility?: 'private' | 'unlisted' | 'public';
          collaborative?: boolean;
          time_limit?: number | null;
          pass_mark?: number;
          shuffle_questions?: boolean;
          shuffle_options?: boolean;
          immediate_feedback?: boolean;
          show_rationale?: boolean;
          attempt_limit?: number | null;
          settings?: Record<string, any>;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          title?: string;
          description?: string | null;
          subject?: string | null;
          tags?: string[];
          difficulty?: 'beginner' | 'intermediate' | 'advanced';
          visibility?: 'private' | 'unlisted' | 'public';
          collaborative?: boolean;
          time_limit?: number | null;
          pass_mark?: number;
          shuffle_questions?: boolean;
          shuffle_options?: boolean;
          immediate_feedback?: boolean;
          show_rationale?: boolean;
          attempt_limit?: number | null;
          settings?: Record<string, any>;
          created_at?: string;
          updated_at?: string;
        };
      };
      quiz_collaborators: {
        Row: {
          quiz_id: string;
          user_id: string;
          role: 'owner' | 'editor' | 'viewer';
          created_at: string;
        };
        Insert: {
          quiz_id: string;
          user_id: string;
          role: 'owner' | 'editor' | 'viewer';
          created_at?: string;
        };
        Update: {
          quiz_id?: string;
          user_id?: string;
          role?: 'owner' | 'editor' | 'viewer';
          created_at?: string;
        };
      };
      questions: {
        Row: {
          id: string;
          quiz_id: string;
          type: 'multiple_choice_single' | 'multiple_choice_multiple' | 'short_text' | 'true_false' | 'open_question' | 'ordering' | 'matching';
          stem: string;
          media_url: string | null;
          options: any[];
          correct_answers: any[];
          explanation: string | null;
          order_items: any[];
          match_pairs: any[];
          points: number;
          tags: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          quiz_id: string;
          type: 'multiple_choice_single' | 'multiple_choice_multiple' | 'short_text' | 'true_false' | 'open_question' | 'ordering' | 'matching';
          stem: string;
          media_url?: string | null;
          options?: any[];
          correct_answers?: any[];
          explanation?: string | null;
          order_items?: any[];
          match_pairs?: any[];
          points?: number;
          tags?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          quiz_id?: string;
          type?: 'multiple_choice_single' | 'multiple_choice_multiple' | 'short_text' | 'true_false' | 'open_question' | 'ordering' | 'matching';
          stem?: string;
          media_url?: string | null;
          options?: any[];
          correct_answers?: any[];
          explanation?: string | null;
          order_items?: any[];
          match_pairs?: any[];
          points?: number;
          tags?: string[];
          created_at?: string;
          updated_at?: string;
        };
      };
      attempts: {
        Row: {
          id: string;
          quiz_id: string;
          user_id: string;
          started_at: string;
          finished_at: string | null;
          score: number;
          max_score: number;
          percentage: number;
          time_taken: number;
          metadata: Record<string, any>;
          created_at: string;
        };
        Insert: {
          id?: string;
          quiz_id: string;
          user_id: string;
          started_at?: string;
          finished_at?: string | null;
          score?: number;
          max_score?: number;
          percentage?: number;
          time_taken?: number;
          metadata?: Record<string, any>;
          created_at?: string;
        };
        Update: {
          id?: string;
          quiz_id?: string;
          user_id?: string;
          started_at?: string;
          finished_at?: string | null;
          score?: number;
          max_score?: number;
          percentage?: number;
          time_taken?: number;
          metadata?: Record<string, any>;
          created_at?: string;
        };
      };
      attempt_answers: {
        Row: {
          id: string;
          attempt_id: string;
          question_id: string;
          response: Record<string, any>;
          correct: boolean;
          points_earned: number;
          time_taken: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          attempt_id: string;
          question_id: string;
          response?: Record<string, any>;
          correct?: boolean;
          points_earned?: number;
          time_taken?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          attempt_id?: string;
          question_id?: string;
          response?: Record<string, any>;
          correct?: boolean;
          points_earned?: number;
          time_taken?: number;
          created_at?: string;
        };
      };
      quiz_likes: {
        Row: {
          quiz_id: string;
          user_id: string;
          created_at: string;
        };
        Insert: {
          quiz_id: string;
          user_id: string;
          created_at?: string;
        };
        Update: {
          quiz_id?: string;
          user_id?: string;
          created_at?: string;
        };
      };
      quiz_saves: {
        Row: {
          quiz_id: string;
          user_id: string;
          created_at: string;
        };
        Insert: {
          quiz_id: string;
          user_id: string;
          created_at?: string;
        };
        Update: {
          quiz_id?: string;
          user_id?: string;
          created_at?: string;
        };
      };
    };
  };
}

export type UserProfile = Database['public']['Tables']['user_profiles']['Row'];
export type Quiz = Database['public']['Tables']['quizzes']['Row'];
export type Question = Database['public']['Tables']['questions']['Row'];
export type Attempt = Database['public']['Tables']['attempts']['Row'];
export type AttemptAnswer = Database['public']['Tables']['attempt_answers']['Row'];
export type QuizCollaborator = Database['public']['Tables']['quiz_collaborators']['Row'];

export type QuestionType = Question['type'];
export type QuizDifficulty = Quiz['difficulty'];
export type QuizVisibility = Quiz['visibility'];
export type CollaboratorRole = QuizCollaborator['role'];