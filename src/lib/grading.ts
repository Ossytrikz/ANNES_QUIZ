/* =========================================================
 *  QUIZ GRADER — Per-type, explicit accuracy strategies
 * ========================================================= */

/** Toggle verbose console diagnostics */
const DEBUG_QUIZ = true;
function log(scope: string, msg: string, extra?: any) {
  if (!DEBUG_QUIZ) return;
  const tag = `[QUIZ][${scope}]`;
  if (extra !== undefined) {
    try {
      console.debug(tag, msg, JSON.parse(JSON.stringify(extra)));
    } catch {
      console.debug(tag, msg, extra);
    }
  } else {
    console.debug(tag, msg);
  }
}

/* ============ Shared Types ============ */

export interface QuestionRecord {
  id: string;
  type:
    | "true_false"
    | "mc_single"
    | "mc_multi"
    | "ordering"
    | "matching"
    | "short_text"
    | "open"
    | (string & {});
  stem: string;
  meta?: any;
  points?: number | string;
}

export interface GradeDetail {
  id: string;
  type: QuestionRecord["type"];
  isCorrect: boolean | null;
  score: number;
  possible: number;
}

/* ============ Small Utilities ============ */

function toNum(n: any, def = 1): number {
  const x = Number(n);
  return Number.isFinite(x) ? x : def;
}

function hasValue(v: any): boolean {
  return !(v === undefined || v === null || String(v) === "");
}

