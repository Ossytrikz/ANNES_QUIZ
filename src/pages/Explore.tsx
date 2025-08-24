import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { Quiz } from '../types/database';
import { useAuth } from '../hooks/useAuth';

export default function ExplorePage() {
  const { user } = useAuth();
  const [publicQuizzes, setPublicQuizzes] = useState<Quiz[]>([]);
  const [myQuizzes, setMyQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const uid = user?.id ?? null;

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        // Public and unlisted
        const { data: pub, error: e1 } = await supabase
          .from('quizzes')
          .select('*')
          .in('visibility', ['public', 'unlisted'])
          .order('created_at', { ascending: false })
          .limit(24);
        if (e1) throw e1;
        setPublicQuizzes(pub || []);

        if (uid) {
          // Owned by me
          const { data: mine, error: e2 } = await supabase
            .from('quizzes')
            .select('*')
            .eq('owner_id', uid)
            .order('created_at', { ascending: false })
            .limit(48);
          if (e2) throw e2;

          // Collaborator quizzes
          const { data: collabRows, error: e3 } = await supabase
            .from('quiz_collaborators')
            .select('quiz_id')
            .eq('user_id', uid);
          if (e3) throw e3;

          let collabQuizzes: Quiz[] = [];
          const ids = (collabRows || []).map(r => r.quiz_id);
          if (ids.length) {
            const { data: cq, error: e4 } = await supabase
              .from('quizzes')
              .select('*')
              .in('id', ids);
            if (e4) throw e4;
            collabQuizzes = cq || [];
          }

          const map = new Map<string, Quiz>();
          for (const q of (mine || [])) map.set(q.id, q);
          for (const q of collabQuizzes) map.set(q.id, q);
          setMyQuizzes(Array.from(map.values()));
        } else {
          setMyQuizzes([]);
        }
      } catch (err: any) {
        console.error('Explore load error:', err);
        const msg = err?.message || 'Failed to load quizzes';
        setError(msg);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [uid]);

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6">
      <h1 className="text-2xl font-semibold mb-2">Explore</h1>

      {error && (
        <div className="p-3 rounded bg-red-50 text-red-700 border border-red-200">
          {error}
          <div className="text-xs mt-1 opacity-80">
            If this persists, run the policy patch in the README/notes to allow public quiz listing.
          </div>
        </div>
      )}

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-medium">Your Quizzes</h2>
          {uid ? <Link className="text-blue-600 underline" to="/quizzes/create">Create a quiz</Link> : null}
        </div>
        {loading ? (
          <div>Loading...</div>
        ) : !uid ? (
          <div className="text-sm text-gray-600">Sign in to see your quizzes.</div>
        ) : myQuizzes.length === 0 ? (
          <div className="text-sm text-gray-600">
            You have no quizzes yet. <Link to="/quizzes/create" className="text-blue-600 underline">Create your first quiz</Link>.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {myQuizzes.map(q => <QuizCard key={q.id} quiz={q} />)}
          </div>
        )}
      </section>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-medium">Public & Unlisted</h2>
        </div>
        {loading ? (
          <div>Loading...</div>
        ) : publicQuizzes.length === 0 ? (
          <div className="text-sm text-gray-600">No public quizzes yet.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {publicQuizzes.map(q => <QuizCard key={q.id} quiz={q} />)}
          </div>
        )}
      </section>
    </div>
  );
}

function QuizCard({ quiz }: { quiz: Quiz }) {
  return (
    <div className="border rounded p-3 bg-white dark:bg-gray-800">
      <div className="text-sm text-gray-500">{quiz.subject || 'General'}</div>
      <div className="font-medium text-lg">{quiz.title}</div>
      {quiz.description && <div className="text-sm text-gray-600 line-clamp-2">{quiz.description}</div>}
      <div className="mt-3 flex gap-2">
        <Link to={`/console?prefill=${quiz.id}`} className="px-3 py-1 border rounded">Take</Link>
        <Link to={`/quizzes/${quiz.id}/edit`} className="px-3 py-1 border rounded">Edit</Link>
      </div>
    </div>
  );
}
