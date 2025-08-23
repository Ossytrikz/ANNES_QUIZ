import React from 'react';
import { toast } from 'react-hot-toast';
import { ListItem, ListEditorProps } from './types';

export const ListEditor: React.FC<ListEditorProps> = ({
  items = [],
  onChange,
  placeholder = 'Enter item'
}) => {
  const add = (): void => {
    if (items.length >= 20) {
      toast.error('Maximum number of items reached (20)');
      return;
    }
    onChange([...items, { id: Math.random().toString(36).substr(2, 9), text: '' }]);
  };

  const remove = (id: string): void => {
    if (items.length <= 1) {
      toast.error('You must have at least one item');
      return;
    }
    onChange(items.filter(item => item.id !== id));
  };

  const update = (id: string, text: string): void => {
    onChange(items.map(item => 
      item.id === id ? { ...item, text } : item
    ));
  };

  const moveUp = (index: number): void => {
    if (index === 0) return;
    const newItems = [...items];
    [newItems[index - 1], newItems[index]] = [newItems[index], newItems[index - 1]];
    onChange(newItems);
  };

  const moveDown = (index: number): void => {
    if (index === items.length - 1) return;
    const newItems = [...items];
    [newItems[index], newItems[index + 1]] = [newItems[index + 1], newItems[index]];
    onChange(newItems);
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, id: string, index: number): void => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (index === items.length - 1) {
        add();
      } else {
        const nextInput = document.getElementById(`item-${index + 1}`);
        if (nextInput) nextInput.focus();
      }
    } else if (e.key === 'Backspace' && !items[index].text) {
      e.preventDefault();
      if (items.length > 1) {
        remove(id);
        if (index > 0) {
          const prevInput = document.getElementById(`item-${index - 1}`);
          if (prevInput) prevInput.focus();
        }
      }
    } else if (e.key === 'ArrowUp' && index > 0) {
      e.preventDefault();
      const prevInput = document.getElementById(`item-${index - 1}`);
      if (prevInput) prevInput.focus();
    } else if (e.key === 'ArrowDown' && index < items.length - 1) {
      e.preventDefault();
      const nextInput = document.getElementById(`item-${index + 1}`);
      if (nextInput) nextInput.focus();
    }
  };

  return (
    <div className="space-y-2">
      {items.map((item, index) => (
        <div key={item.id} className="flex items-center space-x-2">
          <span className="text-sm text-gray-500 w-6">{index + 1}.</span>
          <input
            id={`item-${index}`}
            type="text"
            value={item.text}
            onChange={(e) => update(item.id, e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, item.id, index)}
            placeholder={placeholder}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <div className="flex space-x-1">
            <button
              type="button"
              onClick={() => moveUp(index)}
              disabled={index === 0}
              className="p-1 text-gray-500 hover:text-gray-700 disabled:opacity-30"
              aria-label="Move up"
            >
              ↑
            </button>
            <button
              type="button"
              onClick={() => moveDown(index)}
              disabled={index === items.length - 1}
              className="p-1 text-gray-500 hover:text-gray-700 disabled:opacity-30"
              aria-label="Move down"
            >
              ↓
            </button>
            <button
              type="button"
              onClick={() => remove(item.id)}
              disabled={items.length <= 1}
              className="p-1 text-red-500 hover:text-red-700 disabled:opacity-30"
              aria-label="Remove item"
            >
              ×
            </button>
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        disabled={items.length >= 20}
        className="px-3 py-1 text-sm text-blue-600 hover:text-blue-800 disabled:opacity-30"
      >
        + Add item {items.length >= 20 ? '(Max reached)' : ''}
      </button>
      {items.length >= 20 && (
        <p className="text-xs text-gray-500 mt-1">
          Maximum of 20 items allowed
        </p>
      )}
    </div>
  );
};

export default ListEditor;
