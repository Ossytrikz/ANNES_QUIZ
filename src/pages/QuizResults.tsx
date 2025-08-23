import { useEffect, useMemo, useState } from 'react';
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

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
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
          // include meta & points to compute max score and render responses
          supabase
            .from('questions')
            .select('id, type, stem, meta, explanation, points, order_index')
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
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [id, attemptId]);

  const maxScore = useMemo(() => {
    return Object.values(questions).reduce((sum, q) => sum + Number(q.points || 0), 0);
  }, [questions]);

  const scoreTotal = useMemo(() => Number(attempt?.score_total ?? 0), [attempt?.score_total]);

  const percentage = useMemo(() => {
    if (!maxScore) return 0;
    return Math.round((scoreTotal / maxScore) * 100);
  }, [scoreTotal, maxScore]);

  if (loading || !attempt || !quiz) {
    return <div className="max-w-3xl mx-auto p-4">Loading...</div>;
  }

  const passed = quiz.pass_mark != null ? percentage >= Number(quiz.pass_mark) : undefined;

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{quiz.title} — Results</h1>
        <div className="flex gap-3">
          <Link to={`/quizzes/${id}/take`} className="text-blue-600 hover:underline">
            Retake
          </Link>
          <Link to={`/quizzes/${id}/edit`} className="text-gray-600 hover:underline">
            Edit
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="border rounded p-3">
          <div className="text-sm text-gray-500">Score</div>
          <div className="text-2xl font-semibold">
            {scoreTotal} / {maxScore}
          </div>
        </div>
        <div className="border rounded p-3">
          <div className="text-sm text-gray-500">Percentage</div>
          <div className="text-2xl font-semibold">{percentage}%</div>
        </div>
      </div>

      {passed !== undefined && (
        <div
          className={`border rounded p-3 ${
            passed ? 'border-green-400 bg-green-50/50' : 'border-red-400 bg-red-50/50'
          }`}
        >
          <div className="text-sm text-gray-600">Pass mark: {quiz.pass_mark}%</div>
          <div className="text-lg font-medium">{passed ? 'Passed 🎉' : 'Not passed'}</div>
        </div>
      )}

      <div className="space-y-3">
        {answers.map((a) => {
          const q = questions[a.question_id];
          const isCorrect = !!a.is_correct;
          return (
            <div
              key={a.id}
              className={`border rounded p-3 ${
                isCorrect ? 'border-green-400' : 'border-red-400'
              } bg-white dark:bg-gray-800`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="font-medium">{q?.stem || 'Question'}</div>
                <div className="text-sm text-gray-500">+{Number(a.score_awarded || 0)}/{Number(q?.points || 0)}</div>
              </div>

              <div className="mt-2 text-sm">
                <span className="text-gray-500">Your answer:</span>{' '}
                {renderResponse(q, a.response)}
              </div>

              <div className={`mt-1 text-sm ${isCorrect ? 'text-green-700' : 'text-red-700'}`}>
                {isCorrect ? 'Correct' : 'Incorrect'}
              </div>

              {q?.explanation && (
                <div className="text-sm text-gray-600 mt-2">
                  <span className="font-medium">Explanation: </span>
                  {q.explanation}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------- Rendering helpers ------------------------- */

function renderResponse(q?: Question, response?: any) {
  if (!q) return '-';

  const meta = (q.meta ?? {}) as any;

  switch (q.type) {
    case 'true_false': {
      // You store boolean in response for TF in the take page
      if (typeof response === 'boolean') return response ? 'True' : 'False';
      if (typeof response?.value === 'boolean') return response.value ? 'True' : 'False';
      return '-';
    }

    case 'short_text':
    case 'open_question': {
      const text = typeof response === 'string' ? response : response?.text;
      return text ? String(text) : '-';
    }

    case 'multiple_choice_single': {
      // You store { choice: optionId }
      const id = response?.choice ?? response;
      const opt = Array.isArray(meta.options)
        ? meta.options.find((o: any) => o?.id === id)
        : undefined;
      return opt ? String(opt.text ?? id) : (id ? `Option ${String(id)}` : '-');
    }

    case 'multiple_choice_multiple': {
      // You store { choices: [optionId] }
      const arr: string[] = Array.isArray(response?.choices)
        ? response.choices
        : Array.isArray(response)
        ? response
        : [];
      if (!arr.length) return '-';
      const lookup = new Map(
        (Array.isArray(meta.options) ? meta.options : []).map((o: any) => [o?.id, o?.text])
      );
      return arr
        .map((id) => (lookup.has(id) ? String(lookup.get(id)) : `Option ${String(id)}`))
        .join(', ');
    }

    case 'ordering': {
      const items = Array.isArray(meta.items) ? meta.items : [];
      const idToText = new Map(items.map((i: any) => [i?.id, i?.text ?? i?.id]));
      const order: string[] = Array.isArray(response?.order) ? response.order : [];
      if (!order.length) return '-';
      return order.map((id) => idToText.get(id) ?? id).join(' → ');
    }

    case 'matching': {
      const left = Array.isArray(meta.left) ? meta.left : [];
      const right = Array.isArray(meta.right) ? meta.right : [];
      const map: Record<string, string> = response?.map ?? {};
      if (!map || typeof map !== 'object' || !Object.keys(map).length) return '-';
      const R = new Map(right.map((r: any) => [r.id, r.text]));
      const L = new Map(left.map((l: any) => [l.id, l.text]));
      return (
        <ul className="list-disc ml-5">
          {Object.entries(map).map(([l, r]) => (
            <li key={l}>
              {String(L.get(l) ?? l)} → {String(R.get(r) ?? r)}
            </li>
          ))}
        </ul>
      );
    }

    default:
      return '-';
  }
}
