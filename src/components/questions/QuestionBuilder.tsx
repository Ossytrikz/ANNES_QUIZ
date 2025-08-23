import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import type { QuestionType, BuilderQuestion } from '../../types/question';
import { getDefaultMeta, mapToBackendType, mapToFrontendType } from './utils';
import MCEditor from './MCEditor';
import ListEditor from './ListEditor';

type Props = {
  quizId: string;
  onDirtyChange?: (dirty: boolean) => void; // optional, safe
};

const TYPE_CARDS: Array<{ type: QuestionType; title: string; desc: string; }> = [
  { type: 'multiple_choice_single',   title: 'Multiple Choice',  desc: 'One correct answer' },
  { type: 'multiple_choice_multiple', title: 'Multiple Answer',  desc: 'Select all that apply' },
  { type: 'true_false',               title: 'True / False',     desc: 'Binary true/false question' },
  { type: 'short_answer',             title: 'Short Answer',     desc: 'Text answer with matching' },
  { type: 'ordering',                 title: 'Ordering',         desc: 'Arrange items in order' },
  { type: 'matching',                 title: 'Matching',         desc: 'Match pairs from two lists' },
];
const TYPE_LABELS: Record<QuestionType, string> = {
  multiple_choice_single: 'Multiple Choice',
  multiple_choice_multiple: 'Multiple Answer',
  true_false: 'True/False',
  short_answer: 'Short Answer',
  ordering: 'Ordering',
  matching: 'Matching'
};


export default function QuestionBuilder({ quizId, onDirtyChange }: Props) {
  const [questions, setQuestions] = useState<BuilderQuestion[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Modal flow
  const [modalOpen, setModalOpen] = useState(false);
  const [step, setStep] = useState<'pick'|'edit'>('pick');
  const [draft, setDraft] = useState<BuilderQuestion | null>(null);

  // load existing
  useEffect(() => {
    let on = true;
    (async () => {
      try {
        const { data, error } = await supabase
          .from('questions')
          .select('*')
          .eq('quiz_id', quizId)
          .order('order_index', { ascending: true });
        if (error) throw error;
        if (!on) return;
        const rows: any[] = (data as any) || [];
        const mapped = rows.map(r => ({ ...r, type: mapToFrontendType(r.type) }));
        setQuestions(mapped);
      } catch (e) {
        console.error(e);
        toast.error('Failed to load questions');
      } finally {
        on && setLoading(false);
      }
    })();
    return () => { on = false; };
  }, [quizId]);

  // dirty signal (optional)
  const dirty = useMemo(() => false, []); // we save per-question add; main list isn't "dirty"
  useEffect(() => { onDirtyChange?.(dirty); }, [dirty, onDirtyChange]);

  // open modal
  const openAddModal = () => {
    setStep('pick');
    setDraft(null);
    setModalOpen(true);
  };

  // choose type -> create draft
  const chooseType = (type: QuestionType) => {
    const now = new Date().toISOString();
    const q: BuilderQuestion = {
      id: uuidv4(),
      quiz_id: quizId,
      type,
      stem: '',
      meta: getDefaultMeta(type),
      explanation: null,
      points: 1,
      order_index: questions.length,
      created_at: now,
      updated_at: now,
    };
    setDraft(q);
    setStep('edit');
  };

  // save draft to DB and list
  const addDraftToQuiz = async () => {
    if (!draft) return;
    if (!draft.stem.trim()) {
      toast.error('Please enter the question text');
      return;
    }
    setSaving(true);
    try {
      const row = {
        ...draft,
        type: mapToBackendType(draft.type),
        updated_at: new Date().toISOString(),
      };
      const { data, error } = await supabase.from('questions').upsert([row], { onConflict: 'id' }).select().single();
      if (error) throw error;
      // Optimistically add/replace
      setQuestions((prev) => {
        const exists = prev.some((q) => q.id === draft.id);
        const next = exists ? prev.map((q)=> q.id===draft.id ? draft : q) : [...prev, draft];
        return next.sort((a,b)=>(a.order_index ?? 0) - (b.order_index ?? 0));
      });
      setModalOpen(false);
      setDraft(null);
      toast.success('Question added');
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || 'Failed to add question');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (q: BuilderQuestion) => {
    if (!q?.id) return;
    if (!confirm('Delete this question?')) return;
    try {
      const { error } = await supabase.from('questions').delete().eq('id', q.id);
      if (error) throw error;
      setQuestions((prev) => prev.filter((x) => x.id !== q.id).map((x,i)=>({ ...x, order_index: i })));
      toast.success('Deleted');
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || 'Failed to delete');
    }
  };

  const updateQuestion = (id: string, updates: Partial<BuilderQuestion>) => {
    setQuestions((prev) =>
      prev.map((q) =>
        q.id === id ? { ...q, ...updates, meta: { ...q.meta, ...(updates.meta || {}) } } : q
      )
    );
  };

  if (loading) return <div>Loading questions...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-gray-900 dark:text-pink-200">Questions</h3>
        <button
          onClick={openAddModal}
          className="px-3 py-2 rounded-lg bg-pink-600 hover:bg-pink-700 text-white text-sm"
        >
          Add Question
        </button>
      </div>

      {questions.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 dark:border-pink-400/30 p-6 text-center">
          <div className="text-gray-900 dark:text-pink-200 font-medium mb-1">No questions yet</div>
          <div className="text-sm text-gray-600 dark:text-pink-300/80">Click “Add Question” to get started.</div>
        </div>
      ) : (
        <div className="space-y-3">
          {questions.map((q, idx) => (
            <QuestionRow
              key={q.id}
              q={q}
              index={idx}
              isEditing={editingId === q.id}
              onEdit={() => setEditingId(editingId === q.id ? null : q.id)}
              onDelete={() => remove(q)}
              onChange={(updated) => updateQuestion(q.id, updated)}
            />
          ))}
        </div>
      )}

      {modalOpen && (
        <AddModal
          step={step}
          draft={draft}
          onClose={() => { setModalOpen(false); }}
          onPick={chooseType}
          onDraftChange={setDraft}
          onConfirm={addDraftToQuiz}
          saving={saving}
        />
      )}
    </div>
  );
}

