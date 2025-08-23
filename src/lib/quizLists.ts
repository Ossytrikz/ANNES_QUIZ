import { supabase } from './supabase';
import type { Quiz } from '../types/database';

/** Keep the same fields everywhere to avoid schema drift */
export const QUIZ_FIELDS = 'id,title,description,owner_id,created_at,visibility';

/** Server-side search helper */
function applySearch(q: any, term: string) {
  const needle = (term || '').trim();
  if (needle) {
    return q.or(`title.ilike.%${needle}%,description.ilike.%${needle}%`);
  }
  return q;
}

/** Public & Unlisted quizzes (Dashboard + Console) */
export async function listPublicQuizzes(term: string): Promise<Quiz[]> {
  // Primary: visibility in ('public','unlisted') ordered by created_at (matches Dashboard)
  try {
    const { data, error } = await applySearch(
      supabase.from('quizzes').select(QUIZ_FIELDS).in('visibility', ['public','unlisted']),
      term
    )
      .order('created_at', { ascending: false })
      .limit(200);
    if (!error && Array.isArray(data)) return data as any[];
  } catch {}
  // Fallback: is_public = true (some schemas use a boolean instead)
  try {
    const { data, error } = await applySearch(
      supabase.from('quizzes').select(QUIZ_FIELDS).eq('is_public', true),
      term
    )
      .order('created_at', { ascending: false })
      .limit(200);
    if (!error && Array.isArray(data)) return data as any[];
  } catch {}
  // Last resort: no visibility filter
  const { data } = await applySearch(
    supabase.from('quizzes').select(QUIZ_FIELDS),
    term
  )
    .order('created_at', { ascending: false })
    .limit(200);
  return (data as any[]) || [];
}

/** Owned quizzes (try common owner column names) */
export async function listOwnedQuizzes(userId: string | null): Promise<Quiz[]> {
  if (!userId) return [];
  const cols = ['owner_id','user_id','created_by'];
  for (const col of cols) {
    try {
      const { data, error } = await supabase
        .from('quizzes')
        .select(QUIZ_FIELDS)
        .eq(col, userId)
        .order('created_at', { ascending: false })
        .limit(100);
      if (!error) return (data as any[]) || [];
    } catch {}
  }
  return [];
}

/** Collaboration quizzes (env opt-in) */
export async function listCollabQuizzes(userId: string | null): Promise<Quiz[]> {
  if (!userId) return [];
  const env = (import.meta as any).env as Record<string, string>;
  const tables = env?.VITE_COLLAB_TABLES ? env.VITE_COLLAB_TABLES.split(',').map(s=>s.trim()).filter(Boolean) : [];
  if (!tables.length) return [];
  for (const tbl of tables) {
    try {
      const { data: links, error } = await supabase
        .from(tbl)
        .select('quiz_id')
        .eq('user_id', userId)
        .limit(300);
      if (!error && Array.isArray(links) && links.length > 0) {
        const ids = links.map((r: any) => r.quiz_id).filter(Boolean);
        if (ids.length) {
          const { data: qs } = await supabase
            .from('quizzes')
            .select(QUIZ_FIELDS)
            .in('id', ids)
            .order('created_at', { ascending: false })
            .limit(100);
          return (qs as any[]) || [];
        }
      }
    } catch {}
  }
  return [];
}
