import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import type { Quiz } from '../types/database';
import TakeQuestion from '../components/questions/TakeQuestion';
import { grade, type QuestionRecord } from '../lib/grading';

export default function CombinedTakePage() {
  const { user } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();

  const params = new URLSearchParams(loc.search);
  const idsParam = params.get('ids') || '';
  const feedbackParam = params.get('feedback');
  const immediateFeedback = feedbackParam === '1' || feedbackParam === 'true';

  const ids = idsParam.split(',').map(s=>s.trim()).filter(Boolean);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string|null>(null);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [questions, setQuestions] = useState<QuestionRecord[]>([]);
  const [origin, setOrigin] = useState<Record<string,string>>({}); // questionId -> quizId
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [idx, setIdx] = useState(0);
  const [done, setDone] = useState(false);
  const [result, setResult] = useState<{score: number; total: number}|null>(null);
  const [resultDetails, setResultDetails] = useState<Record<string,{awarded:number;possible:number;isCorrect:boolean|null}>>({});
  const [filterQuiz, setFilterQuiz] = useState<'all'|string>('all');

  useEffect(() => {
    const load = async () => {
      if (ids.length === 0) { setError('No quiz IDs provided.'); setLoading(false); return; }
      try {
        setLoading(true);
        setError(null);
        // Load all quizzes
        const { data: qs, error: e1 } = await supabase
          .from('quizzes')
          .select('*')
          .in('id', ids);
        if (e1 || !qs) throw new Error('Failed to load quizzes');
        setQuizzes(qs as any);

        // Load all questions for those quizzes
        const { data: qrows, error: e2 } = await supabase
          .from('questions')
          .select('id, type, stem, meta, points, order_index, quiz_id, created_at')
          .in('quiz_id', ids)
          .order('quiz_id', { ascending: true })
          .order('order_index', { ascending: true })
          .order('created_at', { ascending: true });
        if (e2 || !qrows) throw new Error('Failed to load questions');

        const list = (qrows as any[]).map(normalizeType) as QuestionRecord[];
        const map: Record<string,string> = {};
        for (const r of (qrows as any[])) map[r.id] = r.quiz_id;
        setOrigin(map);
        setQuestions(list);
        setIdx(0);
      } catch (e:any) {
        setError(e.message || 'Failed to load combined quiz');
      } finally {
        setLoading(false);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsParam]);

  const current = questions[idx];

  function onChange(qid: string, value: any) {
    setAnswers(a => ({ ...a, [qid]: value }));
  }

  async function onSubmit() {
    const details: Record<string,{awarded:number;possible:number;isCorrect:boolean|null}> = {};
    let score = 0, total = 0;
    for (const q of questions) {
      const res = answers[q.id];
      const g = grade(q, res);
      const pts = Number(q.points ?? 1);
      details[q.id] = { awarded: g.score, possible: pts, isCorrect: g.isCorrect };
      score += Number(g.score || 0);
      total += pts;
    }
    setResultDetails(details);
    setResult({ score, total });
    setDone(true);
  }

  const filteredQuestions = useMemo(()=> {
    if (filterQuiz === 'all') return questions;
    return questions.filter(q => origin[q.id] === filterQuiz);
  }, [filterQuiz, questions, origin]);

  // IMPORTANT: define titleById BEFORE any early returns & BEFORE using it in JSX
  const titleById = useMemo(() => {
    const m: Record<string,string> = {};
    for (const qz of quizzes) m[qz.id] = (qz as any).title || 'Untitled';
    return m;
  }, [quizzes]);

  function retakeWrong() {
    const wrong = questions.filter(q => {
      const d = resultDetails[q.id];
      if (!d) return false;
      if (d.isCorrect === false) return true;
      return Number(d.awarded ?? 0) < Number(d.possible ?? 0);
    });
    if (wrong.length === 0) { alert('No wrong answers to retake.'); return; }
    const copy = wrong.map(x=>x);
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    setQuestions(copy);
    setAnswers({});
    setIdx(0);
    setDone(false);
    setResult(null);
    setFilterQuiz('all');
  }

  // === Export helpers (inside component) ===
  function buildRows() {
    const rows: Array<{quiz:string; number:number; type:string; stem:string; your:string; correct:string; awarded:number; possible:number}> = [];
    questions.forEach((q, i) => {
      const quizTitle = titleById[origin[q.id]] || 'Unknown';
      const resp = answers[q.id];
      const g = grade(q, resp);
      rows.push({
        quiz: quizTitle,
        number: i + 1,
        type: q.type,
        stem: (q as any).stem,
        your: renderAnswer(q, resp),
        correct: renderCorrect(q),
        awarded: g.score,
        possible: Number(q.points ?? 1),
      });
    });
    return rows;
  }

  function exportCSV() {
    const rows = buildRows();
    const header = ['Quiz','#','Type','Question','Your Answer','Correct Answer','Awarded','Possible'];
    const lines = [header.join(',')].concat(
      rows.map(r => [
        JSON.stringify(r.quiz),
        r.number,
        JSON.stringify(r.type),
        JSON.stringify(r.stem),
        JSON.stringify(r.your),
        JSON.stringify(r.correct),
        r.awarded,
        r.possible
      ].join(','))
    );
    const csv = lines.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const ts = new Date().toISOString().replace(/[:T]/g,'-').slice(0,19);
    a.download = `quiz-results-${ts}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function exportPDF() {
    const rows = buildRows();
    const totalScore = rows.reduce((s,r)=>s+r.awarded,0);
    const totalPossible = rows.reduce((s,r)=>s+r.possible,0);
    const esc = (s:any)=> String(s).replace(/[&<>]/g,(c)=>({ '&':'&amp;','<':'&lt;','>':'&gt;' } as any)[c]);
    const rowsHtml = rows.map(r => (
      '<tr>' +
        '<td>' + esc(r.quiz) + '</td>' +
        '<td>' + r.number + '</td>' +
        '<td>' + esc(r.type) + '</td>' +
        '<td>' + esc(r.stem) + '</td>' +
        '<td>' + esc(r.your) + '</td>' +
        '<td>' + esc(r.correct) + '</td>' +
        '<td class="right">' + r.awarded + '</td>' +
        '<td class="right">' + r.possible + '</td>' +
      '</tr>'
    )).join('');

    const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Quiz Results</title>
  <style>
    body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Cantarell,'Noto Sans',sans-serif;padding:24px;color:#111}
    h1{font-size:20px;margin:0 0 8px}
    .meta{color:#555;margin-bottom:12px}
    table{border-collapse:collapse;width:100%}
    th,td{border:1px solid #ddd;padding:8px;font-size:12px;vertical-align:top}
    th{background:#f5f5f5;text-align:left}
    .right{text-align:right}
  </style>
</head>
<body>
  <h1>Quiz Results</h1>
  <div class="meta">Score: ${totalScore} / ${totalPossible} · Accuracy: ${totalPossible?Math.round(totalScore/totalPossible*100):0}% · Date: ${new Date().toLocaleString()}</div>
  <table>
    <thead><tr><th>Quiz</th><th>#</th><th>Type</th><th>Question</th><th>Your Answer</th><th>Correct Answer</th><th class="right">Awarded</th><th class="right">Possible</th></tr></thead>
    <tbody>${rowsHtml}</tbody>
  </table>
  <script>window.addEventListener('load', function(){ setTimeout(function(){ window.print(); }, 100); });</script>
</body>
</html>`;

    const w = window.open('', '_blank');
    if (w) { w.document.open(); w.document.write(html); w.document.close(); }
  }

  if (loading) return <div className="p-6">Loading...</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;
  if (!questions.length) return <div className="p-6">No questions found.</div>;

  if (!done) {
    const cur = current;
    return (
      <div className="max-w-3xl mx-auto p-4">
        <div className="mb-3 text-sm text-gray-600">
          {idx+1} / {questions.length}
        </div>
        <div className="mb-3 font-medium">{(cur as any).stem}</div>
        <div className="border rounded p-4 bg-white dark:bg-gray-800 mb-4">
          <TakeQuestion question={cur as any} value={answers[cur.id]} onChange={(v:any)=>onChange(cur.id, v)} immediate={immediateFeedback} />
        </div>
        <div className="flex justify-between">
          <button className="px-3 py-2 border rounded" onClick={()=>setIdx(i=>Math.max(0,i-1))} disabled={idx===0}>Back</button>
          {idx < questions.length - 1 ? (
            <button className="px-3 py-2 bg-blue-600 text-white rounded" onClick={()=>setIdx(i=>Math.min(questions.length-1,i+1))}>Next</button>
          ) : (
            <button className="px-3 py-2 bg-green-600 text-white rounded" onClick={onSubmit}>Submit</button>
          )}
        </div>
      </div>
    );
  }

  // Done view
  const totalScore = result?.score ?? 0;
  const totalPossible = result?.total ?? 0;
  const accuracy = totalPossible ? Math.round((totalScore/totalPossible)*100) : 0;

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-4">
      <div className="rounded border p-4 bg-white dark:bg-gray-800">
        <div className="text-lg font-semibold mb-1">Results</div>
        <div className="text-sm text-gray-600">
          Score: {totalScore} / {totalPossible} · Accuracy: {accuracy}%
        </div>
      </div>

      <div className="rounded border p-4 bg-white dark:bg-gray-800">
        <div className="flex items-center gap-2 mb-3">
          <label className="text-sm">Filter by quiz:</label>
          <select className="border rounded px-2 py-1" value={filterQuiz} onChange={e=>setFilterQuiz(e.target.value)}>
            <option value="all">All</option>
            {quizzes.map(qz => (<option key={qz.id} value={qz.id}>{(qz as any).title || 'Untitled'}</option>))}
          </select>
        </div>

        <details open>
          <summary className="cursor-pointer select-none mb-2 font-medium">Review Answers</summary>
          <div className="space-y-3">
            {questions.filter(q => filterQuiz==='all' || origin[q.id]===filterQuiz).map((q, i) => {
              const d = resultDetails[q.id];
              const ok = d?.isCorrect ?? null;
              return (
                <div key={q.id} className="border rounded p-3">
                  <div className="flex justify-between items-center mb-2">
                    <div className="text-sm text-gray-600">Q{i+1} • {(titleById[origin[q.id]] || 'Unknown')} • <span className="uppercase">{q.type}</span></div>
                    <div className="text-sm">{ok === null ? '—' : ok ? '✅ Correct' : '❌ Incorrect'} ({d?.awarded ?? 0}/{d?.possible ?? 0})</div>
                  </div>
                  <div className="mb-2 font-medium">{(q as any).stem}</div>
                  <div className="text-sm"><b>Your answer:</b> {renderAnswer(q, answers[q.id])}</div>
                  <div className="text-sm"><b>Correct:</b> {renderCorrect(q)}</div>
                </div>
              );
            })}
          </div>
        </details>

        <div className="flex gap-2 mt-3">
          <button className="px-3 py-2 border rounded" onClick={exportCSV}>Export CSV</button>
          <button className="px-3 py-2 border rounded" onClick={exportPDF}>Export PDF</button>
          <button className="px-3 py-2 border rounded" onClick={()=>nav('/console')}>Back to Console</button>
          <button className="px-3 py-2 bg-blue-600 text-white rounded" onClick={retakeWrong}>Retake wrong questions</button>
        </div>
      </div>
    </div>
  );
}

function normalizeType(row: any): QuestionRecord {
  const map: Record<string, QuestionRecord['type']> = {
    multiple_choice_single: 'mc_single',
    multiple_choice_multiple: 'mc_multi',
    open_question: 'open',
  } as any;
  const type = (map[row.type] ?? row.type) as QuestionRecord['type'];
  return { id: row.id, type, stem: row.stem, meta: row.meta ?? {}, points: row.points };
}

// Helpers to display answers
function renderAnswer(q: QuestionRecord, value: any): string {
  const m = q.meta ?? {};
  switch (q.type) {
    case 'mc_single': {
      const id = (value && typeof value === 'object' && 'choice' in value) ? (value as any).choice : value;
      const opt = (m.options || []).find((o:any)=> String(o.id) === String(id));
      return opt ? String(opt.text ?? opt.label ?? opt.id) : (id ?? '').toString();
    }
    case 'mc_multi': {
      const ids: string[] = (value && typeof value === 'object' && Array.isArray((value as any).choices)) ? (value as any).choices : Array.isArray(value) ? value : [];
      const set = new Set(ids.map(String));
      const texts = (m.options || []).filter((o:any)=> set.has(String(o.id))).map((o:any)=> String(o.text ?? o.label ?? o.id));
      return texts.join(' | ');
    }
    case 'true_false': {
      const v = (value && typeof value === 'object' && 'value' in value) ? (value as any).value : value;
      return v === true ? 'True' : v === false ? 'False' : '';
    }
    case 'short_text': {
      const t = (value && typeof value === 'object' && 'text' in value) ? (value as any).text : value;
      return (t ?? '').toString();
    }
    case 'ordering': {
      const arr = (value && typeof value === 'object' && Array.isArray((value as any).order)) ? (value as any).order : Array.isArray(value) ? value : [];
      const items = Array.isArray((m as any).items) ? (m as any).items as any[] : (Array.isArray((m as any).options) ? (m as any).options as any[] : []);
      const labelById = new Map(items.map((it:any)=> [String(it.id ?? it.value ?? it.text), String(it.text ?? it.label ?? it.value ?? it.id)]));
      const labels = arr.map((id:string)=> labelById.get(String(id)) ?? String(id));
      return labels.join(' → ');
    }
    case 'matching': {
      return value && typeof value === 'object' && 'map' in (value as any) ? JSON.stringify((value as any).map) : '';
    }
    default: return '';
  }
}

function renderCorrect(q: QuestionRecord): string {
  const m = q.meta ?? {};
  switch (q.type) {
    case 'mc_single': {
      const cid = m.correct != null ? String(m.correct) : (m.correctId != null ? String(m.correctId) : (m.correct_answer != null ? String(m.correct_answer) : (m.answer != null ? String(m.answer) : '')));
      const opt = (m.options || []).find((o:any)=> String(o.id) === cid || String(o.text ?? o.label ?? o.id) === cid);
      return opt ? String(opt.text ?? opt.label ?? opt.id) : cid;
    }
    case 'mc_multi': {
      const ids = Array.isArray(m.correct) ? m.correct.map(String) :
                  Array.isArray(m.correctIds) ? m.correctIds.map(String) :
                  Array.isArray(m.answers) ? m.answers.map(String) : [];
      const set = new Set(ids);
      const texts = (m.options || []).filter((o:any)=> set.has(String(o.id))).map((o:any)=> String(o.text ?? o.label ?? o.id));
      return texts.join(' | ');
    }
    case 'true_false': return m.correct === true ? 'True' : m.correct === false ? 'False' : '';
    case 'short_text': {
      const accepts: string[] = Array.isArray((m as any).acceptedAnswers) ? (m as any).acceptedAnswers : ((m as any).answers || []);
      return (accepts || []).join(' | ');
    }
    case 'ordering': {
      const correct = Array.isArray((m as any).correctOrder) ? (m as any).correctOrder : ((m as any).order || []);
      const items = Array.isArray((m as any).items) ? (m as any).items as any[] : (Array.isArray((m as any).options) ? (m as any).options as any[] : []);
      const labelById = new Map(items.map((it:any)=> [String(it.id ?? it.value ?? it.text), String(it.text ?? it.label ?? it.value ?? it.id)]));
      const labels = (correct as any[]).map((id:any)=> labelById.get(String(id)) ?? String(id));
      return labels.join(' → ');
    }
    case 'matching': return m && (m as any).map ? JSON.stringify((m as any).map) : '';
    default: return '';
  }
}
