import type { Quiz } from './quiz';

export type CollaboratorRole = 'owner' | 'editor' | 'viewer';

export interface QuizCollaborator {
  id: string;
  quiz_id: string;
  user_id: string;
  role: CollaboratorRole;
  email?: string;
  created_at: string;
  updated_at: string;
}

export interface QuizWithOwner extends Quiz {
  owner: {
    id: string;
    email: string;
  };
  is_owner: boolean;
  user_role: CollaboratorRole;
}
