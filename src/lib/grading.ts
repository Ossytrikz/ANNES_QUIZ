import { levenshtein } from './levenshtein';

/** Normalize answers for reliable comparison:
 * trim → lowercase → collapse spaces → strip accents
 */
export function normalizeAnswer(ans: string): string {
  if (ans == null) return '';
  return String(ans)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');
}

export type QuestionType = 'mc_single'|'mc_multi'|'short_text'|'true_false'|'open'|'ordering'|'matching';

export type QuestionRecord = {
  id: string;
  type: QuestionType;
  stem: string;
  meta: any;
  points?: number | string | null;
};

export type GradeDetail = {
  
  id: string;
  isCorrect: boolean;
  score: number;
  possible: number;
  type: QuestionType;
};


function hasValue(v: any): boolean {
  if (v === null || v === undefined) return false;
  if (typeof v === 'string') return v.trim().length > 0;
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === 'object') return Object.keys(v).length > 0;
  return true;
}

function pick<T=any>(obj: any, keys: string[], fallback?: any): T {
  for (const k of keys) {
    if (obj && k in obj && obj[k] != null) return obj[k] as T;
  }
  return fallback as T;
}

function getMCResponseId(resp: any): string {
  const v = pick(resp ?? {}, ['choice','id','value','answer','selected'], resp);
  return String(v ?? '');
}

function getMCMultiIds(resp: any): string[] {
  if (Array.isArray(resp)) return resp.map(String);
  const arr = pick<any[]>(resp ?? {}, ['choices','values','ids','selected'], []);
  return Array.isArray(arr) ? arr.map(String) : [];
}

function getOrder(resp: any): string[] {
  if (Array.isArray(resp)) return resp.map(String);
  const arr = pick<any[]>(resp ?? {}, ['order','value'], []);
  return Array.isArray(arr) ? arr.map(String) : [];
}

function gradeQuestion(question: QuestionRecord, response: any): GradeDetail {
  const pts = Number(question.points ?? 1);
  const type = question.type;

  switch (type) {
    case 'true_false': {
      const correct = !!(question.meta?.correct ?? question.meta?.answer);
      const gv = (response !== undefined && response !== null) ? response : (response?.value);
      const has = gv === true || gv === false;
      if (!has) return { id: question.id, isCorrect: false, score: 0, possible: pts, type };
      const given = gv === true;
      const ok = given === correct;
      return { id: question.id, isCorrect: ok, score: ok ? pts : 0, possible: pts, type };
    }

    case 'mc_single': {
      const correctId = String((question.meta?.correct ?? question.meta?.answer ?? question.meta?.correctId ?? question.meta?.correct_answer ?? ''));
      const givenId = getMCResponseId(response);
      if (!hasValue(givenId) || !hasValue(correctId)) {
        return { id: question.id, isCorrect: false, score: 0, possible: pts, type };
      }
      let ok = normalizeAnswer(givenId) === normalizeAnswer(correctId);
      if (!ok && Array.isArray(question.meta?.options)) {
        const labelById = new Map((question.meta.options as any[]).map((o:any)=> [String(o.id), String(o.text ?? o.label ?? o.id)]));
        const givenLabel = labelById.get(String(givenId));
        const correctLabel = labelById.get(String(correctId)) ?? String(correctId);
        if (givenLabel) {
          ok = normalizeAnswer(givenLabel) === normalizeAnswer(correctLabel);
        }
      }
      return { id: question.id, isCorrect: ok, score: ok ? pts : 0, possible: pts, type };
    }

    case 'mc_multi': {
      const correct: string[] = (question.meta?.correct ?? question.meta?.answers ?? []).map(String);
      const given: string[] = getMCMultiIds(response);
      if (correct.length === 0 || given.length === 0) {
        return { id: question.id, isCorrect: false, score: 0, possible: pts, type };
      }
      const norm = (arr: string[]) => Array.from(new Set(arr.map(normalizeAnswer))).sort();
      const ok = JSON.stringify(norm(correct)) === JSON.stringify(norm(given));
      return { id: question.id, isCorrect: ok, score: ok ? pts : 0, possible: pts, type };
    }

    case 'short_text': {
      const acceptable: string[] = (question.meta?.acceptedAnswers ?? question.meta?.answers ?? question.meta?.correct ?? [question.meta?.answer])
        .filter((x: any) => x != null)
        .map((x: any) => String(x));

      const given = String((response?.text ?? response ?? ''));
      const ng = normalizeAnswer(given);
      const okExact = acceptable.some(a => normalizeAnswer(a) === ng);

      let okFuzzy = false;
      if (!okExact && ng.length >= 4) {
        okFuzzy = acceptable.some(a => {
          const na = normalizeAnswer(a);
          return levenshtein(na, ng) <= 1;
        });
      }
      const ok = okExact || okFuzzy;
      return { id: question.id, isCorrect: ok, score: ok ? pts : 0, possible: pts, type };
    }

    case 'ordering': {
      // Prefer comparing IDs if present; fallback to text comparison
      const correct: string[] = ((question.meta?.correctOrder ?? question.meta?.order ?? question.meta?.correct) || []).map(String);
      const given: string[] = getOrder(response);
      if (correct.length === 0 || given.length === 0 || correct.length !== given.length) {
        return { id: question.id, isCorrect: false, score: 0, possible: pts, type };
      }
      const ok = correct.every((id, i) => normalizeAnswer(id) === normalizeAnswer(given[i]));
      return { id: question.id, isCorrect: ok, score: ok ? pts : 0, possible: pts, type };
    }

    case 'matching': {
      const correct = question.meta?.correctMap ?? {};
      const map = response?.map ?? {};
      const keys = Object.keys(correct);
      const right = keys.filter(k => normalizeAnswer(map[k] ?? '') === normalizeAnswer(correct[k] ?? '')).length;
      const ok = right === keys.length;
      return { id: question.id, isCorrect: ok, score: ok ? pts : 0, possible: pts, type };
    }

    case 'open': {
      return { id: question.id, isCorrect: false, score: 0, possible: pts, type };
    }
  }
}

/** Overloaded API: per-question OR batch */
export function grade(question: QuestionRecord, response: any): { isCorrect: boolean; score: number };
export function grade(questions: QuestionRecord[], responses: Record<string, any>): { totalPossible: number; totalScore: number; details: GradeDetail[] };
export function grade(arg1: any, arg2?: any): any {
  if (Array.isArray(arg1)) {
    const questions: QuestionRecord[] = arg1;
    const responses: Record<string, any> = arg2 ?? {};
    const details: GradeDetail[] = questions.map(q => gradeQuestion(q, responses[q.id]));
    const totalPossible = details.reduce((s, d) => s + d.possible, 0);
    const totalScore = details.reduce((s, d) => s + d.score, 0);
    return { totalPossible, totalScore, details };
  } else {
    const d = gradeQuestion(arg1 as QuestionRecord, arg2);
    return { isCorrect: d.isCorrect, score: d.score };
  }
}
