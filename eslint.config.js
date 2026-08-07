import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  // `.claude/worktrees/*` holds full checkouts of the repo, each with its own tsconfig.
  // Without this, a local lint run sees several candidate roots and fails to parse every
  // file — the failure CI never reproduces, because CI has no worktrees.
  globalIgnores(['dist', '.claude']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      // `_`-prefixed names are deliberately unused (omit-by-destructuring, ignored params).
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        ignoreRestSiblings: true,
      }],
    },
  },
  {
    // Known debt, quarantined 2026-07-30 when the verify gate was installed. These are real
    // findings (refs read during render; a component created during render, which resets its
    // state every render) in load-bearing autosave/canvas code — fixing them is a behavioural
    // change that belongs in its own PR, not in the chore that turned the gate on. Kept as
    // warnings so every lint run still reports them; `error` stays in force everywhere else.
    files: ['src/editor/useAutosave.ts', 'src/canvas/FishboneCanvas.tsx'],
    rules: {
      'react-hooks/refs': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/static-components': 'warn',
    },
  },
])
