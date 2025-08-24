// src/lib/settings.ts
export type QuizSettings = {
  immediateFeedback: boolean;
};

const KEY = "quiz:immediateFeedback";

export function getQuizSettings(): QuizSettings {
  let immediateFeedback = false;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw != null) immediateFeedback = raw === "1" || raw === "true";
  } catch {}
  // Also allow a global toggle if present
  // @ts-ignore
  if (typeof window !== "undefined" && window.__QUIZ_IMMEDIATE_FEEDBACK__ != null) {
    // @ts-ignore
    immediateFeedback = !!window.__QUIZ_IMMEDIATE_FEEDBACK__;
  }
  return { immediateFeedback };
}

export function setImmediateFeedback(on: boolean) {
  try { localStorage.setItem(KEY, on ? "1" : "0"); } catch {}
}
