import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { listPublicQuizzes } from '../lib/quizLists';
import type { Quiz } from '../types/database';
import { useAuth } from '../hooks/useAuth';

type QuizRow = Pick<
  Quiz,
  'id' | 'title' | 'subject' | 'description' | 'visibility' | 'owner_id' | 'created_at' | 'difficulty' | 'tags'
>;

export default function Home() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const uid = user?.id ?? null;
  const createTarget = uid ? '/quizzes/create' : `/auth?next=${encodeURIComponent('/quizzes/create')}`;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [myQuizzes, setMyQuizzes] = useState<QuizRow[]>([]);
  const [publicQuizzes, setPublicQuizzes] = useState<QuizRow[]>([]);

  const greeting = useMemo(() => {
    if (!user) return 'Welcome';
    const meta: any = user.user_metadata || {};
    const name = meta.first_name || (meta.full_name ? String(meta.full_name).split(' ')[0] : '') || (user.email ? user.email.split('@')[0] : '');
    return `Welcome, ${name || 'Friend'}`;
  }, [user]);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data: pub, error: e1 } = await supabase
          .from('quizzes')
          .select('id, title, subject, description, visibility, owner_id, created_at, difficulty, tags')
          .in('visibility', ['public', 'unlisted'])
          .order('created_at', { ascending: false })
          .limit(8);
        if (e1) throw e1;

        let mine: QuizRow[] = [];
        if (uid) {
          const [{ data: owned, error: e2 }, { data: collabIds, error: e3 }] = await Promise.all([
            supabase
              .from('quizzes')
              .select('id, title, subject, description, visibility, owner_id, created_at, difficulty, tags')
              .eq('owner_id', uid)
              .order('created_at', { ascending: false })
              .limit(12),
            supabase.from('quiz_collaborators').select('quiz_id').eq('user_id', uid),
          ]);
          if (e2) throw e2;
          if (e3) throw e3;

          let collab: QuizRow[] = [];
          const ids = (collabIds || []).map((r) => r.quiz_id);
          if (ids.length) {
            const { data: cq, error: e4 } = await supabase
              .from('quizzes')
              .select('id, title, subject, description, visibility, owner_id, created_at, difficulty, tags')
              .in('id', ids)
              .limit(12);
            if (e4) throw e4;
            collab = cq || [];
          }

          const map = new Map<string, QuizRow>();
          for (const q of owned || []) map.set(q.id, q);
          for (const q of collab) map.set(q.id, q);
          mine = Array.from(map.values()).slice(0, 8);
        }

        if (!isMounted) return;
        setPublicQuizzes(pub || []);
        setMyQuizzes(mine);
      } catch (err: any) {
        if (!isMounted) return;
        console.error('Home load error:', err);
        setError(err?.message || 'Failed to load quizzes');
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    load();
    return () => {
      isMounted = false;
    };
  }, [uid]);

  return (
    <div className="min-h-[calc(100vh-64px)] bg-white dark:bg-gray-900">
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-pink-200/40 via-white to-transparent dark:from-pink-900/20 dark:via-gray-900 dark:to-gray-900 pointer-events-none" />
        <div className="max-w-6xl mx-auto px-4 py-10 sm:py-14 relative">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-pink-300/50 dark:border-pink-500/30 text-pink-700 dark:text-pink-300 text-xs mb-4">
                <span className="i">✨</span> Smart, beautiful quiz builder
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-gray-900 dark:text-pink-200">
                {greeting}
              </h1>
              <p className="mt-3 text-gray-600 dark:text-pink-300/80 max-w-xl">
                Create professional quizzes, collaborate with teammates, and share with the world. Clean UI, instant feedback,
                and rock-solid grading — all in one place.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  onClick={() => navigate(createTarget)}
                  className="px-5 py-2.5 rounded-lg bg-pink-600 hover:bg-pink-700 text-white font-medium shadow-sm transition"
                >
                  Create a quiz
                </button>
                <Link
                  to="/explore"
                  className="px-5 py-2.5 rounded-lg border border-gray-300 dark:border-pink-400/30 bg-white/70 dark:bg-gray-800/60 text-gray-900 dark:text-pink-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                >
                  Explore quizzes
                </Link>
                {uid ? (
                  <button
                    onClick={() => navigate('/explore?tab=mine')}
                    className="px-5 py-2.5 rounded-lg border border-transparent bg-blue-600 hover:bg-blue-700 text-white font-medium transition"
                  >
                    My dashboard
                  </button>
                ) : null}
              </div>
              <div className="mt-4 max-w-md">
                <label className="sr-only" htmlFor="home-search">Search quizzes</label>
                <input
                  id="home-search"
                  data-home-search
                  type="search"
                  placeholder="Search quizzes (title, subject, tags) and press Enter…"
                  onKeyDown={(e) => {
                    const val = (e.target as HTMLInputElement).value.trim();
                    if (e.key === 'Enter' && val) navigate(`/explore?q=${encodeURIComponent(val)}`);
                  }}
                  className="w-full rounded-lg border border-gray-300 dark:border-pink-400/30 bg-white/70 dark:bg-gray-800/60 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/70"
                />
              </div>
            </div>
            <HeroCard />
          </div>
        </div>
      </section>

      {uid ? (
        <section className="max-w-6xl mx-auto px-4">
          <div className="grid sm:grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <ActionCard
              title="New quiz"
              desc="Start from a blank template or import items."
              to={createTarget}
              accent="bg-pink-600"
            />
            <ActionCard
              title="Your quizzes"
              desc="Continue editing or manage visibility."
              to="/explore?tab=mine"
              accent="bg-blue-600"
            />
            <ActionCard
              title="Public feed"
              desc="Discover community quizzes and trends."
              to="/explore"
              accent="bg-violet-600"
            />
          </div>
        </section>
      ) : null}

      {uid ? (
        <section className="max-w-6xl mx-auto px-4 mt-10">
          <SectionHeader
            title="Your recent quizzes"
            cta={{ label: 'View all', to: '/explore?tab=mine' }}
          />
          {loading ? (
            <SkeletonGrid count={6} />
          ) : myQuizzes.length === 0 ? (
            <EmptyState
              title="No quizzes yet"
              subtitle="Create your first quiz in seconds."
              action={{ label: 'Create a quiz', to: createTarget }}
            />
          ) : (
            <QuizGrid quizzes={myQuizzes} />
          )}
        </section>
      ) : null}

      <section className="max-w-6xl mx-auto px-4 mt-10 pb-16">
        <SectionHeader title="Discover public quizzes" cta={{ label: 'Explore', to: '/explore' }} />
        {loading ? (
          <SkeletonGrid count={6} />
        ) : publicQuizzes.length === 0 ? (
          <EmptyState
            title="Nothing public yet"
            subtitle="Be the first to publish your quiz."
            action={{ label: 'Create a quiz', to: createTarget }}
          />
        ) : (
          <QuizGrid quizzes={publicQuizzes} />
        )}

        {error && (
          <div className="mt-6 p-3 rounded-lg bg-red-50 text-red-700 border border-red-200 dark:bg-red-900/30 dark:text-red-200 dark:border-red-800">
            {error}
          </div>
        )}
      </section>
    </div>
  );
}

