import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { Quiz } from '../types/database';
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

      // Load quiz
      const { data: qz, error: e1 } = await supabase.from('quizzes').select('*').eq('id', id).single();
      if (e1 || !qz) {
        toast.error('Failed to load quiz');
        return;
      }
      setQuiz(qz as any);

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

  const current = questions[idx];
  const total = questions.length;

  const canPrev = idx > 0;
  const canNext = idx < total - 1;

  const next = () => canNext && setIdx((i) => i + 1);
  const prev = () => canPrev && setIdx((i) => i - 1);

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

    // 2) Grade locally and persist answer rows
    const rows = questions.map((q) => {
      const response = answers[q.id] ?? null;
      const result = grade(q, response); // { isCorrect, score }
      return {
        attempt_id: att.id,
        question_id: q.id,
        response: response ?? {},
        is_correct: result.isCorrect,
        score: result.score,
        possible: Number(q.points ?? 1),
        created_at: new Date().toISOString(),
      };
    });

    const { error: e2 } = await supabase.from('attempt_answers').insert(ro_