/* ----------------------------- UI pieces ------------------------------ */

function QuestionRow({
  q, index, isEditing, onEdit, onDelete, onChange,
}: {
  q: BuilderQuestion;
  index: number;
  isEditing: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onChange: (u: BuilderQuestion) => void;
}) {
  return (
    <div className={`border rounded-lg overflow-hidden ${isEditing ? 'ring-2 ring-pink-500/70' : ''}`}>
      <div className="p-3 bg-gray-50 dark:bg-gray-800/60 border-b border-gray-200 dark:border-pink-400/20 flex items-center justify-between">
        <div className="text-sm text-gray-700 dark:text-pink-200">
          <span className="font-medium">Question {index + 1}: <span className="ml-2 inline-flex items-center rounded-full border px-2 py-0.5 text-xs text-pink-300 border-pink-400/40 bg-pink-400/10">{TYPE_LABELS[q.type] || q.type}</span></span> <span className="opacity-90">{q.stem || <em className="text-gray-500">Untitled</em>}</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onEdit} className="text-sm px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-pink-700 dark:text-pink-300">
            {isEditing ? 'Close' : 'Edit'}
          </button>
          <button onClick={onDelete} className="text-sm px-2 py-1 rounded hover:bg-red-50 dark:hover:bg-red-900/30 text-red-600 dark:text-red-300">
            Delete
          </button>
        </div>
      </div>

      {isEditing && (
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm mb-1">Question</label>
            <input
              value={q.stem}
              onChange={(e) => onChange({ ...q, stem: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded outline-none bg-white text-gray-900 placeholder-gray-500 dark:bg-gray-900 dark:text-gray-100 dark:border-gray-600 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter your question"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm mb-1">Points</label>
              <input
                type="number"
                min={1}
                value={q.points}
                onChange={(e) => onChange({ ...q, points: Number(e.target.value) })}
                className="w-24"
              />
            </div>
          </div>
          <TypeSpecificEditor q={q} setQ={(updated) => onChange(updated)} />
        </div>
      )}
    </div>
  );
}

function AddModal({
  step, draft, onClose, onPick, onDraftChange, onConfirm, saving,
}: {
  step: 'pick'|'edit';
  draft: BuilderQuestion | null;
  onClose: () => void;
  onPick: (t: QuestionType) => void;
  onDraftChange: (q: BuilderQuestion) => void;
  onConfirm: () => void;
  saving: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-2xl rounded-xl border border-gray-200 dark:border-pink-400/30 bg-white dark:bg-gray-800 shadow-lg">
        <div className="p-4 border-b border-gray-200 dark:border-pink-400/20 flex items-center justify-between">
          <div className="font-semibold text-gray-900 dark:text-pink-200">
            {step === 'pick' ? 'Add a question' : 'Configure question'}
          </div>
          <button onClick={onClose} className="px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700">✕</button>
        </div>

        <div className="p-4">
          {step === 'pick' && (
            <div className="grid sm:grid-cols-2 gap-3">
              {TYPE_CARDS.map((c) => (
                <button
                  key={c.type}
                  onClick={() => onPick(c.type)}
                  className="text-left p-4 rounded-lg border border-gray-200 dark:border-pink-400/30 hover:border-pink-400/60 hover:bg-pink-50/40 dark:hover:bg-pink-900/20 transition"
                >
                  <div className="font-medium text-gray-900 dark:text-pink-200">{c.title}</div>
                  <div className="text-sm text-gray-600 dark:text-pink-300/80">{c.desc}</div>
                </button>
              ))}
            </div>
          )}

          {step === 'edit' && draft && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm mb-1">Question</label>
                <input
                  value={draft.stem}
                  onChange={(e) => onDraftChange({ ...draft, stem: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded outline-none bg-white text-gray-900 placeholder-gray-500 dark:bg-gray-900 dark:text-gray-100 dark:border-gray-600 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter your question"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm mb-1">Points</label>
                  <input
                    type="number"
                    min={1}
                    value={draft.points}
                    onChange={(e) => onDraftChange({ ...draft, points: Number(e.target.value) })}
                    className="w-24"
                  />
                </div>
              </div>
              <TypeSpecificEditor q={draft} setQ={onDraftChange} />

              <div className="pt-2 flex items-center justify-end gap-2">
                <button onClick={onClose} className="px-3 py-2 rounded border">Cancel</button>
                <button onClick={onConfirm} disabled={saving} className="px-4 py-2 rounded bg-pink-600 hover:bg-pink-700 text-white disabled:opacity-50">
                  {saving ? 'Saving…' : 'Add to quiz'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ----------------------- Type-specific editors ------------------------ */

function TypeSpecificEditor({ q, setQ }: { q: BuilderQuestion; setQ: (q: BuilderQuestion) => void }) {
  switch (q.type) {
    case 'multiple_choice_single':
    case 'multiple_choice_multiple':
      return <MCEditor q={q} setQ={setQ} multi={q.type === 'multiple_choice_multiple'} />;

    case 'ordering':
    case 'matching':
      return (
        <div className="space-y-4">
          <ListEditor
            items={q.meta.items || []}
            onChange={(items: any[]) => setQ({ ...q, meta: { ...q.meta, items } })}
            placeholder="Enter item"
          />
        </div>
      );

    case 'short_answer':
      return (
        <div className="space-y-4">
          <div>
            <label className="block text-sm mb-1">Accepted answers (one per line)</label>
            <textarea
              value={(q.meta.acceptedAnswers || []).join('\n')}
              onChange={(e) =>
                setQ({
                  ...q,
                  meta: {
                    ...q.meta,
                    acceptedAnswers: e.target.value.split('\n').map((s) => s.trim()).filter(Boolean),
                  },
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded outline-none bg-white text-gray-900 placeholder-gray-500 dark:bg-gray-900 dark:text-gray-100 dark:border-gray-600 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={4}
              placeholder="Answer A\nAnswer B"
            />
          </div>
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={!!q.meta.caseSensitive}
              onChange={(e) => setQ({ ...q, meta: { ...q.meta, caseSensitive: e.target.checked } })}
            />
            Case sensitive
          </label>
        </div>
      );

    case 'true_false':
      return (
        <div className="space-y-2">
          <label className="inline-flex items-center gap-2">
            <input
              type="radio"
              name={`tf-${q.id}`}
              checked={q.meta.correct === true}
              onChange={() => setQ({ ...q, meta: { ...q.meta, correct: true } })}
            />
            True
          </label>
          <label className="inline-flex items-center gap-2">
            <input
              type="radio"
              name={`tf-${q.id}`}
              checked={q.meta.correct === false}
              onChange={() => setQ({ ...q, meta: { ...q.meta, correct: false } })}
            />
            False
          </label>
        </div>
      );

    default:
      return null;
  }
}
