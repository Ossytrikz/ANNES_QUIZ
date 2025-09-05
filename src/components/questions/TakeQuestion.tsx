import React, { useCallback, useMemo } from 'react';

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

function normalizeOptions(meta: any): any[] {
  if (!meta) return [];
  if (Array.isArray(meta.options)) return meta.options;
  // Support object map in meta.options: { A: 'x', B: 'y' }
  if (meta.options && typeof meta.options === 'object' && !Array.isArray(meta.options)) {
    const entries = Object.entries(meta.options as Record<string, any>);
    if (entries.length) return entries.map(([k, v]) => ({ id: String(k), text: String(v) }));
  }
  if (Array.isArray(meta.choices)) return meta.choices;
  if (Array.isArray(meta.items)) return meta.items; // fallback
  // Broad legacy scan: find any plausible options array in meta
  try {
    const bannedKeys = new Set(['items', 'left', 'right', 'correct', 'correctIds', 'correctOrder', 'order', 'answer', 'answers']);
    for (const k of Object.keys(meta)) {
      if (bannedKeys.has(k)) continue;
      const v = (meta as any)[k];
      // Array case
      if (Array.isArray(v) && v.length > 0) {
        const first = v[0];
        const isPrimitive = typeof first === 'string' || typeof first === 'number' || typeof first === 'boolean';
        const isChoiceLike = first && typeof first === 'object' && (
          'text' in first || 'label' in first || 'name' in first || 'value' in first || 'id' in first
        );
        if (isPrimitive || isChoiceLike) return v;
      }
      // Object map case
      if (v && typeof v === 'object') {
        const entries = Object.entries(v as Record<string, any>);
        if (entries.length) {
          const [, firstV] = entries[0];
          const isPrimitive = typeof firstV === 'string' || typeof firstV === 'number' || typeof firstV === 'boolean';
          const isChoiceLike = firstV && typeof firstV === 'object' && (
            'text' in firstV || 'label' in firstV || 'name' in firstV || 'value' in firstV || 'id' in firstV
          );
          if (isPrimitive || isChoiceLike) return entries.map(([k2, v2]) => ({ id: String(k2), text: String(v2) }));
        }
      }
    }
  } catch {}
  return [];
}

// Normalize any incoming option shape into { id: string, text: string }
function toChoiceObjects(meta: any): Array<{ id: string; text: string }> {
  const raw = normalizeOptions(meta);
  return raw
    .map((opt: any, idx: number) => {
      if (opt == null) return null;
      // If it's a primitive (string/number), use it for both id and text
      if (typeof opt === 'string' || typeof opt === 'number' || typeof opt === 'boolean') {
        return { id: String(opt), text: String(opt) };
      }
      // If it's an object, try common fields
      const idCandidate = opt.id ?? opt.value ?? opt.key ?? idx;
      const textCandidate = opt.text ?? opt.label ?? opt.name ?? opt.value ?? opt.id ?? String(idCandidate);
      return { id: String(idCandidate), text: String(textCandidate) };
    })
    .filter(Boolean) as Array<{ id: string; text: string }>;
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
}) {
  const name = `mc-${qid}`;
  const options = useMemo(() => {
    const base = toChoiceObjects(meta);
    const shouldShuffle = meta?.shuffleOptions !== false; // default: shuffle unless explicitly disabled
    if (!shouldShuffle) return base;
    const shuffled = shuffleOnce(base, qid);
    // If shuffle produced same order (rare but possible with small sets), rotate by 1
    const same = shuffled.length === base.length && shuffled.every((x, i) => x.id === base[i].id);
    return same && shuffled.length > 1 ? [...shuffled.slice(1), shuffled[0]] : shuffled;
  }, [meta, meta?.shuffleOptions, qid]);

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
            {opt.text}
          </label>
        );
      })}
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
    const base = toChoiceObjects(meta);
    const shouldShuffle = meta?.shuffleOptions !== false; // default: shuffle unless explicitly disabled
    if (!shouldShuffle) return base;
    const shuffled = shuffleOnce(base, qid);
    const same = shuffled.length === base.length && shuffled.every((x, i) => x.id === base[i].id);
    return same && shuffled.length > 1 ? [...shuffled.slice(1), shuffled[0]] : shuffled;
  }, [meta, meta?.shuffleOptions, qid]);

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
          {opt.text}
        </label>
      ))}
    </div>
  );
});

const Ordering = React.memo(function Ordering({
  qid,
  meta,
  items,
  value,
  onChange,
}: {
  qid: string;
  meta: any;
  items: Array<{ id: string; text: string }>;
  value: string[] | undefined;
  onChange: (order: string[]) => void;
}) {
  const initialIds = useMemo(() => items.map((i) => i.id), [items]);
  const shouldShuffle = useMemo(() => {
    // Respect explicit flags; default to true when undefined
    let flag = meta?.shuffleItems;
    if (flag === undefined) flag = meta?.shuffleOptions;
    if (flag === undefined) flag = meta?.shuffle;
    return flag !== false;
  }, [meta?.shuffleItems, meta?.shuffleOptions, meta?.shuffle]);
  const initial = useMemo(() => (shouldShuffle ? shuffleOnce(initialIds, qid) : initialIds), [initialIds, qid, shouldShuffle]);
  const order = Array.isArray(value) && value.length === items.length ? value : initial;

  const move = useCallback(
    (id: string, dir: -1 | 1) => () => {
      const idx = order.indexOf(id);
      const j = idx + dir;
      if (idx === -1 || j < 0 || j >= order.length) return;
      const arr = [...order];
      [arr[idx], arr[j]] = [arr[j], arr[idx]];
      onChange(arr);
    },
    [onChange, order]
  );

  return (
    <ul className="space-y-2">
      {order.map((id) => {
        const item = items.find((i) => i.id === id);
        return (
          <li key={id} className="border rounded px-3 py-2 flex items-center justify-between">
            <span>{item?.text ?? id}</span>
            <div className="flex gap-2">
              <button type="button" className="px-2 py-1 border rounded" onClick={move(id, -1)} aria-label="Move up">
                ↑
              </button>
              <button type="button" className="px-2 py-1 border rounded" onClick={move(id, 1)} aria-label="Move down">
                ↓
              </button>
            </div>
          </li>
        );
      })}
    </ul>
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
          meta={question.meta}
          items={items}
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
