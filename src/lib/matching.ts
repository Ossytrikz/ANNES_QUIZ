
// Auto-added robust matching grader
export type MatchingMeta =
  | { correctMap: Record<string, any> }
  | { correctPairs: Array<[any, any]> }
  | { correct: Record<string, any> | Array<[any, any]> };

export type MatchingResponse =
  | { map: Record<string, any> }
  | Array<[any, any]>;

export type MatchingGradeOptions = {
  scoreMode?: 'partial' | 'binary';
  mode?: 'strict' | 'lenient';
};

export type MatchingGradeResult = {
  isCorrect: boolean;
  score: number;
  possible: number;
  right: Array<[string, string]>;
  wrong: Array<[string, string]>;
  missing: Array<[string, string]>;
};

function normalizeAnswer(ans: unknown): string {
  if (ans == null) return '';
  return String(ans).trim().toLowerCase().replace(/\s+/g, ' ').normalize('NFD').replace(/\p{Diacritic}/gu, '');
}

function idish(v: any): string {
  if (v == null) return '';
  if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') return String(v);
  if (Array.isArray(v)) return v.map(idish).join(',');
  const cand = v.id ?? v.value ?? v.key ?? v.code ?? v.slug ?? v.label ?? v.text ?? v.name ?? v.title;
  return cand != null ? String(cand) : (()=>{ try { return JSON.stringify(v);} catch {return String(v);} })();
}

function buildCorrectMap(meta: MatchingMeta): Map<string, string> {
  const raw: any = (meta as any).correctMap ?? (meta as any).correctPairs ?? (meta as any).correct ?? {};
  const map = new Map<string,string>();
  if (Array.isArray(raw)) {
    for (const p of raw) {
      if (!Array.isArray(p) || p.length < 2) continue;
      const L = normalizeAnswer(idish(p[0]));
      const R = normalizeAnswer(idish(p[1]));
      if (L) map.set(L, R);
    }
  } else if (raw && typeof raw === 'object') {
    for (const [k,v] of Object.entries(raw)) {
      const L = normalizeAnswer(idish(k));
      const R = normalizeAnswer(idish(v));
      if (L) map.set(L, R);
    }
  }
  return map;
}

function parseResponsePairs(resp: MatchingResponse): Array<[string,string]> {
  const out: Array<[string,string]> = [];
  if (Array.isArray(resp)) {
    for (const p of resp) {
      if (!Array.isArray(p) || p.length < 2) continue;
      const L = normalizeAnswer(idish(p[0]));
      const R = normalizeAnswer(idish(p[1]));
      if (L) out.push([L, R]);
    }
    return out;
  }
  if (resp && typeof resp === 'object' && (resp as any).map && typeof (resp as any).map === 'object') {
    for (const [k,v] of Object.entries((resp as any).map as Record<string,any>)) {
      const L = normalizeAnswer(idish(k));
      const R = normalizeAnswer(idish(v));
      if (L) out.push([L, R]);
    }
  }
  return out;
}

function remapLeftsLenient(pairs: Array<[string,string]>, knownLefts: Set<string>): Array<[string,string]> {
  const result: Array<[string,string]> = [];
  for (const [L,R] of pairs) {
    if (knownLefts.has(L)) { result.push([L,R]); continue; }
    const candidates = Array.from(knownLefts).filter(k => k.includes(L) || L.includes(k));
    if (candidates.length === 1) result.push([candidates[0], R]);
    else result.push([L,R]);
  }
  return result;
}

export function gradeMatching(meta: MatchingMeta, response: MatchingResponse, options: MatchingGradeOptions = {}): MatchingGradeResult {
  const { scoreMode = 'partial', mode = 'strict' } = options;

  const correctMap = buildCorrectMap(meta);
  const correctPairs = Array.from(correctMap.entries());
  const possible = correctPairs.length;

  const knownLefts = new Set(correctMap.keys());

  let givenPairs = parseResponsePairs(response);
  if (mode === 'lenient') givenPairs = remapLeftsLenient(givenPairs, knownLefts);

  const seen = new Set<string>();
  const uniqueGiven: Array<[string,string]> = [];
  for (const [L,R] of givenPairs) {
    if (seen.has(L)) continue;
    seen.add(L);
    uniqueGiven.push([L,R]);
  }

  const right: Array<[string,string]> = [];
  const wrong: Array<[string,string]> = [];
  for (const [L,R] of uniqueGiven) {
    if (!knownLefts.has(L)) { wrong.push([L,R]); continue; }
    const expected = correctMap.get(L) ?? '';
    if (normalizeAnswer(R) === expected) right.push([L,R]); else wrong.push([L,R]);
  }

  const missing: Array<[string,string]> = [];
  for (const [L,R] of correctPairs) {
    if (!right.find(([l])=>l===L) && !wrong.find(([l])=>l===L)) missing.push([L,R]);
  }

  const numRight = right.length;
  const score = (scoreMode === 'binary') ? (numRight === possible ? possible : 0) : numRight;

  return { isCorrect: numRight === possible, score, possible, right, wrong, missing };
}
