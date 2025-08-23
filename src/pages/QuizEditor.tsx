import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { Quiz } from '../types/quiz';
import toast from 'react-hot-toast';
import QuestionBuilder from '../components/questions/QuestionBuilder';
import { CollaboratorManager } from '../components/CollaboratorManager';
import { useUser } from '../hooks/useUser';

type QuizForm = Pick<
  Quiz,
  | 'title'
  | 'subject'
  | 'tags'
  | 'difficulty'
  | 'time_limit'
  | 'pass_mark'
  | 'shuffle_questions'
  | 'shuffle_options'
  | 'visibility'
  | 'collaborative'
  | 'immediate_feedback'
  | 'show_rationale'
  | 'attempt_limit'
>;

const EMPTY_FORM: QuizForm = {
  title: '',
  subject: '',
  tags: [],
  difficulty: 'beginner',
  time_limit: null,
  pass_mark: 60,
  shuffle_questions: false,
  shuffle_options: false,
  visibility: 'private',
  collaborative: false,
  immediate_feedback: false,
  show_rationale: false,
  attempt_limit: null,
};

export default function QuizEditorPage() {
  const { id } = useParams<{ id: string }>();
  const [quiz, setQuiz] = useState<(Quiz & { owner_id?: string }) | null>(null);
  const [questionsCount, setQuestionsCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { user } = useUser();

  const isOwner = useMemo(() => user?.id === quiz?.owner_id, [user?.id, quiz?.owner_id]);

  const [form, setForm] = useState<QuizForm>(EMPTY_FORM);

  // Build form from quiz
  const formFromQuiz = useCallback((q: Quiz): QuizForm => ({
    title: q.title ?? '',
    subject: q.subject ?? '',
    tags: q.tags ?? [],
    difficulty: q.difficulty ?? 'beginner',
    time_limit: q.time_limit ?? null,
    pass_mark: q.pass_mark ?? 60,
    shuffle_questions: !!q.shuffle_questions,
    shuffle_options: !!q.shuffle_options,
    visibility: q.visibility ?? 'private',
    collaborative: !!q.collaborative,
    immediate_feedback: !!q.immediate_feedback,
    show_rationale: !!q.show_rationale,
    attempt_limit: q.attempt_limit ?? null,
  }), []);

  // Load quiz + initial questions count
  const loadQuiz = useCallback(async (quizId: string) => {
    setLoading(true);
    let cancelled = false;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please sign in to edit quizzes');
        return;
      }

      const [qzRes, qsRes] = await Promise.all([
        supabase.from('quizzes').select('*').eq('id', quizId).single(),
        supabase
          .from('questions')
          .select('id', { count: 'exact', head: true })
          .eq('quiz_id', quizId),
      ]);

      if (qzRes.error) {
        console.error('Quiz fetch error:', qzRes.error);
        if (qzRes.error.code === 'PGRST116') toast.error('Quiz not found');
        else if (qzRes.error.code === '42501') toast.error('You do not have permission to edit this quiz');
        else toast.error('Failed to load quiz');
        return;
      }

      const quizData = qzRes.data as Quiz & { owner_id?: string };

      // permissions: owner or collaborator
      if (quizData.owner_id !== session.user.id) {
        const { data: collab, error: collabErr } = await supabase
          .from('quiz_collaborators')
          .select('role')
          .eq('quiz_id', quizId)
          .eq('user_id', session.user.id)
          .single();

        if (collabErr || !collab) {
          toast.error('You do not have permission to edit this quiz');
          return;
        }
      }

      if (cancelled) return;
      setQuiz(quizData);
      setForm(formFromQuiz(quizData));
      setQuestionsCount(qsRes.count ?? 0);
    } catch (error) {
      console.error('Error loading quiz:', error);
      toast.error('An unexpected error occurred');
    } finally {
      if (!cancelled) setLoading(false);
    }
    return () => { cancelled = true; };
  }, [formFromQuiz]);

  const navigate = useNavigate();

  useEffect(() => {
    if (!id) return;
    loadQuiz(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handlePreview = () => {
    if (id) {
      navigate(`/quizzes/${id}/preview`);
    }
  };

  // Realtime questions count
  useEffect(() => {
    if (!id) return;
    const channel = supabase
      .channel(`questions-count-${id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'questions', filter: `quiz_id=eq.${id}` },
        async () => {
          const { count } = await supabase
            .from('questions')
            .select('id', { count: 'exact', head: true })
            .eq('quiz_id', id);
          setQuestionsCount(count ?? 0);
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  // Dirty tracking
  const snapshot = useMemo(() => JSON.stringify(form), [form]);
  const original = useMemo(() => JSON.stringify(quiz ? formFromQuiz(quiz) : EMPTY_FORM), [quiz, formFromQuiz]);
  const isDirty = snapshot !== original;

  // Handlers
  const onChange: React.ChangeEventHandler<HTMLInputElement | HTMLSelectElement> = (e) => {
    const { name, type, value, checked } = e.target as HTMLInputElement;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const onTagsChange = (value: string) => {
    const tags = value.split(',').map((s) => s.trim()).filter(Boolean);
    setForm((prev) => ({ ...prev, tags }));
  };

  const onNumberChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const { name, value } = e.target;
    const v = value === '' ? null : Number(value);
    setForm((prev) => ({ ...prev, [name]: Number.isNaN(v) ? null : v }));
  };

  const saveSettings = useCallback(async () => {
    if (!id) return;
    const title = form.title.trim();
    if (!title) { toast.error('Title is required'); return; }
    if (!isDirty) return;

    setSaving(true);
    try {
      const payload: Partial<Quiz> = {
        ...form,
        title,
        subject: (form.subject || '').trim(),
      };
      const { error } = await supabase.from('quizzes').update(payload).eq('id', id);
      if (error) throw error;

      toast.success('Settings saved');
      setQuiz((prev) => (prev ? { ...prev, ...(payload as Quiz) } : prev));
    } catch (err: any) {
      console.error(err);
      toast.error(`Failed to save: ${err?.message || 'unknown error'}`);
    } finally {
      setSaving(false);
    }
  }, [id, form, isDirty]);

  // Ctrl/Cmd+S to save
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        void saveSettings();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [saveSettings]);

  const tagsString = useMemo(() => (form.tags || []).join(', '), [form.tags]);

  return (
    <div className="max-w-5xl mx-auto p-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Edit Quiz</h1>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handlePreview}
            className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-700"
          >
            Preview
          </button>
          <button
            type="button"
            onClick={saveSettings}
            disabled={saving || !isDirty}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="animate-pulse space-y-3">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
      ) : !quiz ? (
        <div>Quiz not found.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <div className="bg-white dark:bg-gray-800 border rounded p-3">
              <div className="flex items-center justify-between mb-2">
                <h2 className="font-medium">Questions</h2>
                <div className="text-xs text-gray-500">{questionsCount} total</div>
              </div>
              {id && <QuestionBuilder quizId={id} />}
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-white dark:bg-gray-800 border rounded p-3">
              <h2 className="font-medium mb-3">Settings</h2>
              <div className="space-y-3 text-sm">
                <div>
                  <label className="block mb-1">Title</label>
                  <input
                    name="title"
                    value={form.title}
                    onChange={onChange}
                    className="w-full border rounded px-3 py-2 bg-transparent"
                  />
                </div>
                <div>
                  <label className="block mb-1">Subject</label>
                  <input
                    name="subject"
                    value={form.subject || ''}
                    onChange={onChange}
                    className="w-full border rounded px-3 py-2 bg-transparent"
                  />
                </div>
                <div>
                  <label className="block mb-1">Tags (comma-separated)</label>
                  <input
                    value={tagsString}
                    onChange={(e) => onTagsChange(e.target.value)}
                    className="w-full border rounded px-3 py-2 bg-transparent"
                  />
                </div>
                <div>
                  <label className="block mb-1">Difficulty</label>
                  <select
                    name="difficulty"
                    value={form.difficulty}
                    onChange={onChange}
                    className="w-full border rounded px-3 py-2 bg-transparent"
                  >
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block mb-1">Time Limit (mins)</label>
                    <input
                      name="time_limit"
                      type="number"
                      value={(form.time_limit as any) ?? ''}
                      onChange={onNumberChange}
                      className="w-full border rounded px-3 py-2 bg-transparent"
                    />
                  </div>
                  <div>
                    <label className="block mb-1">Pass Mark (%)</label>
                    <input
                      name="pass_mark"
                      type="number"
                      value={(form.pass_mark as any) ?? ''}
                      onChange={onNumberChange}
                      className="w-full border rounded px-3 py-2 bg-transparent"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      name="shuffle_questions"
                      checked={!!form.shuffle_questions}
                      onChange={onChange}
                    />{' '}
                    Shuffle Questions
                  </label>
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      name="shuffle_options"
                      checked={!!form.shuffle_options}
                      onChange={onChange}
                    />{' '}
                    Shuffle Options
                  </label>
                </div>
                <div>
                  <label className="block mb-1">Visibility</label>
                  <select
                    name="visibility"
                    value={form.visibility}
                    onChange={onChange}
                    className="w-full border rounded px-3 py-2 bg-transparent"
                  >
                    <option value="private">Private</option>
                    <option value="unlisted">Unlisted</option>
                    <option value="public">Public</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      name="immediate_feedback"
                      checked={!!form.immediate_feedback}
                      onChange={onChange}
                    />{' '}
                    Immediate Feedback
                  </label>
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      name="show_rationale"
                      checked={!!form.show_rationale}
                      onChange={onChange}
                    />{' '}
                    Show Rationale
                  </label>
                </div>
                <div>
                  <label className="block mb-1">Attempt Limit (blank = unlimited)</label>
                  <input
                    name="attempt_limit"
                    type="number"
                    value={(form.attempt_limit as any) ?? ''}
                    onChange={onNumberChange}
                    className="w-full border rounded px-3 py-2 bg-transparent"
                  />
                </div>
                <div>
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      name="collaborative"
                      checked={!!form.collaborative}
                      onChange={onChange}
                    />{' '}
                    Collaboration Enabled
                  </label>
                </div>
                <div className="pt-1">
                  <button
                    onClick={saveSettings}
                    disabled={saving || !isDirty}
                    className="w-full px-3 py-2 bg-blue-600 text-white rounded disabled:opacity-60"
                    title={!isDirty ? 'No changes to save' : undefined}
                  >
                    {saving ? 'Saving...' : 'Save Settings'}
                  </button>
                </div>
              </div>
            </div>

            {form.collaborative && id && isOwner && (
              <div className="bg-white dark:bg-gray-800 border rounded p-3">
                <h2 className="font-medium mb-3">Collaborators</h2>
                <CollaboratorManager quizId={id} isOwner={isOwner} />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
