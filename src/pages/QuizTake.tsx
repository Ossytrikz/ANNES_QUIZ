import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { Quiz } from '../types/database';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';
import TakeQuestion from '../components/questions/TakeQuestion';
import { grade, type QuestionRecord } from '../lib/grading';

export default function QuizTakePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<QuestionRecord[]>([]);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [idx, setIdx] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      const { data: qz, error: e1 } = await supabase.from('quizzes').select('*').eq('id', id).single();
      if (e1 || !qz) { toast.error('Failed to load quiz'); return; }
      setQuiz(qz);
      const { data: qs, error: e2 } = await supabase
        .from('questions')
        .select('id, type, stem, points, order_index')
        .eq('quiz_id', id)
        .order('order_index', { ascending: true })
        .order('created_at', { ascending: true });
      if (e2 || !qs) { toast.error('Failed to load questions'); return; }
      // randomize if configured
      let list = (qs as any[]).map(normalizeType) as QuestionRecord[];
      if (qz.shuffle_questions) list = shuffle(list);
      setQuestions(list);
    };
    load();
  }, [id]);

  const onChangeAnswer = (qid: string, value: any) => {
    setAnswers((prev: Record<string, any>) => ({ ...prev, [qid]: value }));
  };

  const onSubmit = async () => {
    if (!user || !id) { toast.error('Please sign in'); return; }
    setSubmitting(true);
    // create attempt (status in_progress)
    const { data: att, error: e1 } = await supabase
      .from('attempts')
      .insert({ quiz_id: id, user_id: user.id, status: 'in_progress' })
      .select('id')
      .single();
    if (e1 || !att) { setSubmitting(false); toast.error('Failed to create attempt'); return; }

    // grade and persist answers
    const rows = questions.map((q: QuestionRecord) => {
      const response = answers[q.id] ?? null;
      const result = grade(q, response);
      return {
        attempt_id: att.id,
        question_id: q.id,
        response: response ?? {},
        is_correct: result.isCorrect,
        score_awarded: result.score,
      };
    });
    const { error: e2 } = await supabase.from('attempt_answers').upsert(rows as any[], { onConflict: 'attempt_id,question_id' } as any);
    if (e2) { setSubmitting(false); toast.error('Failed to save answers'); return; }

    const score_total = rows.reduce((s: number, r: any) => s + Number(r.score_awarded || 0), 0);

    const { error: e3 } = await supabase
      .from('attempts')
      .update({ status: 'submitted', submitted_at: new Date().toISOString(), score_total })
      .eq('id', att.id);
    if (e3) { setSubmitting(false); toast.error('Failed to finalize attempt'); return; }

    setSubmitting(false);
    toast.success('Submitted');
    navigate(`/quizzes/${id}/results/${att.id}`);
  };

  const current = useMemo(() => questions[idx], [questions, idx]);

  if (!quiz) return <div className="max-w-3xl mx-auto p-4">Loading...</div>;

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{quiz.title}</h1>
        <div className="text-sm text-gray-500">{idx + 1} / {questions.length}</div>
      </div>

      {current && (
        <div className="border rounded p-4 bg-white dark:bg-gray-800">
          <div className="mb-3 font-medium">{current.stem}</div>
          <TakeQuestion question={current as any} value={answers[current.id]} onChange={(v:any)=>onChangeAnswer(current.id, v)} />
        </div>
      )}

      <div className="flex justify-between">
        <button className="px-3 py-2 border rounded" disabled={idx===0} onClick={()=>setIdx((i: number)=>Math.max(0,i-1))}>Back</button>
        {idx < questions.length - 1 ? (
          <button className="px-3 py-2 bg-blue-600 text-white rounded" onClick={()=>setIdx((i: number)=>Math.min(questions.length-1,i+1))}>Next</button>
        ) : (
          <button className="px-3 py-2 bg-green-600 text-white rounded disabled:opacity-60" disabled={submitting} onClick={onSubmit}>
            {submitting ? 'Submitting...' : 'Submit'}
          </button>
        )}
      </div>
    </div>
  );
}

function shuffle<T>(arr: T[]): T[] { return arr.map(x=>[Math.random(), x] as const).sort((a,b)=>a[0]-b[0]).map(([,x])=>x); }

function normalizeType(row: any): QuestionRecord {
  const map: Record<string, QuestionRecord['type']> = {
    multiple_choice_single: 'mc_single',
    multiple_choice_multiple: 'mc_multi',
    open_question: 'open',
  } as any;
  const type = (map[row.type] ?? row.type) as QuestionRecord['type'];
  return { id: row.id, type, stem: row.stem, meta: row.meta ?? {}, points: row.points };
}
