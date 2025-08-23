# CHANGELOG

## 2025-08-23 – Accessibility & Grading Fixes
- **Contrast**: Increased input/textarea contrast in dark mode; placeholders now use full opacity and brighter color. Added visible focus ring. (Edited `src/index.css`.)
- **Answer grading**: Rewrote `src/lib/grading.ts` for robust comparisons:
  - Trim + lowercase + collapse whitespace + **remove accents** before comparing.
  - `short_text` accepts any of multiple acceptable answers (`meta.answers` / `meta.correct`) and tolerates a single typo for words ≥ 4 chars.
  - Fixed `mc_single`, `mc_multi`, `true_false`, `ordering`, and `matching` comparisons to be normalization-safe.
  - Provided a stable `grade()` API with detailed per-question results.

- **Bugfix:** Restored backward-compatible `grade()` overload so pages that call `grade(q, response)` work. The batch form `grade(questions[], responsesMap)` also remains available.

- **Build fix:** De-duplicated `grade()` overloads in `src/lib/grading.ts` to resolve Vite/esbuild 'Multiple exports with the same name' error.

- **Grading tweak:** `short_text` now reads `meta.acceptedAnswers` (alongside `answers`, `correct`, `answer`). `mc_single` now also checks `correctId`/`correct_answer`.

- **Grader hardening:** Empty responses for mc_single/mc_multi/true_false/ordering now count as incorrect. Ordering compares ids but renders human labels when available. Console results show labels for ordering sequences.

- **Console review UI:** Fixed `renderCorrect` for mc_single/mc_multi to use alt keys and show labels; ordering now displays labels instead of ids.
- **Grader tweak:** mc_single also compares option labels when ids differ.

- **New:** Professional Quiz Builder (/builder) with support for MC single/multi, True/False, Short text, Ordering, Matching. Saves to Supabase and flows to Console for taking.

- **Routing fix:** Replaced links to `/quizzes/create` with `/quizzes/new` to match router. This resolves in-app 404s when starting a new quiz (Home & Explore pages).

- **Build fix:** Removed duplicate `import QuizBuilder` lines from `src/App.tsx` to fix Vite/Babel 'Identifier already declared' error.
