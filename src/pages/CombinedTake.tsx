import { useEffect, useMemo, useState, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import type { Quiz } from '../types/database';
import TakeQuestion from '../components/questions/TakeQuestion';
import { grade, type QuestionRecord } from '../lib/grading';
import toast from 'react-hot-toast';

// ==== Debug Logger ====
const DEBUG_QUIZ = true;
function dq(scope: "present", msg: string, extra?: any) {
  if (!DEBUG_QUIZ) return;
  const tag = `[QUIZ][${scope}]`;
  if (extra !== undefined) {
    try {
      console.debug(tag, msg, JSON.parse(JSON.stringify(extra)));
    } catch {
      console.debug(tag, msg, extra);
    }
  } else {
    console.debug(tag, msg);
  }
}

// ==== Tiny utils ====
function parseIds(s: string): string[] {
  return (s || '').split(',').map((x) => x.trim()).filter(Boolean);
}
function hasValue(v: any): boolean {
  return !(v === undefined || v === null || String(v) === '');
}
function truthyFlag(v: any): boolean {
  return v === true || v === 1 || v === '1' || (typeof v === 'string' && (v.toLowerCase() === 'true' || v.toLowerCase() === 'yes'));
}
function getOptionsList(meta: any): any[] {
  if (!meta) return [];
  if (Array.isArray(meta.options)) return meta.options;
  if (Array.isArray(meta.items)) return meta.items;
  if (Array.isArray(meta.choices)) return meta.choices;
  return [];
}
function getOptionId(o: any): string {
  return String(o?.id ?? o?.value ?? o?.key ?? o?.text ?? '');
}
function labelByIdFromList(list: any[] = []) {
  const m = new Map<string, string>();
  for (const o of list) {
    const id = getOptionId(o);
    const text = String(o?.text ?? o?.label ?? o?.name ?? o?.title ?? o?.id ?? '');
    if (id) m.set(id, text);
  }
  return m;
}
function resolveIdFromIndex(list: any[], idx: number): string | null {
  if (!Array.isArray(list)) return null;
  if (idx < 0 || idx >= list.length) return null;
  const it = list[idx];
  return String(it?.id ?? it?.value ?? it?.key ?? it?.text ?? '');
}

export default function CombinedTakePage() {
  const { user } = useAuth();
  const loc = useLocation();

  const params = new URLSearchParams(loc.search);
  const idsParam = params.get('ids') || '';
  const ids = useMemo(() => parseIds(idsParam), [idsParam]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [questions, setQuestions] = useState<QuestionRecord[]>([]);
  const [origin, setOrigin] = useState<Record<string, string>>({});
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [idx, setIdx] = useState(0);
  const [filterQuiz, setFilterQuiz] = useState<string>('all');

  const [done, setDone] = useState(false);
  const [result, setResult] = useState<{ score: number; total: number } | null>(null);
  const [resultDetails, setResultDetails] = useState<
    Array<{
      id: string;
      type: string;
      stem: string;
      ok: boolean | null;
      score: number;
      pts: number;
      your: any;
      correct: any;
    }>
  >([]);

  // === Results actions & PDF ===
  const reportRef = useRef<HTMLDivElement | null>(null);

  function handleExportCsv() {
    try {
      const rows = resultDetails.map((d, idx) => ({
        index: idx + 1,
        type: d.type,
        question: d.stem,
        correct: d.ok === null ? 'Ungraded' : (d.ok ? 'Yes' : 'No'),
        score: d.score,
        maxScore: d.pts,
        your: Array.isArray(d.your) ? d.your.join('; ') : (typeof d.your === 'string' ? d.your : JSON.stringify(d.your)),
        correctAns: Array.isArray(d.correct) ? d.correct.join('; ') : (typeof d.correct === 'string' ? d.correct : JSON.stringify(d.correct)),
      }));
      const headKeys = Object.keys(rows[0] || {index:1,type:'',question:'',correct:'',score:0,maxScore:0,your:'',correctAns:''});
      const head = headKeys.join(',');
      const body = rows.map(r => headKeys.map(k => `"${
        String((r as any)[k]).replace(/"/g,'""')
      }"`).join(',')).join('\n');
      const blob = new Blob([head + '\n' + body], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'combined_quiz_results.csv';
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      alert('Failed to export CSV');
    }
  }

  async function handleDownloadPdf() {
    const { buildResultsSummaryPdf } = await import('../utils/pdf');
    const totalPts = questions.reduce((a,q)=>a+Number((q as any).points||0),0);
    await buildResultsSummaryPdf({
      quizTitle: 'Combined Quiz',
      result: result || { score: 0, total: totalPts },
      resultDetails: resultDetails as any,
      meta: { date: new Date().toLocaleString() },
      logoUrl: '/Annes Quiz.png'
    }, 'combined_quiz_summary.pdf');
  }

  function handleRetakeWrongOnly() {
    const wrongIds = resultDetails.filter(d => d.ok === false).map(d => d.id);
    if (!wrongIds.length) {
      alert('No wrong answers to retake');
      return;
    }
    const filtered = questions.filter((q:any) => wrongIds.includes(q.id));
    setDone(false);
    setResult(null);
    setResultDetails([]);
    setIdx(0);
    setAnswers({});
    setQuestions(filtered as any);
  }

  useEffect(() => {
    try { console.log('[React version]', (React as any).version); } catch {}
    let on = true;
    const load = async () => {
      if (!ids.length) {
        setError('No quizzes specified');
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setError(null);

        const { data: qs, error: e1 } = await supabase.from('quizzes').select('*').in('id', ids);
        if (e1 || !qs) throw new Error('Failed to load quizzes');
        on && setQuizzes(qs as any);

        const { data: qrows, error: e2 } = await supabase
          .from('questions')
          .select('id, type, stem, meta, points, order_index, quiz_id, created_at')
          .in('quiz_id', ids)
          .order('quiz_id', { ascending: true })
          .order('order_index', { ascending: true })
          .order('created_at', { ascending: true });

        if (e2 || !qrows) throw new Error('Failed to load questions');

        const list = (qrows as any[]).map((row) => {
          const map: Record<string, QuestionRecord['type']> = {
            multiple_choice_single: 'mc_single',
            multiple_choice_multiple: 'mc_multi',
            open_question: 'open',
            short_answer: 'short_text',
          } as const;
          const type = (map[row.type] ?? row.type) as QuestionRecord['type'];

          let meta: any = {};
          try {
            meta = typeof row.meta === 'string' ? JSON.parse(row.meta) : (row.meta || {});
          } catch {
            meta = {};
          }

          return { id: row.id, type, stem: row.stem, meta, points: row.points } as QuestionRecord;
        });

        const mapOrigin: Record<string, string> = {};
        for (const r of qrows as any[]) mapOrigin[r.id] = r.quiz_id;

        on && setOrigin(mapOrigin);
        on && setQuestions(list);
        on && setIdx(0);
        on && setAnswers({});
      } catch (e: any) {
        on && setError(e.message || 'Failed to load combined quiz');
      } finally {
        on && setLoading(false);
      }
    };

    load();
    return () => {
      on = false;
    };
  }, [ids.join(',')]);

  const filteredQuestions = useMemo(() => {
    if (filterQuiz === 'all') return questions;
    return questions.filter((q) => origin[q.id] === filterQuiz);
  }, [filterQuiz, questions, origin]);

  const titleById = useMemo(() => {
    const m: Record<string, string> = {};
    for (const q of quizzes as any[]) {
      m[(q as any).id] = (q as any).title || (q as any).id;
    }
    return m;
  }, [quizzes]);

  const onChangeAnswer = (qid: string, value: any) => {
    setAnswers((prev) => ({ ...prev, [qid]: value }));
  };

  /** Build "Your vs Correct" presentation with id/label/index fallbacks + debug */
  function presentYourAndCorrect(q: QuestionRecord, resp: any) {
    const meta = q.meta ?? {};
    const type = q.type;

    try {
      if (type === 'mc_single') {
        const options = getOptionsList(meta);
        if (!options.length) dq("present", "mc_single: options empty", { qid: q.id, metaKeys: Object.keys(meta ?? {}) });
        const L = labelByIdFromList(options);

        const yourId = resp?.choice ?? resp;
        if (!hasValue(yourId)) dq("present", "mc_single: yourId empty", { qid: q.id, resp });
        const your = hasValue(yourId) ? (L.get(String(yourId)) ?? String(yourId)) : '';

        // Preferred path: correctAnswers array of ids
        if (Array.isArray(meta?.correctAnswers) && meta.correctAnswers.length > 0) {
          const correctIds = meta.correctAnswers.map((x: any) => String(x));
          const correctOpts = options.filter((o: any) => correctIds.includes(String(o?.id ?? o?.value ?? o?.key ?? o?.text ?? '')));
          let correctLabels = correctOpts.map((o: any) => o?.text ?? o?.label ?? o?.name ?? o?.title ?? String(o?.id ?? o?.value ?? o?.key ?? o?.text ?? ''));
          if (correctLabels.length === 0) {
            dq("present", "mc_single: correctAnswers provided but no label match; falling back to IDs", { qid: q.id, correctIds });
            correctLabels = correctIds;
          }
          const correct = correctLabels.length > 1 ? correctLabels : (correctLabels[0] ?? '');
          return { your, correct };
        }

        // Legacy single-value fields
        let corrRaw: any =
          meta?.correct ??
          meta?.answer ??
          meta?.correctId ??
          meta?.correct_id ??
          meta?.correctIndex ??
          meta?.solution ??
          meta?.correctLabel ??
          meta?.correct_text ??
          '';

        // index → id if numeric
        if (typeof corrRaw === 'number' || (typeof corrRaw === 'string' && /^\d+$/.test(corrRaw))) {
          const mapped = resolveIdFromIndex(options, Number(corrRaw));
          if (mapped) {
            dq("present", "mc_single: mapped numeric correct → id", { qid: q.id, idx: Number(corrRaw), id: mapped });
            corrRaw = mapped;
          } else {
            dq("present", "mc_single: numeric correct out of range", { qid: q.id, idx: Number(corrRaw), optionsLen: options.length });
          }
        }

        // derive from flags if still empty
        if (!hasValue(corrRaw) && options.length) {
          const FLAG_KEYS = ['correct', 'isCorrect', 'is_correct', 'answer', 'is_correct_answer'];
          const first = options.find((o: any) => FLAG_KEYS.some(k => k in (o ?? {}) && truthyFlag((o as any)[k])));
          if (first) {
            corrRaw = first.id ?? first.value ?? first.key ?? first.text ?? '';
            dq("present", "mc_single: derived correct from option flag", { qid: q.id, id: corrRaw });
          } else {
            dq("present", "mc_single: no correct flag found; correct may be missing", { qid: q.id });
          }
        }

        const correct = hasValue(corrRaw) ? (L.get(String(corrRaw)) ?? String(corrRaw)) : '';
        if (!hasValue(correct)) dq("present", "mc_single: final correct label empty", { qid: q.id, corrRaw, optionsLen: options.length });

        return { your, correct };
      }

      if (type === 'mc_multi') {
        const options = getOptionsList(meta);
        const L = labelByIdFromList(options);

        const yourIds: string[] = Array.isArray(resp?.choices)
          ? resp.choices
          : Array.isArray(resp)
          ? resp
          : [];
        if (!yourIds.length) dq("present", "mc_multi: yourIds empty", { qid: q.id, resp });
        const your = yourIds.map((id) => L.get(String(id)) ?? String(id));

        // Preferred: meta.correctAnswers as array of ids
        if (Array.isArray(meta?.correctAnswers) && meta.correctAnswers.length > 0) {
          const correctIds = meta.correctAnswers.map((x: any) => String(x));
          const correctOpts = options.filter((o: any) => correctIds.includes(String(o?.id ?? o?.value ?? o?.key ?? o?.text ?? '')));
          let correctLabels = correctOpts.map((o: any) => o?.text ?? o?.label ?? o?.name ?? o?.title ?? String(o?.id ?? o?.value ?? o?.key ?? o?.text ?? ''));
          if (correctLabels.length === 0) {
            dq("present", "mc_multi: correctAnswers provided but no label matches; fallback to IDs", { qid: q.id, correctIds });
            correctLabels = correctIds;
          }
          return { your, correct: correctLabels };
        }

        // Other legacy fields
        let corr: any[] =
          (Array.isArray(meta?.correct) && meta.correct) ||
          (Array.isArray(meta?.answers) && meta.answers) ||
          [];
        const looksNumeric = corr.every((x) => Number.isInteger(Number(x)));
        if (looksNumeric && options.length) {
          corr = corr
            .map((n) => resolveIdFromIndex(options, Number(n)))
            .filter((x): x is string => !!x);
          dq("present", "mc_multi: mapped numeric correct → ids", { qid: q.id, corr });
        }
        if ((!corr || corr.length === 0) && options.length) {
          corr = options
            .filter((o: any) => truthyFlag(o?.correct) || truthyFlag(o?.isCorrect) || truthyFlag(o?.is_correct))
            .map(getOptionId)
            .map(String);
          dq("present", "mc_multi: derived from flags", { qid: q.id, corr });
        }

        const correct = corr.map((id: any) => L.get(String(id)) ?? String(id));
        return { your, correct };
      }

      if (type === 'ordering') {
        const opts = Array.isArray(meta.options) ? meta.options : (Array.isArray(meta.items) ? meta.items : (Array.isArray(meta.choices) ? meta.choices : []));
        const L = labelByIdFromList(opts);

        const yourIds: string[] = Array.isArray(resp?.order) ? resp.order : [];
        if (!yourIds.length) dq("present", "ordering: yourIds empty", { qid: q.id, resp });
        const your = yourIds.map((id) => L.get(String(id)) ?? String(id));

        // Preferred: meta.correctOrder as array of IDs
        if (Array.isArray(meta?.correctOrder) && meta.correctOrder.length > 0) {
          const correctLabels = meta.correctOrder.map((id: any) => {
            const target = opts.find((x: any) => {
              const candidates = [x?.id, x?.value, x?.key, x?.text].map((v) => String(v ?? ''));
              return candidates.includes(String(id));
            });
            return target?.text ?? target?.label ?? target?.name ?? target?.title ?? String(id);
          });
          return { your, correct: correctLabels };
        }

        // Fallback: meta.order (labels/strings)
        if (Array.isArray(meta?.order) && meta.order.length > 0) {
          const correctLabels = meta.order.map((s: any) => String(s));
          return { your, correct: correctLabels };
        }

        // Legacy or unknown: keep previous behavior
        let corr: any[] =
          (Array.isArray(meta?.correct) && meta.correct) ||
          [];
        const looksNumeric = corr.every((x) => Number.isInteger(Number(x)));
        if (looksNumeric && opts.length) {
          corr = corr
            .map((n) => resolveIdFromIndex(opts, Number(n)))
            .filter((x): x is string => !!x);
          dq("present", "ordering: mapped numeric correct → ids (legacy)", { qid: q.id, corr });
        }
        const correct = corr.map((id: any) => L.get(String(id)) ?? String(id));
        return { your, correct };
      }

      if (type === 'matching') {
        const left = Array.isArray(meta.left) ? meta.left : [];
        const right = Array.isArray(meta.right) ? meta.right : [];
        const R = labelByIdFromList(right);
        const yourMap = (resp?.map ?? {}) as Record<string, string>;
        const corrMap = (meta.correctMap ?? {}) as Record<string, string>;

        if (!left.length) dq("present", "matching: no left items", { qid: q.id });
        const yourPairs = left.map((l: any) => {
          const key = String(l?.id ?? l?.text ?? '');
          const raw = String(yourMap[key] ?? '');
          const label = R.get(raw) ?? raw; // fallback to raw id if no label
          return { left: String(l?.text ?? l?.id ?? ''), right: label };
        });
        const correctPairs = left.map((l: any) => {
          const key = String(l?.id ?? l?.text ?? '');
          const raw = String(corrMap[key] ?? '');
          const label = R.get(raw) ?? raw;
          return { left: String(l?.text ?? l?.id ?? ''), right: label };
        });
        return { your: yourPairs, correct: correctPairs };
      }

      if (type === 'short_text' || type === 'open') {
        const your =
          typeof resp === 'string' || typeof resp === 'number' ? String(resp) : (resp?.text ?? '');
        const correct =
          Array.isArray(meta?.acceptedAnswers) && meta.acceptedAnswers.length
            ? meta.acceptedAnswers.join(' | ')
            : (meta?.rubric ?? '');
        return { your, correct };
      }

      if (type === 'true_false') {
        const your =
          typeof resp === 'boolean'
            ? String(resp)
            : typeof resp === 'string' || typeof resp === 'number'
            ? String(resp)
            : resp?.value != null
            ? String(!!resp.value)
            : '';
        const correct = String(!!(meta?.correct ?? meta?.answer));
        return { your, correct };
      }

      dq("present", "unknown type", { qid: q.id, type });
      return { your: '', correct: '' };
    } catch (err) {
      dq("present", "EXCEPTION in presenter", {
        qid: q.id,
        type: q.type,
        err: String(err),
        metaKeys: Object.keys(meta ?? {}),
        respSnapshot: (() => { try { return JSON.parse(JSON.stringify(resp)); } catch { return "<unstringifiable>"; } })(),
      });
      return { your: '', correct: '' };
    }
  }

  async function onSubmit() {
    if (!user) {
      toast.error('Please sign in');
      return;
    }
    const filtered = filterQuiz === 'all' ? questions : questions.filter((q) => origin[q.id] === filterQuiz);
    if (!filtered.length) {
      toast.error('No questions to submit');
      return;
    }

    let score = 0;
    let totalPts = 0;
    const details: typeof resultDetails = [];

    for (const q of filtered) {
      const pts = Number(q.points ?? 1);
      const resp = answers[q.id] ?? null;
      const res = grade(q, resp);
      const ok = res.isCorrect;
      const earned = ok ? pts : 0;

      const present = presentYourAndCorrect(q, resp);
      details.push({
        id: q.id,
        type: q.type,
        stem: q.stem,
        ok,
        score: earned,
        pts,
        your: present.your,
        correct: present.correct,
        // Include origin quiz title for PDF and UI rendering
        ...(origin[q.id] ? { origin: titleById[origin[q.id]] || origin[q.id] } : {}),
      });

      score += earned;
      totalPts += pts;
    }

    setResultDetails(details);
    setResult({ score, total: totalPts });
    setDone(true);
  }

  const currentList = filterQuiz === 'all' ? questions : questions.filter((q) => origin[q.id] === filterQuiz);
  const current = currentList[idx];
  const total = currentList.length;
  const canPrev = idx > 0;
  const canNext = idx < total - 1;
  const next = () => canNext && setIdx((i) => i + 1);
  const prev = () => canPrev && setIdx((i) => i - 1);

  if (loading) return <div>Loading…</div>;
  if (error) return <div className="text-red-600">{error}</div>;
  if (!questions.length) return <div>No questions found.</div>;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Combined Quiz</h1>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Filter:</label>
          <select
            className="border rounded px-2 py-1"
            value={filterQuiz}
            onChange={(e) => {
              setFilterQuiz(e.target.value);
              setIdx(0);
            }}
          >
            <option value="all">All quizzes</option>
            {quizzes.map((q) => (
              <option key={(q as any).id} value={(q as any).id}>
                {(q as any).title || (q as any).id}
              </option>
            ))}
          </select>
        </div>
      </div>

      {!done ? (
        <>
          <div className="border rounded-lg p-4">
            {current ? (
              <>
                <div className="mb-4">
                  <div className="flex items-start justify-between gap-3 mb-1">
                    <div className="text-base font-medium">{current.stem}</div>
                    {origin[current.id] && (
                      <div className="text-xs text-gray-500 whitespace-nowrap">From quiz: <b>{titleById[origin[current.id]] || origin[current.id]}</b></div>
                    )}
                  </div>
                  <TakeQuestion
                    question={{ id: current.id, type: current.type, stem: current.stem, meta: current.meta }}
                    value={answers[current.id]}
                    onChange={(v) => setAnswers((prev) => ({ ...prev, [current.id]: v }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <button
                    className="px-4 py-2 rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-50"
                    onClick={prev}
                    disabled={!canPrev}
                  >
                    Previous
                  </button>
                  <div className="space-x-2">
                    <button
                      className="px-4 py-2 rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-50"
                      onClick={next}
                      disabled={!canNext}
                    >
                      Next
                    </button>
                    <button
                      className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
                      onClick={onSubmit}
                    >
                      Submit
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div>No question in this filter.</div>
            )}
          </div>
          <div className="text-sm text-gray-600">
            {total ? `Question ${Math.min(idx + 1, total)} / ${total}` : '—'}
          </div>
        </>
      ) : (
        <div ref={reportRef} className="border rounded-lg p-4 space-y-4">
          <div className="text-lg font-semibold">Results</div>
          <div>
            Score: <b>{result?.score}</b> / <b>{result?.total}</b>
          </div>

          <div className="flex items-center justify-end gap-2">
            <button onClick={handleExportCsv} className="px-3 py-1 rounded border">Export CSV</button>
            <button onClick={()=>window.print()} className="px-3 py-1 rounded border">Print</button>
            <button onClick={handleDownloadPdf} className="px-3 py-1 rounded border">Download PDF</button>
          </div>

          <div className="space-y-4">
            {resultDetails.map((d, i) => (
              <div key={d.id} className="border rounded p-3">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-sm text-gray-500">Q{i + 1} — {d.type}</div>
                    <div className="font-medium">{d.stem}</div>
                    {origin[d.id] && (
                      <div className="text-xs text-gray-500 mt-0.5">From quiz: <b>{titleById[origin[d.id]] || origin[d.id]}</b></div>
                    )}
                  </div>
                  <div className={d.ok ? 'text-green-600' : 'text-red-600'}>
                    {d.ok === null ? 'Ungraded' : d.ok ? 'Correct' : 'Wrong'} ({d.score}/{d.pts})
                  </div>
                </div>

                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <div>
                    <div className="text-xs uppercase text-gray-500">Your Answer</div>
                    {Array.isArray(d.your) ? (
                      <ul className="list-disc pl-5">
                        {d.your.map((t: any, k: number) => <li key={k}>{String(t)}</li>)}
                      </ul>
                    ) : typeof d.your === 'object' && d.your ? (
                      <pre className="text-sm bg-gray-50 p-2 rounded">{JSON.stringify(d.your, null, 2)}</pre>
                    ) : (
                      <div>{String(d.your ?? '')}</div>
                    )}
                  </div>

                  <div>
                    <div className="text-xs uppercase text-gray-500">Correct Answer</div>
                    {Array.isArray(d.correct) ? (
                      <ul className="list-disc pl-5">
                        {d.correct.map((t: any, k: number) => <li key={k}>{String(t)}</li>)}
                      </ul>
                    ) : typeof d.correct === 'object' && d.correct ? (
                      <pre className="text-sm bg-gray-50 p-2 rounded">{JSON.stringify(d.correct, null, 2)}</pre>
                    ) : (
                      <div>{String(d.correct ?? '')}</div>
                    )}
                  </div>
                </div>

                {questions.find((q) => q.id === d.id)?.meta?.explanation && (
                  <div className="mt-2 text-sm text-gray-600">
                    <span className="font-medium">Explanation: </span>
                    {String(questions.find((q) => q.id === d.id)?.meta?.explanation)}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div>
            <button
              className="px-4 py-2 rounded bg-gray-100 hover:bg-gray-200"
              onClick={() => {
                setDone(false);
                setResult(null);
                setResultDetails([]);
                setIdx(0);
              }}
            >
              Take Again
            </button>
            <button className="px-4 py-2 rounded bg-pink-600 text-white" onClick={handleRetakeWrongOnly}>Retake Wrong Only</button>
          </div>
        </div>
      )}
    </div>
  );
}
