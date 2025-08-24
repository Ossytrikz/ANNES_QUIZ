import React, { useCallback, useMemo, useState, useEffect } from 'react';
import grading from '../../lib/grading';
import { getQuizSettings } from '../../lib/settings';

// === Helpers to extract correct answers for feedback (lightweight mirror of grader logic)
function getOptions(meta: any): any[] {
  if (!meta) return [];
  if (Array.isArray(meta.options)) return meta.options;
  if (Array.isArray(meta.items)) return meta.items;
  if (Array.isArray(meta.choices)) return meta.choices;
  return [];
}
function idOf(o: any): string {
  if (o == null) return "";
  const t = typeof o;
  if (t === "string" || t === "number" || t === "boolean") return String(o);
  return String(o?.id ?? o?.value ?? o?.key ?? o?.text ?? "");
}
function deriveCorrectId(meta: any): string | null {
  const opts = getOptions(meta);
  if (meta?.correctId) return String(meta.correctId);
  if (meta?.correctid) return String(meta.correctid);
  if (typeof meta?.correct === "number") {
    const idx = meta.correct;
    if (idx >= 0 && idx < opts.length) return idOf(opts[idx]);
  }
  const flagged = opts.find((o:any)=> !!o?.correct || !!o?.isCorrect);
  if (flagged) return idOf(flagged);
  if (Array.isArray(meta?.correctAnswers) && meta.correctAnswers.length) return String(meta.correctAnswers[0]);
  return null;
}
function deriveCorrectIdsOrdering(meta: any): string[] {
  const items = Array.isArray(meta?.items) ? meta.items : [];
  if (Array.isArray(meta?.correctIds) && meta.correctIds.length) return meta.correctIds.map(String);
  const raw = Array.isArray(meta?.correct) ? meta.correct : [];
  if (raw.length && raw.every((x:any)=>Number.isInteger(Number(x))) && items.length) {
    return raw.map((n:any)=> idOf(items[Number(n)])).filter(Boolean);
  }
  return raw.map(String);
}
export type TakeQuestionProps = {
  question: { id: string; type: string; stem: string; meta: any };
  value: any;
  onChange: (val: any) => void;
};

const TrueFalse = React.memo(function TrueFalse({
  qid,
  value,
  onChange,
}: {
  qid: string;
  value: boolean | undefined;
  onChange: (v: boolean) => void;
}) {
  const setTrue = useCallback(() => onChange(true), [onChange]);
  const setFalse = useCallback(() => onChange(false), [onChange]);

  const name = `tf-${qid}`;
  const idT = `${name}-true`;
  const idF = `${name}-false`;

  return (
    <div className="flex gap-6">
      <label htmlFor={idT} className="inline-flex items-center gap-2 cursor-pointer">
        <input id={idT} type="radio" name={name} checked={value === true} onChange={setTrue} />
        True
      </label>
      <label htmlFor={idF} className="inline-flex items-center gap-2 cursor-pointer">
        <input id={idF} type="radio" name={name} checked={value === false} onChange={setFalse} />
        False
      </label>
    </div>
  );
});

const ShortText = React.memo(function ShortText({
  value,
  onChange,
}: {
  value: string | undefined;
  onChange: (v: string) => void;
}) {
  const onInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value), [onChange]);
  return <input className="border rounded px-3 py-2 w-full" value={value ?? ''} onChange={onInput} />;
});

const OpenText = React.memo(function OpenText({
  value,
  onChange,
}: {
  value: string | undefined;
  onChange: (v: string) => void;
}) {
  const onInput = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => onChange(e.target.value), [onChange]);
  return <textarea className="border rounded px-3 py-2 w-full" rows={6} value={value ?? ''} onChange={onInput} />;
});

