import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export function AuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { handleAuthCallback } = useAuth();

  useEffect(() => {
    const processAuthCallback = async () => {
      try {
        const { session, error } = await handleAuthCallback();
        
        if (error) {
          console.error('Auth callback error:', error);
          navigate(`/auth?error=${encodeURIComponent(error.message)}`);
          return;
        }

        if (session?.user) {
          // Check for redirect URL in query params
          const redirectTo = searchParams.get('redirectTo') || '/dashboard';
          console.log('Auth successful, redirecting to:', redirectTo);
          navigate(redirectTo);
        } else {
          console.log('No session found, redirecting to /auth');
          navigate('/auth');
        }
      } catch (error) {
        console.error('Unexpected error during auth callback:', error);
        navigate('/auth?error=unexpected_error');
      }
    };

    processAuthCallback();
  }, [navigate, handleAuthCallback, searchParams]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p className="text-gray-700 dark:text-gray-300">Completing sign in...</p>
      </div>
    </div>
  );
}
