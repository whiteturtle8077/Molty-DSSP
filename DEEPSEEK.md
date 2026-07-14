# DEEPSEEK.md — Molty-DSSP Workflow Protocol

This file is the active loop controller for any agent working on this project. If you are reading this at session start, **follow it exactly** before doing anything else.

## Objective

Build a lean, reusable TypeScript + Playwright automation library using JSON BDD. Tests are structured JSON feature files, executed by a custom lightweight runner. The goal is maximum objective-achievement with minimum effort: clean modular page objects, config-driven, resilient.

## Design Directive (TRIM) — Read This First

**Build only what serves the objective.** This is not a comprehensive test suite. No negative testing, no error message validation, no edge case coverage for its own sake. Every scenario must directly serve a real automation goal.

**What belongs:** login flows (smoke + successful auth), captcha handling, modular page objects, CI-ready reporting, multi-target config.

**What does not belong:** invalid password tests, error state coverage, edge cases that don't serve a concrete target.

See `metalayer/ROADMAP.md` for full directive and `metalayer/GLOSSARY.json` entry "TRIM DIRECTIVE" (2026-07-14).

## Session Startup — Read Order (Mandatory)

1. **`DEEPSEEK.md`** (this file) — boot instructions
2. **`metalayer/STATE.json`** — resume point (phase, step, next_action)
3. **`metalayer/ROADMAP.md`** — project scope, milestones, TRIM DIRECTIVE
4. **`metalayer/GLOSSARY.json`** — durable term/discovery memory
5. **`metalayer/FROZEN_CACHE.context`** — infrastructure snapshot
6. **`metalayer/session-log/`** — last entry (most recent session turn)
7. **`metalayer/challenges/`** — any open blockers

## The Work Cycle (One Atomic Step Per Turn)

```
1. Read STATE.json (resume from prev turn)
2. Read ROADMAP.md + GLOSSARY.json + FROZEN_CACHE.context (reload context)
3. Execute ONE atomic step from STATE.json.next_action
4. If need more context: read relevant session-log entries, challenges, cache files
5. Update ROADMAP.md (if milestone reached)
6. Update GLOSSARY.json (new discoveries)
7. Update STATE.json (new status, next_action, pending_tasks)
8. Write session-log/<NEXT_NUMBER>-<description>.md
9. End turn with RESUME BLOCK for user
```

**Invariant: One step per turn.** Do not "superman push" multiple pipeline steps. Each turn executes exactly one atomic unit, then documents and yields. The STATE.json.next_action is the program counter — reads it, executes it, writes the new one.

## File Locations

| Path | Purpose |
|------|---------|
| `output/` | Git root → GitHub (code deliverables only) |
| `metalayer/` | DSSO harness state (local only, never pushed) |
| `output/src/runner/index.ts` | JSON BDD test runner |
| `output/src/pages/` | Page object models |
| `output/src/features/` | JSON feature files (BDD contracts) |
| `output/src/steps/` | Step definitions (decoupled from runner) |
| `output/tests/` | Native Playwright test specs |
| `output/playwright.config.ts` | Playwright configuration |

## File Conventions

### STATE.json — Rewrite Entirely
Never inline-edit. Rewrite the whole file (it's small, atomicity matters).

### Session Logs — Append-Only
Write new entry each turn. Never edit old logs. Format:
```markdown
# Session Log NNN — Description
**Date:** ISO-8601
## Activity
## Results
## Decisions
## Pending
```

### GLOSSARY.json — Add, Don't Delete
Add new terms and discoveries. Only remove if proven wrong.

### FROZEN_CACHE — Infrastructure Changes Only
Update when IPs, paths, configs, or dependency relationships change.

### Challenges — Status-Based
`Open | Partially Resolved | Resolved | Won't Fix`. Update status, don't rewrite.

## The RESUME BLOCK

End every turn with a self-contained summary that the next session can use to stand up immediately:

```
RESUME: <one-line project summary>
Phase <N>, Step <current step> is: <exact next action>
<Bullet list of key context the next session needs>
<Technical details lost on context reset>
```

## Emergency Procedures

- **`/abort`** — user wants to stop: update STATE.json status to "paused", write final session-log entry with RESUME BLOCK
- **`/stop`** — hard halt mid-operation: do not write any state files on the way out
- **Detected blocker:** create a file in `metalayer/challenges/<slug>.md` with root cause, attempted fixes, verification needed
- **Phase complete:** update STATE.json step to "phase_N_complete", set next_action to "awaiting_user_approval"

## Phase Map

- **Phase 1 (Complete):** Project scaffold + hello world + structure finalization
- **Phase 2 (In Progress):** Config layer ✅, selector externalization ✅, 2Captcha ✅, login E2E ✅, reporting (todo), multi-target config (todo), convergence (todo)
- **Phase 3 (Future):** CI pipeline, parallel execution, targets beyond ProtonMail
