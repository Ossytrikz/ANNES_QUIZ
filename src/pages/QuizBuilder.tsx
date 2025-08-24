
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';
import type { Quiz } from '../types/database';
import { v4 as uuid } from 'uuid';

type BuilderQuestion =
  | { id: string; type: 'mc_single'; stem: string; options: Array<{id:string; text:string}>; correctId: string; points?: number }
  | { id: string; type: 'mc_multi'; stem: string; options: Array<{id:string; text:string}>; correctIds: string[]; points?: number }
  | { id: string; type: 'true_false'; stem: string; correct: boolean; points?: number }
  | { id: string; type: 'short_text'; stem: string; acceptedAnswers: string[]; points?: number }
  | { id: string; type: 'ordering'; stem: string; items: Array<{id:string; text:string}>; correctOrder: string[]; points?: number }
  | { id: string; type: 'matching'; stem: string; left: Array<{id:string; text:string}>; right: Array<{id:string; text:string}>; map: Record<string,string>; points?: number };

function newId() { return uuid(); }

export default function QuizBuilder() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('General');
  const [description, setDescription] = useState('');
  const [questions, setQuestions] = useState<BuilderQuestion[]>([]);
  const [saving, setSaving] = useState(false);

  function addQuestion(q: BuilderQuestion) {
    setQuestions(prev => [...prev, q]);
  }
  function removeQuestion(id: string) { setQuestions(prev => prev.filter(q => q.id !== id)); }

  async function saveQuiz() {
    if (!user) { toast.error('Please sign in'); return; }
    if (!title.trim()) { toast.error('Title is required'); return; }
    if (questions.length === 0) { toast.error('Add at least one question'); return; }
    setSaving(true);
    try {
      const { data: quizRow, error: e1 } = await supabase.from('quizzes').insert({
        owner_id: user.id,
        title,
        description,
        subject,
        is_public: false,
      }).select('id').single();
      if (e1 || !quizRow) throw new Error(e1?.message || 'Failed to create quiz');

      const qRows = questions.map((q, i) => {
        const base:any = { id: q.id, quiz_id: quizRow.id, stem: q.stem, order_index: i, points: Number(q.points ?? 1) };
        switch(q.type) {
          case 'mc_single':
            return { ...base, type: 'multiple_choice_single', options: q.options, meta: { options: q.options, correctId: q.correctId } };
          case 'mc_multi':
            return { ...base, type: 'multiple_choice_multiple', options: q.options, meta: { options: q.options, correct: q.correctIds } };
          case 'true_false':
            return { ...base, type: 'true_false', meta: { correct: q.correct } };
          case 'short_text':
            return { ...base, type: 'short_text', meta: { acceptedAnswers: q.acceptedAnswers } };
          case 'ordering':
            return { ...base, type: 'ordering', meta: { items: q.items, correctOrder: q.correctOrder } };
          case 'matching':
            return { ...base, type: 'matching', meta: { left: q.left, right: q.right, map: q.map } };
        }
      });

      const { error: e2 } = await supabase.from('questions').insert(qRows as any);
      if (e2) throw new Error(e2.message || 'Failed to save questions');

      toast.success('Quiz created');
      nav('/console');
    } catch (err:any) {
      toast.error(err.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Create Quiz</h1>
          <p className="text-sm text-gray-500">Build professional quizzes with multiple question types. Learners take them from the Console.</p>
        </div>
        <button className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-60" onClick={saveQuiz} disabled={saving}>
          {saving ? 'Saving…' : 'Publish'}
        </button>
      </div>

      <div className="grid gap-4 mb-6">
        <input className="border rounded px-3 py-2" placeholder="Quiz title" value={title} onChange={e=>setTitle(e.target.value)} />
        <input className="border rounded px-3 py-2" placeholder="Subject (e.g., Radiotherapy Equipment)" value={subject} onChange={e=>setSubject(e.target.value)} />
        <textarea className="border rounded px-3 py-2" placeholder="Short description (optional)" value={description} onChange={e=>setDescription(e.target.value)} />
      </div>

      <QuestionPalette onAdd={addQuestion} />
      <QuestionList questions={questions} onRemove={removeQuestion} onChange={setQuestions} />
    </div>
  );
}

function QuestionPalette({ onAdd }: { onAdd: (q: BuilderQuestion)=>void }) {
  return (
    <div className="mb-5">
      <div className="text-sm font-medium mb-2">Add question</div>
      <div className="grid grid-cols-2 md:grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        <PaletteButton label="Multiple choice (single)" onClick={()=>onAdd({ id: newId(), type:'mc_single', stem:'', options:[{id:'A',text:'Option A'},{id:'B',text:'Option B'}], correctId:'A', points:1 })} />
        <PaletteButton label="Multiple choice (multiple)" onClick={()=>onAdd({ id: newId(), type:'mc_multi', stem:'', options:[{id:'A',text:'Option A'},{id:'B',text:'Option B'}], correctIds:['A'], points:1 })} />
        <PaletteButton label="True/False" onClick={()=>onAdd({ id: newId(), type:'true_false', stem:'', correct:true, points:1 })} />
        <PaletteButton label="Short text" onClick={()=>onAdd({ id: newId(), type:'short_text', stem:'', acceptedAnswers:[], points:1 })} />
        <PaletteButton label="Ordering" onClick={()=>onAdd({ id: newId(), type:'ordering', stem:'', items:[{id:'1',text:'First'},{id:'2',text:'Second'}], correctOrder:['1','2'], points:1 })} />
        <PaletteButton label="Matching" onClick={()=>onAdd({ id: newId(), type:'matching', stem:'', left:[{id:'L1',text:'Left 1'}], right:[{id:'R1',text:'Right 1'}], map:{}, points:1 })} />
      </div>
    </div>
  );
}

function PaletteButton({ label, onClick }: { label: string; onClick: ()=>void }) {
  return <button className="px-3 py-2 border rounded hover:bg-gray-50 dark:hover:bg-gray-800" onClick={onClick}>{label}</button>;
}

function QuestionList({ questions, onRemove, onChange }: { questions: BuilderQuestion[]; onRemove:(id:string)=>void; onChange:(q:BuilderQuestion[])=>void }) {
  function update(id: string, patch: Partial<BuilderQuestion>) {
    onChange(questions.map(q => q.id === id ? ({ ...q, ...patch } as BuilderQuestion) : q));
  }
  function move(id: string, dir: -1|1) {
    const i = questions.findIndex(q=>q.id===id); if (i<0) return;
    const j = i + dir; if (j<0 || j>=questions.length) return;
    const copy = [...questions]; [copy[i], copy[j]] = [copy[j], copy[i]];
    onChange(copy);
  }
  return (
    <div className="space-y-4">
      {questions.map((q, idx) => (
        <div key={q.id} className="border rounded-lg p-4 bg-white dark:bg-gray-900">
          <div className="flex justify-between items-center mb-3">
            <div className="text-sm text-gray-500">Q{idx+1} • <span className="uppercase">{q.type}</span></div>
            <div className="flex gap-2">
              <button className="px-2 py-1 border rounded" onClick={()=>move(q.id,-1)}>↑</button>
              <button className="px-2 py-1 border rounded" onClick={()=>move(q.id,1)}>↓</button>
              <button className="px-2 py-1 border rounded text-red-600" onClick={()=>onRemove(q.id)}>Delete</button>
            </div>
          </div>
          <QuestionEditor q={q} onChange={(patch)=>update(q.id, patch)} />
        </div>
      ))}
      {questions.length===0 && <div className="text-sm text-gray-500">No questions yet. Use the buttons above to add some.</div>}
    </div>
  );
}

function TextInput({ value, onChange, placeholder }: { value: string; onChange:(v:string)=>void; placeholder?:string }) {
  return <input className="w-full border rounded px-3 py-2" value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} />;
}

