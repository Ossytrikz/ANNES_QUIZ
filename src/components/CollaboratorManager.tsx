import { useState } from 'react';
import { useQuizCollaborators, useAddCollaborator, useUpdateCollaboratorRole, useRemoveCollaborator } from '../hooks/useQuizCollaborators';
import { CollaboratorRole } from '../types/collaborator';
import { toast } from 'react-hot-toast';

interface CollaboratorManagerProps {
  quizId: string;
  isOwner: boolean;
}

export function CollaboratorManager({ quizId, isOwner }: CollaboratorManagerProps) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<CollaboratorRole>('viewer');
  
  const { data: collaborators, isLoading, error } = useQuizCollaborators(quizId);
  const addCollaborator = useAddCollaborator();
  const updateRole = useUpdateCollaboratorRole();
  const removeCollaborator = useRemoveCollaborator();

  const handleAddCollaborator = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    
    try {
      const result = await addCollaborator.mutateAsync({
        quizId,
        email: email.trim().toLowerCase(),
        role,
      });
      
      if (result.success) {
        setEmail('');
        toast.success('Collaborator added successfully');
      } else {
        toast.error(result.message || 'Failed to add collaborator');
      }
    } catch (error) {
      console.error('Failed to add collaborator:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to add collaborator');
    }
  };

  const handleUpdateRole = async (collaborationId: string, newRole: CollaboratorRole) => {
    try {
      await updateRole.mutateAsync({
        collaborationId,
        role: newRole,
        quizId,
      });
      toast.success('Role updated successfully');
    } catch (error) {
      console.error('Failed to update role:', error);
      toast.error('Failed to update role');
    }
  };

  const handleRemoveCollaborator = async (collaborationId: string) => {
    if (!window.confirm('Are you sure you want to remove this collaborator?')) return;
    
    try {
      await removeCollaborator.mutateAsync({
        collaborationId,
        quizId,
      });
      toast.success('Collaborator removed successfully');
    } catch (error) {
      console.error('Failed to remove collaborator:', error);
      toast.error('Failed to remove collaborator');
    }
  };

  if (isLoading) return <div className="p-4">Loading collaborators...</div>;
  if (error) return <div className="text-red-500 p-4">Error loading collaborators</div>;

  return (
    <div className="space-y-4 p-4">
      <h3 className="text-lg font-medium">Collaborators</h3>
      
      {isOwner && (
        <form onSubmit={handleAddCollaborator} className="space-y-2">
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter collaborator's email"
              className="flex-1 p-2 border rounded"
              required
            />
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as CollaboratorRole)}
              className="p-2 border rounded"
            >
              <option value="viewer">Viewer</option>
              <option value="editor">Editor</option>
            </select>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              disabled={addCollaborator.isPending}
            >
              {addCollaborator.isPending ? 'Adding...' : 'Add'}
            </button>
          </div>
        </form>
      )}

      <div className="space-y-2">
        {collaborators?.map((collaborator) => (
          <div key={collaborator.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 border rounded-lg">
            <div className="mb-2 sm:mb-0">
              <span className="font-medium">{collaborator.user?.email || 'Unknown user'}</span>
              <span className="ml-2 text-sm text-gray-500">
                ({collaborator.role} {collaborator.role === 'owner' ? '👑' : ''})
              </span>
            </div>
            
            {isOwner && collaborator.role !== 'owner' && (
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <select
                  value={collaborator.role}
                  onChange={(e) => handleUpdateRole(collaborator.id, e.target.value as CollaboratorRole)}
                  className="p-1 text-sm border rounded flex-1 sm:flex-none"
                  disabled={updateRole.isPending}
                >
                  <option value="viewer">Viewer</option>
                  <option value="editor">Editor</option>
                </select>
                <button
                  onClick={() => handleRemoveCollaborator(collaborator.id)}
                  className="p-1 text-red-500 hover:text-red-700 disabled:opacity-50"
                  title="Remove collaborator"
                  disabled={removeCollaborator.isPending}
                >
                  ×
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
