// @ts-nocheck
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

type CollaboratorRole = 'owner' | 'editor' | 'viewer';

interface QuizCollaborator {
  id: string;
  quiz_id: string;
  user_id: string;
  role: CollaboratorRole;
  created_at: string;
  updated_at: string;
  user: {
    email: string;
  } | null;
}

const COLLABORATORS_QUERY_KEY = 'quiz-collaborators';

export const useQuizCollaborators = (quizId: string | undefined) => {
  return useQuery<QuizCollaborator[], Error>({
    queryKey: [COLLABORATORS_QUERY_KEY, quizId],
    queryFn: async () => {
      if (!quizId) return [];
      
      // First, get the collaborator records
      const { data: collaborators, error } = await supabase
        .from('quiz_collaborators')
        .select('*')
        .eq('quiz_id', quizId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      if (!collaborators?.length) return [];

      // Then get the user emails in a single query
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, email')
        .in('id', collaborators.map(c => c.user_id));

      if (usersError) throw usersError;

      // Combine the data
      const userMap = new Map(users?.map(user => [user.id, user.email]));
      const data = collaborators.map(collab => ({
        ...collab,
        user: {
          email: userMap.get(collab.user_id) || 'unknown@example.com'
        }
      }));

      if (error) {
        console.error('Error fetching collaborators:', error);
        throw new Error(error.message);
      }

      return data as QuizCollaborator[];
    },
    enabled: !!quizId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

interface AddCollaboratorParams {
  quizId: string;
  email: string;
  role: CollaboratorRole;
}

export const useAddCollaborator = () => {
  const queryClient = useQueryClient();
  
  return useMutation<{ success: boolean; message: string }, Error, AddCollaboratorParams>({
    mutationFn: async ({ quizId, email, role }: { quizId: string; email: string; role: CollaboratorRole }) => {
      const { data, error } = await supabase.rpc('add_quiz_collaborator', {
        p_quiz_id: quizId,
        p_email: email.trim().toLowerCase(),
        p_role: role,
      });

      if (error) {
        console.error('Error adding collaborator:', error);
        throw new Error(error.message);
      }

      if (!data?.success) {
        throw new Error(data?.message || 'Failed to add collaborator');
      }

      return data;
    },
    onSuccess: (_data: unknown, { quizId }: { quizId: string }) => {
      queryClient.invalidateQueries({ 
        queryKey: [COLLABORATORS_QUERY_KEY, quizId] 
      });
    },
  });
};

interface UpdateCollaboratorRoleParams {
  collaborationId: string;
  role: CollaboratorRole;
  quizId: string;
}

export const useUpdateCollaboratorRole = () => {
  const queryClient = useQueryClient();
  
  return useMutation<QuizCollaborator, Error, UpdateCollaboratorRoleParams>({
    mutationFn: async ({ collaborationId, role, quizId }: { collaborationId: string; role: CollaboratorRole; quizId: string }) => {
      const { data, error } = await supabase
        .from('quiz_collaborators')
        .update({ 
          role,
          updated_at: new Date().toISOString()
        })
        .eq('id', collaborationId)
        .select()
        .single();

      if (error) {
        console.error('Error updating collaborator role:', error);
        throw new Error(error.message);
      }

      return data as QuizCollaborator;
    },
    onSuccess: (_data: unknown, { quizId }: { quizId: string }) => {
      queryClient.invalidateQueries({ 
        queryKey: [COLLABORATORS_QUERY_KEY, quizId] 
      });
    },
  });
};

interface RemoveCollaboratorParams {
  collaborationId: string;
  quizId: string;
}

export const useRemoveCollaborator = () => {
  const queryClient = useQueryClient();
  
  return useMutation<void, Error, RemoveCollaboratorParams>({
mutationFn: async ({ collaborationId }: { collaborationId: string }) => {
      const { error } = await supabase
        .from('quiz_collaborators')
        .delete()
        .eq('id', collaborationId);

      if (error) {
        console.error('Error removing collaborator:', error);
        throw new Error(error.message);
      }
    },
    onSuccess: (_data: unknown, { quizId }: { quizId: string }) => {
      queryClient.invalidateQueries({ 
        queryKey: [COLLABORATORS_QUERY_KEY, quizId] 
      });
    },
  });
};

export const useCanEditQuiz = (quizId: string | undefined) => {
  return useQuery<boolean, Error>({
    queryKey: ['can-edit-quiz', quizId],
    queryFn: async () => {
      if (!quizId) return false;
      
      const { data, error } = await supabase.rpc('can_edit_quiz', {
        p_quiz_id: quizId,
      });

      if (error) {
        console.error('Error checking edit permissions:', error);
        throw new Error(error.message);
      }

      return data as boolean;
    },
    enabled: !!quizId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};
