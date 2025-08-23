import { useEffect, useMemo, useState, useCallback, FormEvent, ChangeEvent } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { Quiz } from '../types/database';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';

interface QuizSetupData {
  quizType: string;
  title: string;
  description: string;
}

type QuizCreateForm = Pick<
  Quiz,
  | 'title'
  | 'description'
  | 'subject'
  | 'tags'
  | 'difficulty'
  | 'visibility'
  | 'collaborative'
  | 'time_limit'
  | 'shuffle_questions'
  | 'shuffle_options'
  | 'immediate_feedback'
  | 'show_rationale'
  | 'attempt_limit'
> & {
  pass_mark: number | null;
};

const DEFAULT_FORM: QuizCreateForm = {
  title: '',
  description: '',
  subject: '',
  tags: [],
  difficulty: 'beginner',
  visibility: 'private',
  collaborative: false,
  time_limit: null,
  pass_mark: 60,
  shuffle_questions: false,
  shuffle_options: false,
  immediate_feedback: true,
  show_rationale: true,
  attempt_limit: null,
};

export default function QuizCreatePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const setupData = location.state as QuizSetupData | undefined;

  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<QuizCreateForm>(() => ({
    ...DEFAULT_FORM,
    title: setupData?.title || '',
    description: setupData?.description || '',
    // Set default settings based on quiz type
    ...(setupData?.quizType === 'assessment' && {
      immediate_feedback: false,
      show_rationale: true,
      pass_mark: 70,
    }),
    ...(setupData?.quizType === 'survey' && {
      immediate_feedback: true,
      show_rationale: false,
      pass_mark: null,
    }),
  }));

  // ---- Helpers -------------------------------------------------------------

  const setField = useCallback(
    <K extends keyof QuizCreateForm>(key: K, value: QuizCreateForm[K]) =>
      setForm((prev) => ({ ...prev, [key]: value })),
    []
  );

  const setCheckbox = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setField(name as keyof QuizCreateForm, checked as any);
  };

  const setNumber = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const v = value === '' ? null : Number(value);
    setField(name as keyof QuizCreateForm, (Number.isNaN(v) ? null : v) as any);
  };

  const setText = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setField(name as keyof QuizCreateForm, (value ?? '') as any);
  };

  const setTags = (value: string) => {
    const tags = value
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 20); // simple guard: max 20 tags
    setField('tags', tags);
  };

  // Basic validation + derived UI state
  const titleTrimmed = useMemo(() => form.title.trim(), [form.title]);
  const isValidPassMark = useMemo(
    () => form.pass_mark === null || (form.pass_mark >= 0 && form.pass_mark <= 100),
    [form.pass_mark]
  );
  const canSubmit = !!titleTrimmed && isValidPassMark && !saving;

  // Redirect to setup if no setup data
  useEffect(() => {
    if (!setupData) {
      navigate('/quizzes/setup', { replace: true });
    }
  }, [setupData, navigate]);

  // Keyboard shortcut: Ctrl/Cmd+Enter to submit
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'enter' && canSubmit) {
        e.preventDefault();
        void handleSubmit(new Event('submit') as any);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [canSubmit, form]);

  // Focus title on mount
  useEffect(() => {
    const el = document.querySelector<HTMLInputElement>('input[name="title"]');
    el?.focus();
  }, []);

  // ---- Submit --------------------------------------------------------------

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) { toast.error('Please sign in'); return; }
    if (!titleTrimmed) { toast.error('Title is required'); return; }
    if (!isValidPassMark) { toast.error('Pass mark must be between 0 and 100'); return; }
    if (saving) return;

    setSaving(true);
    try {
      // Normalize numbers & strings
      const passMark = form.pass_mark == null ? 60 : Math.min(100, Math.max(0, Number(form.pass_mark)));
      const timeLimit = form.time_limit == null || form.time_limit <= 0 ? null : Number(form.time_limit);
      const attemptLimit = form.attempt_limit == null || form.attempt_limit <= 0 ? null : Number(form.attempt_limit);

      const quizData = {
        owner_id: user.id,
        title: titleTrimmed,
        description: form.description?.trim() || null,
        subject: form.subject?.trim() || null,
        tags: form.tags || [],
        difficulty: form.difficulty || 'beginner',
        visibility: form.visibility || 'private',
        collaborative: !!form.collaborative,
        time_limit: timeLimit,
        pass_mark: passMark,
        shuffle_questions: !!form.shuffle_questions,
        shuffle_options: !!form.shuffle_options,
        immediate_feedback: form.immediate_feedback !== false,
        show_rationale: form.show_rationale !== false,
        attempt_limit: attemptLimit,
      };

      const { data, error } = await supabase
        .from('quizzes')
        .insert(quizData)
        .select('id') // return only what we need
        .single();

      if (error) throw error;
      if (!data?.id) throw new Error('No quiz id returned');

      toast.success('Quiz created');
      navigate(`/quizzes/${data.id}/edit`);
    } catch (err: any) {
      console.error('Error creating quiz:', err);
      toast.error(`Failed to create quiz: ${err?.message || 'unknown error'}`);
      setSaving(false);
    }
  };

  // ---- Render --------------------------------------------------------------

  if (!setupData) {
    return null; // Will be redirected by the effect
  }

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1 text-sm text-muted-foreground">
          <span className="font-medium">{setupData.quizType.charAt(0).toUpperCase() + setupData.quizType.slice(1)} Quiz</span>
          <span>•</span>
          <button 
            onClick={() => navigate('/quizzes/setup', { state: setupData })}
            className="text-blue-600 hover:underline"
          >
            Change
          </button>
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-2">
          {form.title || 'Configure Your Quiz'}
        </h1>
        {form.description && (
          <p className="text-gray-600 dark:text-gray-400">{form.description}</p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className="block text-sm mb-1">Title</label>
          <input
            type="text"
            name="title"
            value={form.title}
            onChange={setText}
            placeholder="Enter quiz title"
            className="w-full"
            required
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm mb-1">Description</label>
          <textarea
            name="description"
            value={form.description || ''}
            onChange={setText}
            placeholder="Enter a brief description of your quiz"
            rows={3}
            className="w-full"
          />
        </div>

        <div>
          <label className="block text-sm mb-1">Subject</label>
          <input
            name="subject"
            value={form.subject ?? ''}
            onChange={setText}
            className="w-full"
            placeholder="e.g., Mathematics, Science, History"
          />
        </div>

        <div>
          <label className="block text-sm mb-1">Tags (comma separated)</label>
          <input
            value={(form.tags || []).join(', ')}
            onChange={(e) => setTags(e.target.value)}
            className="w-full"
            placeholder="e.g., math, science, history"
          />
        </div>

        <div>
          <label className="block text-sm mb-1">Difficulty</label>
          <div className="relative">
            <select name="difficulty" value={form.difficulty} onChange={setText} className="w-full pr-10">
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700 dark:text-gray-300">
              <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
              </svg>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm mb-1">Visibility</label>
          <div className="relative">
            <select name="visibility" value={form.visibility} onChange={setText} className="w-full pr-10">
              <option value="private">Private</option>
              <option value="unlisted">Unlisted</option>
              <option value="public">Public</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700 dark:text-gray-300">
              <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
              </svg>
            </div>
          </div>
        </div>

        <div>
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="collaborative"
              checked={!!form.collaborative}
              onChange={setCheckbox}
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary dark:border-gray-600 dark:bg-gray-800 dark:checked:bg-primary"
            />
            Collaborative
          </label>
        </div>

        <div>
          <label className="block text-sm mb-1">Time Limit (minutes)</label>
          <input
            type="number"
            name="time_limit"
            value={form.time_limit ?? ''}
            onChange={setNumber}
            min="1"
            className="w-full"
            placeholder="Leave empty for no time limit"
          />
        </div>

        <div>
          <label className="block text-sm mb-1">Pass Mark (%)</label>
          <div className="relative">
            <input
              name="pass_mark"
              type="number"
              min="0"
              max="100"
              value={form.pass_mark ?? 60}
              onChange={(e) => {
                const raw = e.target.value;
                const num = raw === '' ? null : e.target.valueAsNumber;
                // clamp if number, allow null
                const clamped =
                  num == null || Number.isNaN(num)
                    ? null
                    : Math.min(100, Math.max(0, num));
                setField('pass_mark', clamped);
              }}
              className="w-full pr-10"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 text-sm">%</span>
          </div>
          {!isValidPassMark && (
            <p className="text-xs text-red-600 mt-1">Pass mark must be between 0 and 100.</p>
          )}
        </div>

        <div>
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="shuffle_questions"
              checked={!!form.shuffle_questions}
              onChange={setCheckbox}
            />
            Shuffle Questions
          </label>
        </div>

        <div>
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="shuffle_options"
              checked={!!form.shuffle_options}
              onChange={setCheckbox}
            />
            Shuffle Options
          </label>
        </div>

        <div>
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="immediate_feedback"
              checked={!!form.immediate_feedback}
              onChange={setCheckbox}
            />
            Immediate Feedback
          </label>
        </div>

        <div>
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="show_rationale"
              checked={!!form.show_rationale}
              onChange={setCheckbox}
            />
            Show Rationale
          </label>
        </div>

        <div>
          <label className="block text-sm mb-1">Attempt Limit (blank = unlimited)</label>
          <input
            type="number"
            name="attempt_limit"
            value={form.attempt_limit ?? ''}
            onChange={setNumber}
            min="1"
            className="w-full"
            placeholder="Leave empty for unlimited attempts"
          />
        </div>

        <div className="md:col-span-2">
          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full bg-pink-600 hover:bg-pink-700 text-white font-medium py-2 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            title={!titleTrimmed ? 'Title is required' : undefined}
          >
            {saving ? 'Creating...' : 'Create Quiz'}
          </button>
        </div>
      </form>
    </div>
  );
}
