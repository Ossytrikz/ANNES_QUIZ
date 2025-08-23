import React from 'react';
import { cn } from '../../lib/utils';

type Props = {
  question: { id: string; type: string; stem: string; meta: any };
};

export default function QuestionPreview({ question }: Props) {
  return (
    <div className="space-y-3">
      <div className="font-medium text-base">{question.stem}</div>
      <div>{renderPreview(question)}</div>
    </div>
  );
}

function renderPreview(q: Props['question']) {
  switch (q.type) {
    case 'mc_single':
      return (
        <ul className="space-y-2">
          {(q.meta?.options ?? []).map((o: any) => (
            <li key={o.id} className={cn('border rounded px-3 py-2', o.id===q.meta?.correct && 'border-green-500')}>{o.text}</li>
          ))}
        </ul>
      );
    case 'mc_multi':
      return (
        <ul className="space-y-2">
          {(q.meta?.options ?? []).map((o: any) => (
            <li key={o.id} className={cn('border rounded px-3 py-2', Array.isArray(q.meta?.correct) && q.meta.correct.includes(o.id) && 'border-green-500')}>{o.text}</li>
          ))}
        </ul>
      );
    case 'short_text':
      return <div className="text-sm text-gray-600">Accepted: {(q.meta?.accepted ?? []).join(', ')}</div>;
    case 'true_false':
      return <div className="text-sm">Correct: {q.meta?.correct ? 'True' : 'False'}</div>;
    case 'open':
      return <div className="text-sm text-gray-600">Manual grading. Rubric: {q.meta?.rubric}</div>;
    case 'ordering':
      return <ol className="list-decimal pl-6 space-y-1">{(q.meta?.items ?? []).map((i: any) => (<li key={i.id}>{i.text}</li>))}</ol>;
    case 'matching':
      return (
        <div className="grid grid-cols-2 gap-3">
          <ul className="space-y-1">{(q.meta?.left ?? []).map((i: any)=>(<li key={i.id} className="border rounded px-2 py-1">{i.text}</li>))}</ul>
          <ul className="space-y-1">{(q.meta?.right ?? []).map((i: any)=>(<li key={i.id} className="border rounded px-2 py-1">{i.text}</li>))}</ul>
        </div>
      );
    default:
      return <div>Unsupported</div>;
  }
}