function normStr(x: any): string {
  return String(x ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function idOf(o: any): string {
  return String(o?.id ?? o?.value ?? o?.key ?? o?.text ?? "");
}

/** Gather candidate options (supports meta.options / meta.items / meta.choices) */
function getOptions(meta: any): any[] {
  if (!meta) return [];
  if (Array.isArray(meta.options)) return meta.options;
  if (Array.isArray(meta.items)) return meta.items;
  if (Array.isArray(meta.choices)) return meta.choices;
  return [];
}

/** Map numeric index → option id if available */
function indexToOptionId(meta: any, idx: number): string | null {
  const opts = getOptions(meta);
  if (idx < 0 || idx >= opts.length) return null;
  return idOf(opts[idx]);
}

/** Build maps for labels and reverse lookups */
function labelMap(list: any[]) {
  const byId = new Map<string, string>();
  const byLabel = new Map<string, string>(); // normalized label -> id
  for (const o of list) {
    const id = idOf(o);
    const label = String(o?.text ?? o?.label ?? o?.name ?? o?.title ?? o?.id ?? "");
    if (id) byId.set(id, label);
    if (label) byLabel.set(normStr(label), id);
  }
  return { byId, byLabel };
}

/** Truthy flag helper for varied data */
function isFlagTrue(v: any): boolean {
  if (v === true || v === 1) return true;
  if (typeof v === "string") {
    const s = v.toLowerCase();
    return s === "true" || s === "yes" || s === "1";
  }
  return false;
}

/** Optional fuzzy distance for short_text */
function editDistance(a: string, b: string): number {
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp = Array.from({ length: m + 1 }, () => new Array<number>(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        dp[i][j] = Math.min(dp[i][j], dp[i - 2][j - 2] + 1);
      }
    }
  }
  return dp[m][n];
}

/* ============ Response Shape Readers (UI-agnostic) ============ */

function readSingleChoice(response: any): string {
  if (response == null) return "";
  if (typeof response === "string" || typeof response === "number") return String(response);
  if (typeof response === "boolean") return String(response);
  if (typeof response === "object") {
    if ("choice" in response) return idOf((response as any).choice);
    if ("id" in response || "value" in response || "key" in response || "text" in response) return idOf(response);
  }
  return String(response);
}

function readMultiChoice(response: any): string[] {
  if (!response) return [];
  if (Array.isArray(response)) return response.map(idOf);
  if (Array.isArray(response.choices)) return response.choices.map(idOf);
  if (Array.isArray(response.ids)) return response.ids.map(idOf);
  if (Array.isArray(response.selected)) return response.selected.map(idOf);
  return [];
}

function readOrdering(response: any): string[] {
  if (!response) return [];
  if (Array.isArray(response)) return response.map(idOf);
  if (Array.isArray(response.order)) return response.order.map(idOf);
  if (Array.isArray(response.items)) return response.items.map(idOf);
  if (Array.isArray(response.sequence)) return response.sequence.map(idOf);
  return [];
}

function readMatching(response: any): Record<string, string> {
  if (!response) return {};
  const obj = response.map ?? response;
  if (obj && typeof obj === "object" && !Array.isArray(obj)) return obj as Record<string, string>;
  return {};
}

/* ============ Unique Accuracy Strategies per Type ============ */

function checkTrueFalse(meta: any, response: any): { isCorrect: boolean; score: number; possible: number } {
  const possible = toNum(meta?.points ?? meta?.score ?? meta?.weight ?? 1, 1);
  const correct = !!(meta?.correct ?? meta?.answer);
  let given: boolean | null = null;
  if (typeof response === "boolean") given = response;
  else if (typeof response === "string" || typeof response === "number") given = String(response).trim().toLowerCase() === "true";
  else if (response && typeof response.value !== "undefined") given = !!response.value;

  const ok = given === correct;
  log("tf", "check", { correct, given, ok });
  return { isCorrect: ok, score: ok ? possible : 0, possible };
}

function checkMCSingle(meta: any, response: any): { isCorrect: boolean; score: number; possible: number } {
  const possible = toNum(meta?.points ?? 1, 1);
  const options = getOptions(meta);
  const { byId, byLabel } = labelMap(options);

  const givenId = readSingleChoice(response);
  const givenLabel = byId.get(String(givenId)) ?? "";

  let correctRaw: any =
    meta?.correct ??
    meta?.answer ??
    meta?.correctId ??
    meta?.correct_id ??
    meta?.correctIndex ??
    meta?.solution ??
    meta?.correctLabel ??
    meta?.correct_text ??
    "";

  if (typeof correctRaw === "number" || (typeof correctRaw === "string" && /^\d+$/.test(correctRaw))) {
    const mapped = indexToOptionId(meta, Number(correctRaw));
    if (mapped) {
      log("mc1", "mapped numeric correct → id", { idx: Number(correctRaw), id: mapped });
      correctRaw = mapped;
    } else {
      log("mc1", "numeric correct index out of range", { idx: Number(correctRaw), optionsLen: options.length });
      correctRaw = "";
    }
  }

  if (!hasValue(correctRaw) && options.length) {
    const flagged = options.find(
      (o: any) => isFlagTrue(o?.correct) || isFlagTrue(o?.isCorrect) || isFlagTrue(o?.is_correct) || isFlagTrue(o?.answer) || isFlagTrue(o?.is_correct_answer)
    );
    if (flagged) {
      correctRaw = idOf(flagged);
      log("mc1", "derived correct from option flags", { id: correctRaw });
    }
  }

  // Strategy A — ID equality
  let ok = hasValue(givenId) && hasValue(correctRaw) && normStr(givenId) === normStr(String(correctRaw));

  // Strategy B — Label equality
  if (!ok) {
    const correctLabel = byId.get(String(correctRaw)) ?? String(correctRaw);
    const givenLabelCandidate = hasValue(givenLabel)
      ? givenLabel
      : ((byId.get(String(givenId)) ?? String(givenId)));
    const givenLabelNorm = normStr(givenLabelCandidate);
    const correctLabelNorm = normStr(correctLabel);
    if (hasValue(givenLabelNorm) && hasValue(correctLabelNorm)) {
      ok = givenLabelNorm === correctLabelNorm;
      log("mc1", "label compare", { givenLabel: givenLabelNorm, correctLabel: correctLabelNorm, ok });
    }
  }

  // Strategy C — reverse label→id
  if (!ok && hasValue(givenId)) {
    const fromLabel = byLabel.get(normStr(String(givenId)));
    if (fromLabel && hasValue(correctRaw)) {
      ok = normStr(fromLabel) === normStr(String(correctRaw));
      log("mc1", "reverse label->id compare", { fromLabel, correctRaw, ok });
    }
  }

  if (!ok) log("mc1", "final mismatch", { givenId, correctRaw, optionsLen: options.length });

  return { isCorrect: ok, score: ok ? possible : 0, possible };
}

function checkMCMulti(meta: any, response: any): { isCorrect: boolean; score: number; possible: number } {
  const possible = toNum(meta?.points ?? 1, 1);
  const options = getOptions(meta);

  let correctList: any[] =
    (Array.isArray(meta?.correctAnswers) && meta.correctAnswers) ||
    (Array.isArray(meta?.correct) && meta.correct) ||
    (Array.isArray(meta?.answers) && meta.answers) ||
    [];

  if (correctList.length && correctList.every((x) => Number.isInteger(Number(x))) && options.length) {
    correctList = correctList
      .map((n) => indexToOptionId(meta, Number(n)))
      .filter((x): x is string => !!x);
    log("mcM", "mapped numeric correct[] → ids", { correctList });
  }

  if ((!correctList || correctList.length === 0) && options.length) {
    correctList = options
      .filter((o: any) => isFlagTrue(o?.correct) || isFlagTrue(o?.isCorrect))
      .map(idOf);
    log("mcM", "derived correct[] from flags", { correctList });
  }

  const givenList = readMultiChoice(response);
  log("mcM", "compare", { givenList, correctList });

  if (!correctList.length || !givenList.length) {
    return { isCorrect: false, score: 0, possible };
  }

  const normSet = (arr: string[]) => Array.from(new Set(arr.map(normStr)));
  const a = normSet(correctList.map(String)).sort();
  const b = normSet(givenList.map(String)).sort();
  const ok = JSON.stringify(a) === JSON.stringify(b);

  return { isCorrect: ok, score: ok ? possible : 0, possible };
}

function checkOrdering(meta: any, response: any): { isCorrect: boolean; score: number; possible: number } {
  const possible = toNum(meta?.points ?? 1, 1);
  const items = Array.isArray(meta?.items) ? meta.items : [];

  let correctRaw: any[] =
    (Array.isArray(meta?.correctOrder) && meta.correctOrder) ||
    (Array.isArray(meta?.order) && meta.order) ||
    (Array.isArray(meta?.correct) && meta.correct) ||
    [];

  let correctIds: string[];
  if (correctRaw.length && correctRaw.every((x) => Number.isInteger(Number(x))) && items.length) {
    correctIds = correctRaw
      .map((n) => {
        const it = items[Number(n)];
        return idOf(it);
      })
      .filter(Boolean);
    log("ord", "mapped numeric correct[] → ids", { correctIds });
  } else {
    correctIds = correctRaw.map(String);
  }

  const givenIds = readOrdering(response);
  log("ord", "compare", { givenIds, correctIds });

  const allowReverse = !!meta?.allowReverse;
  const ignoreMissing = !!meta?.ignoreMissing;

  if (!correctIds.length || !givenIds.length) {
    return { isCorrect: false, score: 0, possible };
  }

  const sameLen = correctIds.length === givenIds.length;
  const exactOk =
    sameLen && correctIds.every((id, i) => normStr(id) === normStr(givenIds[i]));
  if (exactOk) return { isCorrect: true, score: possible, possible };

  if (allowReverse && sameLen) {
    const rev = [...correctIds].reverse();
    const okRev = rev.every((id, i) => normStr(id) === normStr(givenIds[i]));
    if (okRev) return { isCorrect: true, score: possible, possible };
  }

  if (ignoreMissing) {
    let i = 0;
    for (const g of givenIds) {
      if (i < correctIds.length && normStr(g) === normStr(correctIds[i])) i++;
    }
    const okSubsequence = i === correctIds.length;
    return { isCorrect: okSubsequence, score: okSubsequence ? possible : 0, possible };
  }

  return { isCorrect: false, score: 0, possible };
}

function checkMatching(meta: any, response: any): { isCorrect: boolean; score: number; possible: number } {
  const left = Array.isArray(meta?.left) ? meta.left : [];
  const correctMap: Record<string, string> = meta?.correctMap ?? meta?.pairs ?? {};

  // FIXED: avoid mixing ?? with || without parens
  const possiblePrimary = (meta?.points ?? left.length);
  const possible = toNum((possiblePrimary || 1), (left.length || 1));

  const given = readMatching(response);
  log("mat", "compare", { leftLen: left.length, given, correctMap });

  if (!left.length) {
    return { isCorrect: false, score: 0, possible };
  }

  let correctPairs = 0;
  for (const L of left) {
    const lkey = String(L?.id ?? L?.text ?? "");
    const expected = correctMap[lkey] ?? correctMap[L?.text ?? ""];
    const chosen = given[lkey];
    if (hasValue(expected) && hasValue(chosen) && normStr(expected) === normStr(chosen)) {
      correctPairs++;
    }
  }

  const ratio = correctPairs / left.length;
  const score = Math.round(ratio * possible);
  const allCorrect = correctPairs === left.length;

  return { isCorrect: allCorrect, score, possible };
}

function checkShortText(meta: any, response: any): { isCorrect: boolean; score: number; possible: number } {
  const possible = toNum(meta?.points ?? 1, 1);
  const answers: string[] = Array.isArray(meta?.acceptedAnswers)
    ? meta.acceptedAnswers.map(String)
    : [];

  const given =
    typeof response === "string" || typeof response === "number"
      ? String(response)
      : (response?.text as string) ?? "";

  const g = normStr(given);
  const exact = answers.some((a) => normStr(a) === g);

  if (exact) return { isCorrect: true, score: possible, possible };

  const fuzzyLimit = Number(meta?.fuzzy);
  if (Number.isFinite(fuzzyLimit) && fuzzyLimit >= 1) {
    for (const a of answers) {
      const d = editDistance(normStr(a), g);
      if (d <= fuzzyLimit) {
        log("short", "fuzzy match hit", { given: g, target: normStr(a), distance: d, limit: fuzzyLimit });
        return { isCorrect: true, score: possible, possible };
      }
    }
  }

  return { isCorrect: false, score: 0, possible };
}

function checkOpen(meta: any): { isCorrect: null; score: 0; possible: number } {
  const possible = toNum(meta?.points ?? 1, 1);
  return { isCorrect: null, score: 0, possible };
}

/* ============ Public API ============ */

export function gradeQuestion(
  question: QuestionRecord,
  response: any
): GradeDetail {
  const meta = question.meta ?? {};
  const type = question.type;

  try {
    switch (type) {
      case "true_false": {
        const res = checkTrueFalse(meta, response);
        return { id: question.id, type, ...res };
      }
      case "mc_single": {
        const res = checkMCSingle(meta, response);
        return { id: question.id, type, ...res };
      }
      case "mc_multi": {
        const res = checkMCMulti(meta, response);
        return { id: question.id, type, ...res };
      }
      case "ordering": {
        const res = checkOrdering(meta, response);
        return { id: question.id, type, ...res };
      }
      case "matching": {
        const res = checkMatching(meta, response);
        return { id: question.id, type, ...res };
      }
      case "short_text": {
        const res = checkShortText(meta, response);
        return { id: question.id, type, ...res };
      }
      case "open": {
        const res = checkOpen(meta);
        return { id: question.id, type, ...res };
      }
      default: {
        log("grade", "unknown type — manual", { id: question.id, type });
        return { id: question.id, type, isCorrect: null, score: 0, possible: toNum(meta?.points ?? 1, 1) };
      }
    }
  } catch (err) {
    log("grade", "EXCEPTION while grading", {
      id: question.id,
      type,
      err: String(err),
      metaKeys: Object.keys(meta ?? {}),
      responseSnapshot: (() => {
        try { return JSON.parse(JSON.stringify(response)); } catch { return "<unstringifiable>"; }
      })(),
    });
    return { id: question.id, type, isCorrect: null, score: 0, possible: toNum(meta?.points ?? 1, 1) };
  }
}

export function grade(
  question: QuestionRecord,
  response: any
): { isCorrect: boolean | null; score: number };
export function grade(
  questions: QuestionRecord[],
  responses: Record<string, any>
): { totalPossible: number; totalScore: number; details: GradeDetail[] };
export function grade(arg1: any, arg2?: any): any {
  if (Array.isArray(arg1)) {
    const questions: QuestionRecord[] = arg1;
    const responses: Record<string, any> = arg2 ?? {};
    const details = questions.map((q) => gradeQuestion(q, responses[q.id]));
    const totalPossible = details.reduce((s, d) => s + d.possible, 0);
    const totalScore = details.reduce((s, d) => s + d.score, 0);
    log("grade-batch", "summary", { count: details.length, totalPossible, totalScore });
    return { totalPossible, totalScore, details };
  } else {
    const d = gradeQuestion(arg1 as QuestionRecord, arg2);
    log("grade-one", "summary", { id: (arg1 as QuestionRecord).id, type: d.type, isCorrect: d.isCorrect, score: d.score });
    return { isCorrect: d.isCorrect, score: d.score };
  }
}