function NumInput({ value, onChange }: { value: number|undefined; onChange:(v:number)=>void }) {
  return <input className="w-24 border rounded px-3 py-2" type="number" min={0} step={0.5} value={value ?? 1} onChange={e=>onChange(Number(e.target.value))} />;
}

function OptEditor({ options, onChange, single=false }: { options: Array<{id:string; text:string}>; onChange:(opts:Array<{id:string; text:string}>)=>void; single?:boolean }) {
  function set(i:number, patch:Partial<{id:string;text:string}>) {
    onChange(options.map((o,idx)=> idx===i ? { ...o, ...patch } : o));
  }
  function add() { onChange([...options, { id: String.fromCharCode(65+options.length), text:'' }]); }
  function del(i:number) { onChange(options.filter((_,idx)=> idx!==i)); }
  return (
    <div className="space-y-2">
      {options.map((o, idx) => (
        <div key={idx} className="flex gap-2">
          <input className="w-28 border rounded px-2" value={o.id} onChange={e=>set(idx,{id:e.target.value})} />
          <input className="flex-1 border rounded px-2" value={o.text} onChange={e=>set(idx,{text:e.target.value})} placeholder={`Option ${idx+1}`} />
          <button className="px-2 border rounded" onClick={()=>del(idx)}>Remove</button>
        </div>
      ))}
      <button className="px-2 border rounded" onClick={add}>Add option</button>
    </div>
  );
}

