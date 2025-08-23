import React from 'react';
import { ListEditor } from './ListEditor';
import { BuilderQuestion } from './types';

interface MCEditorProps {
  q: BuilderQuestion;
  setQ: (q: BuilderQuestion) => void;
  multi: boolean;
}

export const MCEditor: React.FC<MCEditorProps> = ({ q, setQ, multi }) => {
  const options = Array.isArray(q.meta?.options) ? q.meta.options : [];
  const correctAnswers = Array.isArray(q.meta?.correctAnswers) ? q.meta.correctAnswers : [];

  const updateOption = (id: string, text: string): void => {
    const newOptions = options.map(opt => (opt.id === id ? { ...opt, text } : opt));
    setQ({ ...q, meta: { ...q.meta, options: newOptions } });
  };

  const addOption = (): void => {
    if (options.length >= 10) return;
    const newOption = { id: Math.random().toString(36).slice(2, 11), text: '' };
    setQ({ ...q, meta: { ...q.meta, options: [...options, newOption] } });
  };

  const removeOption = (id: string): void => {
    if (options.length <= 1) return;
    const newOptions = options.filter(opt => opt.id !== id);
    const newCorrectAnswers = correctAnswers.filter(cid => cid !== id);
    setQ({ ...q, meta: { ...q.meta, options: newOptions, correctAnswers: newCorrectAnswers } });
  };

  const toggleCorrect = (id: string): void => {
    if (multi) {
      const exists = correctAnswers.includes(id);
      const next = exists ? correctAnswers.filter(x => x !== id) : [...correctAnswers, id];
      setQ({ ...q, meta: { ...q.meta, correctAnswers: next } });
    } else {
      setQ({ ...q, meta: { ...q.meta, correctAnswers: [id] } });
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {options.map((option, index) => (
          <div key={option.id} className="flex items-center space-x-2">
            <input
              type={multi ? 'checkbox' : 'radio'}
              checked={multi ? correctAnswers.includes(option.id) : correctAnswers[0] === option.id}
              onChange={() => toggleCorrect(option.id)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <input
              type="text"
              value={option.text}
              onChange={(e) => updateOption(option.id, e.target.value)}
              placeholder={`Option ${index + 1}`}
              className="flex-1 px-3 py-2 border border-gray-300 rounded outline-none bg-white text-gray-900 placeholder-gray-500 dark:bg-gray-900 dark:text-gray-100 dark:border-gray-600 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              type="button"
              onClick={() => removeOption(option.id)}
              disabled={options.length <= 1}
              className="p-1 text-red-500 hover:text-red-700 disabled:opacity-30"
              aria-label="Remove option"
            >
              ×
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={addOption}
          disabled={options.length >= 10}
          className="px-3 py-1 text-sm text-blue-600 hover:text-blue-800 disabled:opacity-30"
        >
          + Add option {options.length >= 10 ? '(Max reached)' : ''}
        </button>
      </div>

      <div className="mt-4">
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={!!q.meta?.shuffleOptions}
            onChange={(e) => setQ({ ...q, meta: { ...q.meta, shuffleOptions: e.target.checked } })}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <span className="text-sm text-gray-700">Shuffle options</span>
        </label>
      </div>
    </div>
  );
};

export default MCEditor;
