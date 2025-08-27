import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';
import TakeQuestion from '../components/questions/TakeQuestion';
import { grade, type QuestionRecord } from '../lib/grading';

/** Shuffle helper */
function shuffle<T>(arr: T[]): T[] {
  return arr
    .map((x) => [Math.random(), x] as const)
    .sort((a, b) => a[0] - b[0])
    .map(([, x]) => x);
}

/** Map DB row to the grading QuestionRecord, relying only on `meta` */
function normalizeType(row: any): QuestionRecord {
  const map: Record<string, QuestionRecord['type']> = {
    multiple_choice_single: 'mc_single',
    multiple_choice_multiple: 'mc_multi',
    open_question: 'open',
    short_answer: 'short_text',
  } as const;
  const type = (map[row.type] ?? row.type) as QuestionRecord['type'];

  // Parse meta JSON safely
  let meta: any = {};
  try {
    meta = typeof row.meta === 'string' ? JSON.parse(row.meta) : (row.meta || {});
  } catch {
    meta = {};
  }

  return {
    id: row.id,
    type,
    stem: row.stem,
    meta,
    points: row.points,
  };
}

export default function QuizTakePage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();

  const [questions, setQuestions] = useState<QuestionRecord[]>([]);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [idx, setIdx] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!id) return;

      // Load quiz
      const { data: qz, error: e1 } = await supabase.from('quizzes').select('*').eq('id', id).single();
      if (e1 || !qz) {
        toast.error('Failed to load quiz');
        return;
      }

      // Load questions (only existing columns)
      const { data: qs, error: e2 } = await supabase
        .from('questions')
        .select('id, type, stem, meta, points, order_index')
        .eq('quiz_id', id)
        .order('order_index', { ascending: true })
        .order('created_at', { ascending: true });

      if (e2 || !qs) {
        toast.error('Failed to load questions');
        return;
      }

      let list = (qs as any[]).map(normalizeType) as QuestionRecord[];
      if ((qz as any).shuffle_questions) list = shuffle(list);
      setQuestions(list);
      setIdx(0);
      setAnswers({});
    };

    load();
  }, [id]);

  const onChangeAnswer = (qid: string, value: any) => {
    setAnswers((prev) => ({ ...prev, [qid]: value }));
  };

  const total = questions.length;

  const onSubmit = async () => {
    if (!user || !id) {
      toast.error('Please sign in');
      return;
    }
    if (!questions.length) {
      toast.error('No questions to submit');
      return;
    }
    setSubmitting(true);

    // 1) Create attempt
    const { data: att, error: e1 } = await supabase
      .from('attempts')
      .insert({ quiz_id: id, user_id: user.id, status: 'in_progress' })
      .select('id')
      .single();

    if (e1 || !att) {
      setSubmitting(false);
      toast.error('Failed to create attempt');
      return;
    }

    // 2) Grade locally and persist answer rows (new columns: is_correct, score_awarded)
    const rows = questions.map((q) => {
      const response = answers[q.id] ?? null;
      const result = grade(q, response); // { isCorrect, score }
      return {
        attempt_id: att.id,
        question_id: q.id,
        response: response ?? {},
        is_correct: result.isCorrect,
        score_awarded: result.score,
        created_at: new Date().toISOString(),
      };
    });

    const { error: e2 } = await supabase.from('attempt_answers').insert(rows as any);
    if (e2) {
      setSubmitting(false);
      toast.error('Failed to save answers');
      return;
    }

    // 3) Update attempt totals
    const totalScore = rows.reduce((s, r) => s + Number((r as any).score_awarded ?? 0), 0);
    await supabase
      .from('attempts')
      .update({ status: 'submitted', submitted_at: new Date().toISOString(), score_total: totalScore })
      .eq('id', att.id);

    setSubmitting(false);
    toast.success('Attempt submitted');
  };

  const current = questions[idx];
  const canPrev = idx > 0;
  const canNext = idx < Math.max(0, total - 1);

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">Question {total ? idx + 1 : 0} / {total}</div>
        <div className="flex gap-2">
          <button
            className="px-3 py-1 rounded border"
            onClick={() => canPrev && setIdx((i) => i - 1)}
            disabled={!canPrev}
          >
            Previous
          </button>
          <button
            className="px-3 py-1 rounded border"
            onClick={() => canNext && setIdx((i) => i + 1)}
            disabled={!canNext}
          >
            Next
          </button>
          <button
            className="px-3 py-1 rounded bg-pink-600 text-white disabled:opacity-60"
            onClick={onSubmit}
            disabled={submitting || !total}
          >
            {submitting ? 'Submitting…' : 'Submit'}
          </button>
        </div>
      </div>

      {current ? (
        <div className="space-y-3">
          <div className="text-lg font-medium">{current.stem}</div>
          <TakeQuestion
            question={current as any}
            value={answers[current.id]}
            onChange={(v) => onChangeAnswer(current.id, v)}
          />
        </div>
      ) : (
        <div className="text-sm text-gray-600">Loading questions…</div>
      )}
    </div>
  );
}
