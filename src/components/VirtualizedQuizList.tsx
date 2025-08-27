import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { Quiz } from '../types/database';

/** Zero-dependency virtualized list (windowing) for large quiz lists. */
type Props = {
  items: Quiz[];
  selected: Record<string, boolean>;
  onToggle: (id: string, value?: boolean) => void;
  emptyLabel?: string;
  rowHeight?: number; // px
  overscan?: number;
  onArchive?: (id: string) => void | Promise<void>;
  onUnarchive?: (id: string) => void | Promise<void>;
  onMove?: (id: string, folder: string | null) => void | Promise<void>;
  onDelete?: (id: string) => void | Promise<void>;
};

export const VirtualizedQuizList: React.FC<Props> = ({
  items,
  selected,
  onToggle,
  emptyLabel = 'No items found.',
  rowHeight = 68,
  overscan = 6,
  onArchive,
  onUnarchive,
  onMove,
  onDelete,
}) => {
  const parentRef = useRef<HTMLDivElement | null>(null);
  const [viewportH, setViewportH] = useState<number>(420);

  // Keep scrollTop in a ref; force a render with a dummy state (keeps hook count stable)
  const scrollTopRef = useRef(0);
  const [, setTick] = useState(0);
  useEffect(() => {
    const el = parentRef.current;
    if (!el) return;
    const onScroll = () => {
      scrollTopRef.current = el.scrollTop;
      // throttle with rAF
      requestAnimationFrame(() => setTick(t => t + 1));
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    const ro = new ResizeObserver(() => {
      setViewportH(el.clientHeight || 420);
    });
    ro.observe(el);
    setViewportH(el.clientHeight || 420);
    return () => {
      el.removeEventListener('scroll', onScroll);
      ro.disconnect();
    };
  }, []);

  const total = items?.length ?? 0;
  const isEmpty = !items || total === 0;

  const startIndex = Math.max(0, Math.floor(scrollTopRef.current / rowHeight) - overscan);
  const visibleCount = Math.ceil(viewportH / rowHeight) + overscan * 2;
  const endIndex = Math.min(total, startIndex + visibleCount);

  const visible = useMemo(() => {
    if (isEmpty) return [] as Quiz[];
    return items.slice(startIndex, endIndex);
  }, [items, startIndex, endIndex, isEmpty]);

  return (
    <div ref={parentRef} className="rounded border max-h-[420px] overflow-auto">
      {isEmpty ? (
        <div className="p-3 text-sm text-gray-500">{emptyLabel}</div>
      ) : (
        <div style={{ height: total * rowHeight, position: 'relative' }}>
          {visible.map((q, i) => {
            const index = startIndex + i;
            return (
              <div
                key={q.id}
                className="absolute left-0 right-0 border-b last:border-b-0"
                style={{ transform: `translateY(${index * rowHeight}px)` }}
              >
                <div className="p-3 flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={!!selected[q.id]}
                    onChange={e => onToggle(q.id, e.target.checked)}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{q.title}</div>
                    <div className="text-xs text-gray-500 truncate">
                      {q.description || 'No description'}
                    </div>
                    {(q as any).folder && (
                      <div className="text-[10px] text-gray-400">Folder: {(q as any).folder}</div>
                    )}
                  </div>
                  {(onArchive || onUnarchive || onMove || onDelete) && (
                    <div className="shrink-0 flex items-center gap-2">
                      {onMove && (
                        <button
                          className="text-xs px-2 py-1 border rounded"
                          onClick={() => {
                            const folder = prompt('Move to folder (leave empty to clear):', (q as any).folder || '')
                            if (folder !== null) onMove(q.id, folder.trim() === '' ? null : folder)
                          }}
                        >Move</button>
                      )}
                      {onArchive && !((q as any).archived) && (
                        <button className="text-xs px-2 py-1 border rounded" onClick={() => onArchive(q.id)}>Archive</button>
                      )}
                      {onUnarchive && ((q as any).archived) && (
                        <button className="text-xs px-2 py-1 border rounded" onClick={() => onUnarchive(q.id)}>Unarchive</button>
                      )}
                      {onDelete && (
                        <button
                          className="text-xs px-2 py-1 border rounded text-red-600"
                          onClick={() => {
                            if (confirm('Delete this quiz? This cannot be undone.')) onDelete(q.id)
                          }}
                        >Delete</button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