/* -------------------------- UI building blocks -------------------------- */

function HeroCard() {
  return (
    <div className="relative rounded-2xl border border-gray-200 dark:border-pink-400/20 bg-white/60 dark:bg-gray-800/60 p-5 shadow-sm">
      <div className="text-sm text-gray-500 dark:text-pink-300/70">Instant preview</div>
      <div className="mt-3 rounded-lg bg-gray-50 dark:bg-gray-900/40 border border-gray-200 dark:border-pink-400/20 p-4">
        <div className="h-3 w-24 rounded bg-gray-200 dark:bg-gray-700 mb-3" />
        <div className="space-y-2">
          <div className="h-3 w-3/4 rounded bg-gray-200 dark:bg-gray-700" />
          <div className="h-3 w-2/3 rounded bg-gray-200 dark:bg-gray-700" />
          <div className="h-3 w-1/2 rounded bg-gray-200 dark:bg-gray-700" />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="h-8 rounded-md bg-gray-200 dark:bg-gray-700" />
          <div className="h-8 rounded-md bg-gray-200 dark:bg-gray-700" />
        </div>
      </div>
      <div className="absolute -top-3 -right-3 px-2.5 py-1 rounded-full text-xs font-medium bg-pink-600 text-white shadow">
        Live
      </div>
    </div>
  );
}

