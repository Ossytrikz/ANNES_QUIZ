import { useEffect, useRef, useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';
import TakeQuestion from '../components/questions/TakeQuestion';
import { grade, type QuestionRecord } from '../lib/grading';

/** Deterministic shuffle helper (seeded by quiz id) */
function shuffleOnce<T>(arr: T[], seedKey: string): T[] {
  let seed = 0;
  for (let i = 0; i < seedKey.length; i++) seed = (seed * 31 + seedKey.charCodeAt(i)) >>> 0;
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const j = seed % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Per-mount seed: reshuffles on each page load but stays stable during one mount
function useMountSeed(scopeKey: string) {
  const ref = useRef<string | null>(null);
  if (!ref.current) {
    ref.current = `${scopeKey}:${Date.now().toString(36)}:${Math.random().toString(36).slice(2)}`;
  }
  return ref.current;
}

/** Map DB row to the grading QuestionRecord */
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

  const mountSeed = useMountSeed(String(id ?? 'noid'));

  const [questions, setQuestions] = useState<QuestionRecord[]>([]);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [idx, setIdx] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ shown: boolean; isCorrect: boolean | null; text: string } | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!id) return;

      // Load quiz
      const { data: qz, error: e1 } = await supabase.from('quizzes').select('*').eq('id', id).single();
      if (e1 || !qz) {
        toast.error('Failed to load quiz');
        return;
      }

      // Load questions
      const { data: qs, error: e2 } = await supabase
        .from('questions')
        .select('id, type, stem, meta, points, order_index, created_at')
        .eq('quiz_id', id)
        .order('order_index', { ascending: true })
        .order('created_at', { ascending: true });

      if (e2 || !qs) {
        toast.error('Failed to load questions');
        return;
      }

      let list = (qs as any[]).map(normalizeType) as QuestionRecord[];
      // More aggressive shuffle: seed with quiz id + user id + per-mount seed (changes on reload)
      const seed = `${id}:${user?.id ?? 'anon'}:${mountSeed}`;
      const shuffled = shuffleOnce(list, seed);
      const same = shuffled.length === list.length && shuffled.every((x, i) => x.id === list[i].id);
      list = same && shuffled.length > 1 ? [...shuffled.slice(1), shuffled[0]] : shuffled;
      setQuestions(list);
      setIdx(0);
      setAnswers({});
    };

    load();
  }, [id]);

  const onChangeAnswer = (qid: string, value: any) => {
    setAnswers((prev) => ({ ...prev, [qid]: value }));
    // Reset feedback when answer changes
    setFeedback(null);
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

  // Helpers to extract readable correct answers per type
  const getOptions = (meta: any): any[] => {
    if (!meta) return [];
    if (Array.isArray(meta.options)) return meta.options;
    if (Array.isArray(meta.items)) return meta.items;
    if (Array.isArray(meta.choices)) return meta.choices;
    return [];
  };
  const labelOf = (o: any): string => String(o?.text ?? o?.label ?? o?.name ?? o?.title ?? o?.id ?? '');
  const idOf = (o: any): string => {
    if (o === undefined || o === null) return '';
    const t = typeof o;
    if (t === 'string' || t === 'number' || t === 'boolean') return String(o);
    return String(o?.id ?? o?.value ?? o?.key ?? o?.text ?? '');
  };
  const indexToOptionId = (meta: any, idx: number): string | null => {
    const opts = getOptions(meta);
    if (idx < 0 || idx >= opts.length) return null;
    return idOf(opts[idx]);
  };
  const correctTextFor = (q: QuestionRecord): string => {
    const meta: any = q.meta ?? {};
    const opts = getOptions(meta);
    const byId = new Map<string, string>();
    for (const o of opts) byId.set(idOf(o), labelOf(o));
    switch (q.type) {
      case 'true_false': {
        const c = !!(meta?.correct ?? meta?.answer);
        return c ? 'True' : 'False';
      }
      case 'mc_single': {
        let correct: any = (Array.isArray(meta?.correctAnswers) && meta.correctAnswers.length > 0 ? meta.correctAnswers[0] : undefined)
          ?? meta?.correct ?? meta?.answer ?? meta?.correctId ?? meta?.correct_id ?? meta?.correctIndex ?? meta?.solution ?? meta?.correctLabel ?? meta?.correct_text ?? '';
        if (typeof correct === 'number' || (typeof correct === 'string' && /^\d+$/.test(correct))) {
          const mapped = indexToOptionId(meta, Number(correct));
          if (mapped) correct = mapped;
        }
        if (!correct && opts.length) {
          const flagged = opts.find((o: any) => o?.correct || o?.isCorrect || o?.is_correct || o?.answer || o?.is_correct_answer);
          if (flagged) correct = idOf(flagged);
        }
        const label = byId.get(String(correct)) ?? String(correct ?? '');
        return label || '(no configured correct answer)';
      }
      case 'mc_multi': {
        let list: any[] = (Array.isArray(meta?.correctAnswers) && meta.correctAnswers)
          || (Array.isArray(meta?.correct) && meta.correct)
          || (Array.isArray(meta?.answers) && meta.answers)
          || [];
        if (list.length && list.every((x) => Number.isInteger(Number(x))) && opts.length) {
          list = list.map((n) => indexToOptionId(meta, Number(n))).filter(Boolean) as string[];
        }
        if ((!list || !list.length) && opts.length) {
          list = opts.filter((o: any) => o?.correct || o?.isCorrect || o?.is_correct).map(idOf);
        }
        const labels = (list as any[]).map((id) => byId.get(String(id)) ?? String(id));
        return labels.length ? labels.join(', ') : '(no configured correct answers)';
      }
      case 'ordering': {
        const items = Array.isArray(meta?.items) ? meta.items : [];
        let correct: any[] = (Array.isArray(meta?.correctOrder) && meta.correctOrder)
          || (Array.isArray(meta?.order) && meta.order)
          || (Array.isArray(meta?.correct) && meta.correct)
          || [];
        let ids: string[];
        if (correct.length && correct.every((x) => Number.isInteger(Number(x))) && items.length) {
          ids = correct.map((n) => idOf(items[Number(n)])).filter(Boolean);
        } else {
          ids = correct.map(String);
        }
        // Map ids to labels
        const labelMap = new Map<string, string>();
        for (const it of items) labelMap.set(idOf(it), labelOf(it));
        const labels = ids.map((id) => labelMap.get(String(id)) ?? String(id));
        return labels.join(' → ');
      }
      case 'short_text': {
        let answers: string[] = Array.isArray(meta?.acceptedAnswers) ? meta.acceptedAnswers.map(String) : [];
        if (!answers.length) {
          const alt = [meta?.rubric, meta?.correct_text, meta?.answer].filter((v) => !(v === undefined || v === null || String(v) === '')).map(String);
          answers = alt.length ? alt : [];
        }
        return answers.join(' | ');
      }
      case 'matching': {
        const left = Array.isArray(meta?.left) ? meta.left : [];
        const correctMap: Record<string, string> = meta?.correctMap ?? meta?.pairs ?? meta?.correct ?? meta?.answerMap ?? {};
        const pairs = left.map((L: any) => `${String(L?.text ?? L?.id ?? '')} → ${String(correctMap[String(L?.id ?? L?.text ?? '')] ?? '')}`);
        return pairs.join(', ');
      }
      default:
        return '';
    }
  };

  const onNextWithFeedback = () => {
    if (!current) return;
    // If feedback already shown, advance
    if (feedback?.shown) {
      setFeedback(null);
      if (canNext) setIdx((i) => i + 1);
      return;
    }
    // Otherwise, grade and show
    const response = answers[current.id];
    const { isCorrect } = grade(current, response);
    const text = correctTextFor(current);
    setFeedback({ shown: true, isCorrect, text });
  };

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
            className={`px-3 py-1 rounded border ${feedback?.shown ? 'border-pink-600 text-pink-700' : ''}`}
            onClick={onNextWithFeedback}
            disabled={!canNext && !feedback?.shown}
          >
            {feedback?.shown ? 'Continue' : 'Check'}
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
          {feedback?.shown && (
            <div className={`p-3 rounded text-sm ${feedback.isCorrect ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
              <div className="font-medium mb-1">{feedback.isCorrect ? 'Correct!' : 'Incorrect.'}</div>
              {feedback.text ? (
                <div><span className="font-semibold">Correct answer:</span> {feedback.text}</div>
              ) : null}
              {!canNext && (
                <div className="mt-2 text-xs text-gray-600">There are no more questions. You can submit your attempt.</div>
              )}
            </div>
          )}
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
