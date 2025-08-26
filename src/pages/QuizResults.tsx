import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { Attempt, AttemptAnswer, Question, Quiz } from '../types/database';

type QAById = Record<string, Question>;

export default function QuizResultsPage() {
  const { id, attemptId } = useParams<{ id: string; attemptId: string }>();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [answers, setAnswers] = useState<AttemptAnswer[]>([]);
  const [questions, setQuestions] = useState<QAById>({});
  const [loading, setLoading] = useState(true);

  const reportRef = useRef<HTMLDivElement | null>(null);
  async function handleDownloadPdf() {
    const el = reportRef.current;
    if (!el) return;
    const { exportElementToPdf } = await import('../utils/pdf');
    const name = `quiz_${id}_attempt_${attempt?.id ?? ''}_summary.pdf`;
    await exportElementToPdf(el, name);
  }

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!id || !attemptId) return;
      setLoading(true);
      try {
        const [qzRes, attRes, ansRes, qsRes] = await Promise.all([
          supabase.from('quizzes').select('*').eq('id', id).single(),
          supabase.from('attempts').select('*').eq('id', attemptId).single(),
          supabase
            .from('attempt_answers')
            .select('id, attempt_id, question_id, response, is_correct, score_awarded, created_at')
            .eq('attempt_id', attemptId)
            .order('created_at', { ascending: true }),
          supabase
            .from('questions')
            .select('id, type, stem, meta, explanation, points, tags, order_index')
            .eq('quiz_id', id)
            .order('order_index', { ascending: true }),
        ]);

        if (cancelled) return;
        if (!qzRes.error && qzRes.data) setQuiz(qzRes.data as Quiz);
        if (!attRes.error && attRes.data) setAttempt(attRes.data as Attempt);
        if (!ansRes.error && ansRes.data) setAnswers(ansRes.data as AttemptAnswer[]);
        if (!qsRes.error && qsRes.data) {
          const byId = (qsRes.data as Question[]).reduce((acc, q) => {
            acc[q.id] = q;
            return acc;
          }, {} as QAById);
          setQuestions(byId);
        }
      } catch (e) {
        console.error(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [id, attemptId]);

  const maxScore = useMemo(
    () => Object.values(questions).reduce((sum, q) => sum + Number((q as any).points || 0), 0),
    [questions]
  );
  const scoreTotal = useMemo(
    () => Number((attempt as any)?.score_total ?? 0),
    [attempt?.score_total]
  );
  const percentage = useMemo(
    () => (maxScore ? Math.round((scoreTotal / maxScore) * 100) : 0),
    [scoreTotal, maxScore]
  );

  const startedAt = attempt?.created_at ? new Date(attempt.created_at as any) : null;
  const finishedAt = (attempt as any)?.submitted_at ? new Date((attempt as any).submitted_at) : null;
  const durationSec = Math.max(
    0,
    finishedAt && startedAt ? Math.floor((finishedAt.getTime() - startedAt.getTime()) / 1000) : 0
  );
  const durationHHMMSS = useMemo(() => {
    const s = Math.max(0, durationSec | 0);
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), ss = s % 60;
    const pad = (n: number) => String(n).padStart(2, '0');
    return h > 0 ? `${pad(h)}:${pad(m)}:${pad(ss)}` : `${pad(m)}:${pad(ss)}`;
  }, [durationSec]);

  const topicMastery = useMemo(() => {
    const m = new Map<string, { correct: number; total: number }>();
    for (const a of answers) {
      const q = questions[(a as any).question_id];
      if (!q) continue;
      const tagsCol = (q as any).tags as string[] | null | undefined;
      const tagsMeta = Array.isArray((q as any)?.meta?.tags) ? (q as any).meta.tags : [];
      const topics = (tagsCol && tagsCol.length ? tagsCol : tagsMeta) ?? [];
      const tags = topics.length ? topics : ['General'];
      for (const t of tags) {
        const rec = m.get(t) || { correct: 0, total: 0 };
        rec.total += 1;
        rec.correct += (a as any).is_correct ? 1 : 0;
        m.set(t, rec);
      }
    }
    const rows = Array.from(m, ([topic, v]) => ({
      topic,
      correct: v.correct,
      total: v.total,
      percent: Math.round((v.correct / Math.max(1, v.total)) * 100),
    }));
    rows.sort((a, b) => a.percent - b.percent || b.total - a.total);
    return rows;
  }, [answers, questions]);

  if (loading || !attempt || !quiz) {
    return <div className="max-w-3xl mx-auto p-4">Loading...</div>;
  }

  const passed = (quiz as any).pass_mark != null
    ? percentage >= Number((quiz as any).pass_mark)
    : undefined;

  return (
    <div ref={reportRef} className="max-w-3xl mx-auto p-4 space-y-4">
      {/* Header + actions */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{quiz.title} — Results</h1>
        <div className="flex gap-3">
          <Link to={`/quizzes/${id}/take`} className="px-3 py-1 rounded border">
            Retake
          </Link>
          <button
            onClick={() => {
              try {
                const rows = answers.map((a, idx) => {
                  const q = questions[(a as any).question_id];
                  return {
                    index: idx + 1,
                    question: (q as any)?.stem ?? '',
                    type: (q as any)?.type ?? '',
                    correct: (a as any).is_correct ? 'Yes' : 'No',
                    score: Number((a as any).score_awarded ?? 0),
                    maxScore: Number((q as any)?.points ?? 0),
                  };
                });
                const head = Object.keys(rows[0] || { index: 1, question: '', type: '', correct: '', score: 0, maxScore: 0 }).join(',');
                const body = rows
                  .map((r) => Object.values(r).map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
                  .join('\n');
                const blob = new Blob([head + '\n' + body], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const aElm = document.createElement('a');
                aElm.href = url;
                aElm.download = `quiz_${id}_attempt_${attempt.id}_summary.csv`;
                aElm.click();
                URL.revokeObjectURL(url);
              } catch (e) {
                console.error(e);
                alert('Failed to export CSV');
              }
            }}
            className="px-3 py-1 rounded border hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            Export CSV
          </button>
          <button onClick={() => window.print()} className="px-3 py-1 rounded border">
            Print / Save PDF
          </button>
          <button onClick={handleDownloadPdf} className="px-3 py-1 rounded border">
            Download PDF
          </button>
        </div>
      </div>

      {/* Score cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="border rounded p-3">
          <div className="text-sm text-gray-500">Score</div>
          <div className="text-2xl font-semibold">{scoreTotal} / {maxScore}</div>
        </div>
        <div className="border rounded p-3">
          <div className="text-sm text-gray-500">Percentage</div>
          <div className="text-2xl font-semibold">{percentage}%</div>
        </div>
      </div>

      {passed !== undefined && (
        <div className={`border rounded p-3 ${passed ? 'border-green-400 bg-green-50/50' : 'border-red-400 bg-red-50/50'}`}>
          <div className="text-sm text-gray-600">Pass mark: {(quiz as any).pass_mark}%</div>
          <div className="text-lg font-medium">{passed ? 'Passed 🎉' : 'Not passed'}</div>
        </div>
      )}

      {/* Attempt meta */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="border rounded p-3">
          <div className="text-sm text-gray-500">Attempt ID</div>
          <div className="text-sm break-all">{attempt.id}</div>
        </div>
        <div className="border rounded p-3">
          <div className="text-sm text-gray-500">Date</div>
          <div className="text-sm">{startedAt ? startedAt.toLocaleString() : '-'}</div>
        </div>
        <div className="border rounded p-3">
          <div className="text-sm text-gray-500">Duration</div>
          <div className="text-sm">{durationHHMMSS}</div>
        </div>
      </div>

      {/* Per-question breakdown */}
      <div className="space-y-3">
        {answers.map((a) => {
          const q = questions[(a as any).question_id];
          const isCorrect = !!(a as any).is_correct;
          return (
            <div
              key={(a as any).id}
              className={`border rounded p-3 ${isCorrect ? 'border-green-400' : 'border-red-400'} bg-white dark:bg-gray-800`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="font-medium">{(q as any)?.stem || 'Question'}</div>
                <div className="text-sm text-gray-500">
                  +{Number((a as any).score_awarded || 0)}/{Number((q as any)?.points || 0)}
                </div>
              </div>

              <div className="mt-2 text-sm">
                <span className="text-gray-500">Your answer:</span>{' '}
                {renderResponse(q, (a as any).response)}
              </div>

              <div className={`mt-1 text-sm ${isCorrect ? 'text-green-700' : 'text-red-700'}`}>
                {isCorrect ? 'Correct' : 'Incorrect'}
              </div>

              {(q as any)?.explanation && (
                <div className="text-sm text-gray-600 mt-2">
                  <span className="font-medium">Explanation: </span>
                  {(q as any).explanation}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Bottom actions (unmissable) */}
      <div className="pt-4">
        <Link to={`/quizzes/${id}/take`} className="px-4 py-2 rounded bg-pink-600 text-white">
          Take Again
        </Link>
      </div>
    </div>
  );
}

function renderResponse(q: Question | undefined, response: any) {
  if (!q) return '-';
  const type = (q as any).type;
  const meta = (q as any).meta ?? {};
  switch (type) {
    case 'multiple_choice_single': {
      const options = Array.isArray((meta as any).options) ? (meta as any).options : [];
      const lookup = new Map<string, string>();
      for (const op of options) {
        const id = String((op as any)?.id ?? '');
        const text = String((op as any)?.text ?? id);
        lookup.set(id, text);
      }
      const val = response?.value ?? response?.id ?? response;
      if (val == null || val === '') return '-';
      return lookup.get(String(val)) ?? `Option ${String(val)}`;
    }
    case 'multiple_choice_multiple': {
      const options = Array.isArray((meta as any).options) ? (meta as any).options : [];
      const lookup = new Map<string, string>();
      for (const op of options) {
        const id = String((op as any)?.id ?? '');
        const text = String((op as any)?.text ?? id);
        lookup.set(id, text);
      }
      const arr: string[] = Array.isArray(response?.values) ? response.values
        : Array.isArray(response) ? response : [];
      if (!arr.length) return '-';
      return arr.map((id) => (lookup.has(id) ? String(lookup.get(id)) : `Option ${String(id)}`)).join(', ');
    }
    case 'short_answer': {
      const txt = response?.text ?? response;
      return (txt == null || txt === '') ? '-' : String(txt);
    }
    case 'true_false': {
      const val = typeof response?.value === 'boolean'
        ? response.value
        : (response === true || response === false ? response : null);
      return val === null ? '-' : (val ? 'True' : 'False');
    }
    case 'ordering': {
      const items = Array.isArray((meta as any).items) ? (meta as any).items : [];
      const idToText = new Map(items.map((i: any) => [String(i?.id), String(i?.text ?? i?.id)]));
      const order: string[] = Array.isArray(response?.order) ? response.order : [];
      if (!order.length) return '-';
      return order.map((id) => idToText.get(String(id)) ?? String(id)).join(' → ');
    }
    case 'matching': {
      const left = Array.isArray((meta as any).left) ? (meta as any).left : [];
      const right = Array.isArray((meta as any).right) ? (meta as any).right : [];
      const map: Record<string, string> = response?.map ?? {};
      if (!map || typeof map !== 'object' || !Object.keys(map).length) return '-';
      const R = new Map(right.map((r: any) => [String(r.id), String(r.text ?? r.id)]));
      const L = new Map(left.map((l: any) => [String(l.id), String(l.text ?? l.id)]));
      return (
        <ul className="list-disc ml-5">
          {Object.entries(map).map(([l, r]) => (
            <li key={l}>
              {String(L.get(String(l)) ?? l)} → {String(R.get(String(r)) ?? r)}
            </li>
          ))}
        </ul>
      );
    }
    default:
      return '-';
  }
}