function ActionCard({
  title,
  desc,
  to,
  accent = 'bg-pink-600',
}: {
  title: string;
  desc: string;
  to: string;
  accent?: string;
}) {
  return (
    <Link
      to={to}
      className="group rounded-xl border border-gray-200 dark:border-pink-400/20 bg-white dark:bg-gray-800 p-4 hover:shadow transition"
    >
      <div className={`w-9 h-9 rounded-lg ${accent} text-white grid place-items-center shadow-sm`}>
        <span>➕</span>
      </div>
      <div className="mt-3 font-semibold text-gray-900 dark:text-pink-200">{title}</div>
      <div className="text-sm text-gray-600 dark:text-pink-300/80">{desc}</div>
      <div className="mt-2 text-sm text-pink-700 dark:text-pink-300 group-hover:underline">Open →</div>
    </Link>
  );
}

function SectionHeader({ title, cta }: { title: string; cta?: { label: string; to: string } }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-pink-200">{title}</h2>
      {cta ? (
        <Link
          to={cta.to}
          className="text-sm px-3 py-1.5 rounded-lg border border-gray-300 dark:border-pink-400/30 text-gray-700 dark:text-pink-200 hover:bg-gray-50 dark:hover:bg-gray-800"
        >
          {cta.label}
        </Link>
      ) : null}
    </div>
  );
}

function SkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-lg border border-gray-200 dark:border-pink-400/20 p-4 bg-white dark:bg-gray-800"
        >
          <div className="h-3 w-24 bg-gray-200 dark:bg-gray-700 rounded mb-3" />
          <div className="h-4 w-2/3 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
          <div className="h-3 w-1/2 bg-gray-200 dark:bg-gray-700 rounded mb-4" />
          <div className="h-8 w-full bg-gray-100 dark:bg-gray-900 rounded" />
        </div>
      ))}
    </div>
  );
}

function EmptyState({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: { label: string; to: string };
}) {
  return (
    <div className="rounded-xl border border-dashed border-gray-300 dark:border-pink-400/30 p-6 text-center">
      <div className="text-gray-900 dark:text-pink-200 font-medium">{title}</div>
      {subtitle ? <div className="text-sm text-gray-600 dark:text-pink-300/80 mt-1">{subtitle}</div> : null}
      {action ? (
        <Link
          to={action.to}
          className="inline-flex mt-3 px-4 py-2 rounded-lg bg-pink-600 hover:bg-pink-700 text-white text-sm font-medium"
        >
          {action.label}
        </Link>
      ) : null}
    </div>
  );
}

function QuizGrid({ quizzes }: { quizzes: QuizRow[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {quizzes.map((q) => (
        <QuizCard key={q.id} quiz={q} />
      ))}
    </div>
  );
}

function QuizCard({ quiz }: { quiz: QuizRow }) {
  const tag = quiz.subject || (quiz.tags && (quiz.tags as string[])[0]) || 'General';
  return (
    <div className="rounded-lg border border-gray-200 dark:border-pink-400/20 p-4 bg-white dark:bg-gray-800 flex flex-col">
      <div className="text-xs text-gray-500 dark:text-pink-300/70">{tag}</div>
      <div className="mt-1 font-semibold text-gray-900 dark:text-pink-200 line-clamp-2">{quiz.title}</div>
      {quiz.description ? (
        <div className="mt-1 text-sm text-gray-600 dark:text-pink-300/80 line-clamp-2">{quiz.description}</div>
      ) : null}
      <div className="mt-4 flex gap-2">
        <Link
          to={`/quizzes/${quiz.id}/take`}
          className="px-3 py-1.5 rounded-md border border-gray-300 dark:border-pink-400/30 hover:bg-gray-50 dark:hover:bg-gray-800 text-sm"
        >
          Take
        </Link>
        <Link
          to={`/quizzes/${quiz.id}/edit`}
          className="px-3 py-1.5 rounded-md bg-pink-600 hover:bg-pink-700 text-white text-sm"
        >
          Edit
        </Link>
      </div>
    </div>
  );
}
