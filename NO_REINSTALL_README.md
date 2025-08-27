# No-reinstall setup

- `vite.config.ts` forces all React imports (incl. jsx runtimes) to the **same** copy in your top-level `node_modules` and dedupes at resolver level.
- `package.json`:
  - `overrides` keeps **one version** of React/ReactDOM everywhere.
  - `preinstall` ensures **npm only** (avoids yarn/pnpm mixing).
  - `postinstall` runs `npm dedupe` automatically after `npm install`.

You should not need to repeatedly reinstall. If you do change React versions, just run a normal `npm install` once.