function ItemsEditor({ items, onChange }: { items: Array<{id:string; text:string}>; onChange:(items:Array<{id:string;text:string}>)=>void }) {
  return <OptEditor options={items} onChange={onChange} />;
}

function PairEditor({ left, right, map, onChange }: { left:Array<{id:string;text:string}>, right:Array<{id:string;text:string}>, map:Record<string,string>, onChange:(patch:any)=>void }) {
  return (
    <div className="grid md:grid-cols-2 gap-4">
      <div><div className="text-sm mb-1">Left</div><OptEditor options={left} onChange={(v)=>onChange({ left: v })} /></div>
      <div><div className="text-sm mb-1">Right</div><OptEditor options={right} onChange={(v)=>onChange({ right: v })} /></div>
      <div className="md:col-span-2">
        <div className="text-sm mb-1">Pairs</div>
        <div className="space-y-2">
          {left.map(l => (
            <div key={l.id} className="flex gap-2 items-center">
              <div className="flex-1 border rounded px-2 py-1">{l.text}</div>
              <select className="border rounded px-2 py-1" value={map[l.id] ?? ''} onChange={e=>onChange({ map: { ...map, [l.id]: e.target.value } })}>
                <option value="">Select…</option>
                {right.map(r => <option key={r.id} value={r.id}>{r.text}</option>)}
              </select>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function QuestionEditor({ q, onChange }:{ q: BuilderQuestion; onChange:(patch: Partial<BuilderQuestion>)=>void }) {
  return (
    <div className="space-y-3">
      <div className="grid gap-2">
        <div className="text-sm">Question text</div>
        <TextInput value={q.stem} onChange={v=>onChange({ stem: v } as any)} placeholder="Enter the question text…" />
      </div>
      <div className="flex items-center gap-3">
        <div className="text-sm">Points</div>
        <NumInput value={q.points} onChange={(v)=>onChange({ points: v } as any)} />
      </div>

      {q.type === 'mc_single' && (
        <div className="space-y-2">
          <div className="text-sm font-medium">Options</div>
          <OptEditor options={q.options} onChange={(opts)=>onChange({ options: opts } as any)} />
          <div className="text-sm">Correct option id</div>
          <TextInput value={q.correctId} onChange={(v)=>onChange({ correctId: v } as any)} placeholder="e.g., A" />
        </div>
      )}

      {q.type === 'mc_multi' && (
        <div className="space-y-2">
          <div className="text-sm font-medium">Options</div>
          <OptEditor options={q.options} onChange={(opts)=>onChange({ options: opts } as any)} />
          <div className="text-sm">Correct option ids (comma-separated)</div>
          <TextInput value={q.correctIds.join(',')} onChange={(v)=>onChange({ correctIds: v.split(',').map(s=>s.trim()).filter(Boolean) } as any)} placeholder="e.g., A,B" />
        </div>
      )}

      {q.type === 'true_false' && (
        <div className="space-y-2">
          <div className="text-sm font-medium">Correct answer</div>
          <div className="flex gap-4">
            <label><input type="radio" checked={q.correct===true} onChange={()=>onChange({ correct: true } as any)} /> True</label>
            <label><input type="radio" checked={q.correct===false} onChange={()=>onChange({ correct: false } as any)} /> False</label>
          </div>
        </div>
      )}

      {q.type === 'short_text' && (
        <div className="space-y-2">
          <div className="text-sm font-medium">Accepted answers</div>
          <TextInput value={q.acceptedAnswers.join(' | ')} onChange={(v)=>onChange({ acceptedAnswers: v.split('|').map(s=>s.trim()).filter(Boolean) } as any)} placeholder="Separate with |" />
        </div>
      )}

      {q.type === 'ordering' && (
        <div className="space-y-2">
          <div className="text-sm font-medium">Items</div>
          <ItemsEditor items={q.items} onChange={(items)=>onChange({ items } as any)} />
          <div className="text-sm">Correct order (ids, comma-separated)</div>
          <TextInput value={q.correctOrder.join(',')} onChange={(v)=>onChange({ correctOrder: v.split(',').map(s=>s.trim()).filter(Boolean) } as any)} placeholder="e.g., 1,2,3" />
        </div>
      )}

      {q.type === 'matching' && (
        <PairEditor left={q.left} right={q.right} map={q.map} onChange={(patch)=>onChange(patch as any)} />
      )}
    </div>
  );
}
