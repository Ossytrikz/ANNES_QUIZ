import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { listPublicQuizzes, listOwnedQuizzes, listCollabQuizzes } from '../lib/quizLists';
import type { Quiz } from '../types/database';
import { useAuth } from '../hooks/useAuth';
import { useDebounce } from '../hooks/useDebounce';
import { VirtualizedQuizList } from '../components/VirtualizedQuizList';

export default function QuizConsole() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [feedback, setFeedback] = useState(false);
  const [q, setQ] = useState('');
  const qDebounced = useDebounce(q, 250);
  const uid = user?.id ?? null;

  // Prefetch personal libraries right after sign-in
  useEffect(() => {
    if (!uid) return;
    qc.prefetchQuery({ queryKey: ['quizzes','mine', uid], queryFn: () => listOwnedQuizzes(uid), staleTime: 5 * 60_000 });
    qc.prefetchQuery({ queryKey: ['quizzes','collab', uid], queryFn: () => listCollabQuizzes(uid), staleTime: 5 * 60_000 });
  }, [uid, qc]);

  const { data: mine = [], isLoading: loadingMine } = useQuery({
    queryKey: ['quizzes','mine', uid],
    queryFn: () => listOwnedQuizzes(uid),
    enabled: !!uid,
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
  });

  const { data: collab = [], isLoading: loadingCollab } = useQuery({
    queryKey: ['quizzes','collab', uid],
    queryFn: () => listCollabQuizzes(uid),
    enabled: !!uid,
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
  });

  const { data: pub = [], isLoading: loadingPub } = useQuery({
    queryKey: ['quizzes','public', qDebounced],
    queryFn: () => listPublicQuizzes(qDebounced),
    staleTime: 2 * 60_000,
    gcTime: 20 * 60_000,
  });

  const myQuizzes = useMemo(() => [...mine, ...collab], [mine, collab]);

  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const countSelected = useMemo(() => Object.values(selected).filter(Boolean).length, [selected]);
  function toggle(id: string, value?: boolean) { setSelected(s => ({ ...s, [id]: value ?? !s[id] })); }
  function selectAll(list: Quiz[]) { setSelected(s => ({ ...s, ...Object.fromEntries(list.map(x => [x.id, true])) })); }
  function clearAll() { setSelected({}); }

  function startCombined() {
    const ids = Object.entries(selected).filter(([, v]) => v).map(([id]) => id);
    if (!ids.length) return;
    const fb = feedback ? '1' : '0';
    navigate(`/quizzes/combined/take?ids=${ids.join(',')}&feedback=${fb}`);
  }

  const env = (import.meta as any).env as Record<string,string>;
  const collabConfigured = !!env?.VITE_COLLAB_TABLES;
  const banner = !user ? (
    <div className="mb-4 rounded-lg border border-yellow-400/40 bg-yellow-400/10 px-3 py-2 text-sm">
      You are not signed in — showing only public quizzes. Sign in to see <b>My & Collaborations</b>.
    </div>
  ) : null;

  return (
    <div className="min-h-screen">
      <div className="max-w-5xl mx-auto px-4 py-6">
        <header className="mb-6">
          <h1 className="text-2xl font-bold mb-4">Quiz Console</h1>
          {banner}
          {user && !collabConfigured && (
            <div className="mb-3 rounded border border-blue-400/40 bg-blue-400/10 px-3 py-2 text-xs">
              Collaboration tables are not configured. Set <code>VITE_COLLAB_TABLES</code> to enable shared quizzes (e.g. <code>quiz_collaborators</code>).
            </div>
          )}
          <p className="text-sm text-gray-500 mb-4">
            Select multiple quizzes from your library or public collection, then start a single combined session.
          </p>

          <div className="flex gap-2 items-center">
            <input
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Search public quizzes..."
              className="w-full px-3 py-2 border rounded"
            />
            <button onClick={clearAll} className="px-3 py-2 border rounded">Clear</button>
            <button onClick={startCombined} className="px-3 py-2 bg-blue-600 text-white rounded">Start ({countSelected})</button>
          </div>

          <label className="mt-2 flex items-center gap-2 text-sm">
            <input type="checkbox" checked={feedback} onChange={e=>setFeedback(e.target.checked)} />
            Immediate feedback (green/red on selection)
          </label>
        </header>

        <div className="grid md:grid-cols-2 gap-6">
          <section>
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-semibold">My & Collaborations</h2>
              <button onClick={() => selectAll(myQuizzes)} className="text-sm underline">Select all</button>
            </div>
            <VirtualizedQuizList
              items={myQuizzes}
              selected={selected}
              onToggle={toggle}
              emptyLabel={user ? 'No quizzes yet.' : 'Sign in to see your quizzes and collaborations.'}
            />
          </section>

          <section>
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-semibold">Public & Unlisted</h2>
              <button onClick={() => selectAll(pub)} className="text-sm underline">Select all</button>
            </div>
            <VirtualizedQuizList
              items={pub}
              selected={selected}
              onToggle={toggle}
              emptyLabel="No public quizzes found."
            />
          </section>
        </div>
      </div>

      <div className="sticky bottom-2 z-10">
        <div className="mx-auto max-w-5xl px-4">
          <div className="rounded-lg border bg-white dark:bg-gray-900 shadow flex items-center justify-between p-3">
            <div className="text-sm text-gray-600">Selected: {countSelected}</div>
            <div className="flex items-center gap-2">
              <button onClick={clearAll} className="px-3 py-2 border rounded">Clear</button>
              <button onClick={startCombined} className="px-3 py-2 bg-blue-600 text-white rounded">Start ({countSelected})</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
