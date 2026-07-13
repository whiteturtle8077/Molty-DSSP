# Molty-DSSP — Deterministic SDET Playwright

A TypeScript + Playwright test automation framework using JSON BDD.

## Quick Start

```bash
npm install
npx playwright install chromium
npm run test:hello
```

## Structure

- `tests/` — Playwright test specs (hello-world smoke tests)
- `src/features/` — JSON BDD feature files
- `src/pages/` — Page object models
- `src/steps/` — Step definitions for BDD scenarios
- `src/runner/` — Custom JSON BDD test runner

## Runners

- **Playwright native:** `npm run test` or `npm run test:hello`
- **JSON BDD runner:** `npm run test:bdd`