function shuffleOnce<T>(arr: T[], seedKey: string): T[] {
  // deterministic-ish shuffle using seed from question id (avoid reshuffling each render)
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

const MCSingle = React.memo(function MCSingle({
  qid,
  meta,
  value,
  onChange,
}: {
  qid: string;
  meta: any;
  value: string | undefined; // option id
  onChange: (choiceId: string) => void;
}) {const { immediateFeedback } = getQuizSettings();
const [feedback, setFeedback] = useState<{show:boolean; isCorrect:boolean; correctText?:string}|null>(null);
useEffect(()=>{ setFeedback(null); }, [qid]);

const correctId = deriveCorrectId(meta);
const correctText = (()=>{
  const opts = getOptions(meta);
  const o = opts.find((x:any)=> idOf(x) === String(correctId));
  return o?.text ?? o?.label ?? o?.name ?? o?.title ?? String(correctId ?? "");
})();

  const name = `mc-${qid}`;
  const options = useMemo(() => {
    const opts = Array.isArray(meta?.options) ? meta.options : [];
    return meta?.shuffleOptions ? shuffleOnce(opts, qid) : opts;
  }, [meta?.options, meta?.shuffleOptions, qid]);

  const pick = useCallback((id: string) => () => onChange(id), [onChange]);

  return (
    <div className="space-y-2">
      {options.map((opt: any) => {
        const id = `${name}-${opt.id}`;
        return (
          <label key={opt.id} htmlFor={id} className="block cursor-pointer">
            <input
              id={id}
              type="radio"
              name={name}
              checked={value === opt.id}
              onChange={pick(opt.id)}
              className="mr-2"
            />
            {String(opt?.text ?? opt)}
          </label>
        );
      })}
    {feedback?.show && (
  <div className={feedback.isCorrect ? "text-green-600 mt-2" : "text-red-600 mt-2"}>
    {feedback.isCorrect ? "Correct ✅" : "Incorrect ❌"} — Correct answer: <strong>{correctText}</strong>
  </div>
)}
</div>
  );
});

const MCMulti = React.memo(function MCMulti({
  qid,
  meta,
  value,
  onChange,
}: {
  qid: string;
  meta: any;
  value: string[] | undefined; // option ids
  onChange: (choices: string[]) => void;
}) {
  const options = useMemo(() => {
    const opts = Array.isArray(meta?.options) ? meta.options : [];
    return meta?.shuffleOptions ? shuffleOnce(opts, qid) : opts;
  }, [meta?.options, meta?.shuffleOptions, qid]);

  const setArr = Array.isArray(value) ? value : [];
  const toggle = useCallback(
    (id: string) => () => {
      if (setArr.includes(id)) onChange(setArr.filter((x) => x !== id));
      else onChange([...setArr, id]);
    },
    [onChange, setArr]
  );

  return (
    <div className="space-y-2">
      {options.map((opt: any) => (
        <label key={opt.id} className="block cursor-pointer">
          <input type="checkbox" checked={setArr.includes(opt.id)} onChange={toggle(opt.id)} className="mr-2" />
          {String(opt?.text ?? opt)}
        </label>
      ))}
    </div>
  );
});

const Ordering = React.memo(function Ordering({
  qid,
  items,
  meta,
  value,
  onChange,
}: {
  qid: string;
  items: Array<{ id: string; text: string }>;
  meta: any;
  value: string[] | undefined;
  onChange: (order: string[]) => void;
}) {const { immediateFeedback } = getQuizSettings();
const [feedback, setFeedback] = useState<{show:boolean; isCorrect:boolean}|null>(null);
useEffect(()=>{ setFeedback(null); }, [items]);
const correctIds = deriveCorrectIdsOrdering({ items }); // we only know items here; meta used at call site

  const initial = useMemo(() => items.map((i) => i.id), [items]);
  const order = Array.isArray(value) && value.length === items.length ? value : initial;

  const move = useCallback(
    (id: string, dir: -1 | 1) => () => {
      const idx = order.indexOf(id);
      const j = idx + dir;
      if (idx === -1 || j < 0 || j >= order.length) return;
      const arr = [...order];
      [arr[idx], arr[j]] = [arr[j], arr[idx]];
      onChange(arr);
      if (immediateFeedback) {
        const res = grading.grade({ id: qid, type: 'ordering', meta }, { order: arr });
        setFeedback({ show: true, isCorrect: !!res.isCorrect });
      }
    },
    [onChange, order, immediateFeedback, meta]
  );

  return (
    <div className="space-y-2">
      <ul className="space-y-2">
      {order.map((id) => {
        const item = items.find((i) => i.id === id);
        return (
          <li key={id} className="border rounded px-3 py-2 flex items-center justify-between gap-3 text-sm sm:text-base">
            <span>{item?.text ?? id}</span>
            <div className="flex gap-2">
              <button type="button" className="px-2 py-1 border rounded text-xs sm:text-sm" onClick={move(id, -1)} aria-label="Move up">
                ↑
              </button>
              <button type="button" className="px-2 py-1 border rounded text-xs sm:text-sm" onClick={move(id, 1)} aria-label="Move down">
                ↓
              </button>
            </div>
          </li>
        );
      })}
    </ul>
      {feedback?.show && (
        <div className={feedback.isCorrect ? "text-green-600" : "text-red-600"}>
          {feedback.isCorrect ? "Correct ✅" : "Incorrect ❌"} — Correct order shown above.
        </div>
      )}
    </div>
  );
});

const Matching = React.memo(function Matching({
  left,
  right,
  value,
  onChange,
}: {
  left: Array<{ id: string; text: string }>;
  right: Array<{ id: string; text: string }>;
  value: Record<string, string> | undefined;
  onChange: (map: Record<string, string>) => void;
}) {
  const map = value ?? {};
  const set = useCallback((l: string, r: string) => onChange({ ...map, [l]: r }), [map, onChange]);

  return (
    <div className="space-y-3">
      {left.map((l) => (
        <div key={l.id} className="flex items-center gap-2">
          <div className="flex-1 border rounded px-2 py-1">{l.text}</div>
          <select
            value={map[l.id] ?? ''}
            onChange={(e) => set(l.id, e.target.value)}
            className="border rounded px-2 py-1"
            aria-label={`Match for ${l.text}`}
          >
            <option value="">Select…</option>
            {right.map((r) => (
              <option key={r.id} value={r.id}>
                {r.text}
              </option>
            ))}
          </select>
        </div>
      ))}
    </div>
  );
});

export default function TakeQuestion({ question, value, onChange }: TakeQuestionProps) {
  switch (question.type) {
    case 'true_false':
      return <TrueFalse qid={question.id} value={value as boolean | undefined} onChange={(v) => onChange(v)} />;

    case 'short_text':
      return <ShortText value={(value?.text as string) ?? ''} onChange={(v) => onChange({ text: v })} />;

    case 'open':
      return <OpenText value={(value?.text as string) ?? ''} onChange={(v) => onChange({ text: v })} />;

    case 'mc_single': {
      return (
        <MCSingle
          qid={question.id}
          meta={question.meta}
          value={value?.choice as string | undefined}
          onChange={(choiceId) => onChange({ choice: choiceId })}
        />
      );
    }

    case 'mc_multi': {
      return (
        <MCMulti
          qid={question.id}
          meta={question.meta}
          value={Array.isArray(value?.choices) ? (value.choices as string[]) : []}
          onChange={(choices) => onChange({ choices })}
        />
      );
    }

    case 'ordering': {
      const items = Array.isArray(question.meta?.items) ? question.meta.items : [];
      return (
        <Ordering
          qid={question.id}
          items={items}
          meta={question.meta}
          value={Array.isArray(value?.order) ? (value.order as string[]) : undefined}
          onChange={(order) => onChange({ order })}
        />
      );
    }

    case 'matching': {
      const left = Array.isArray(question.meta?.left) ? question.meta.left : [];
      const right = Array.isArray(question.meta?.right) ? question.meta.right : [];
      return (
        <Matching
          left={left}
          right={right}
          value={(value?.map as Record<string, string>) ?? undefined}
          onChange={(map) => onChange({ map })}
        />
      );
    }

    default:
      return <div>Unsupported question type: {String(question.type)}</div>;
  }
}
