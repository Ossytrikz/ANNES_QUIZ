export type QuestionType = 
  | 'multiple_choice_single'
  | 'multiple_choice_multiple'
  | 'short_answer'
  | 'true_false'
  | 'ordering'
  | 'matching';

export interface QuestionMeta {
  caseSensitive?: boolean;
  acceptedAnswers?: string[];
  correct?: boolean;
  options?: QuestionOption[];
  items?: ListItem[];
  [key: string]: any;
}

export interface QuestionOption {
  id: string;
  text: string;
  correct?: boolean;
}

export interface ListItem {
  id: string;
  text: string;
}

export interface BuilderQuestion {
  id: string;
  quiz_id: string;
  type: QuestionType;
  stem: string;
  meta: QuestionMeta;
  explanation: string | null;
  points: number;
  order_index: number;
  created_at?: string;
  updated_at?: string;
}
