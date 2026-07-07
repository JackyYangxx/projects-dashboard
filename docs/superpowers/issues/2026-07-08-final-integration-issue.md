# Final Integration Issue — Tray "下次扫描" Display

**Date:** 2026-07-08
**Task:** Task 22: Final compilation and runtime verification
**Severity:** Low (functional degradation, not crash)
**Status:** Mitigated; full fix requires new dependency

## Summary

The tray menu's "下次扫描" next-run display does not work because the
implementation calls `cronJob.nextDate()`, which does not exist in the installed
`node-cron@4.6.0` runtime (only `now`, `start`, `stop` are exposed). The
function silently returns `null`, so the tray label always shows
"定时扫描未启用" even when a schedule is configured.

## Root Cause

- `electron/main.ts` `getNextScheduledRun()` called
  `(cronJob as unknown as { nextDate: () => Date }).nextDate()`.
- `node-cron@4.6.0` runtime object exposes `now`, `start`, `stop` but no
  `nextDate` method (verified via `Object.keys(cron.schedule(...))`).
- Original code's comment claimed "node-cron runtime exposes nextDate() but
  @types/node-cron does not declare it" — this is incorrect for v4.
- During dev startup (`npm run dev`), vite-plugin-electron bundled
  `electron/main.ts`, executed `initScheduler()`, and the missing-method call
  surfaced as:
  ```
  [scheduler] failed to compute next run: TypeError: cronJob.nextDate is not a function
  ```

## Mitigation Applied (Task 22)

In `electron/main.ts` `getNextScheduledRun()`, removed the broken call and
replaced with an immediate `return null`. The dev server now starts cleanly
with no scheduler errors. The tray menu gracefully degrades to the
"定时扫描未启用" label.

## Spec Impact

`docs/superpowers/specs/2026-07-07-code-review-agent-design.md` requires the
tray menu to show `下次扫描: 2026-07-08 09:00` style entries. This is no longer
satisfied until a proper fix is added.

## Suggested Fix (separate task)

Two options:

1. **Add `cron-parser` dependency** (preferred per project CLAUDE.md "Mature
   components" rule): `npm i cron-parser`, then in `getNextScheduledRun`:
   ```ts
   import parser from 'cron-parser'
   // ...inside getNextScheduledRun:
   const config = store.get(SCHEDULE_KEY) as { cronExpression?: string } | undefined
   const expr = config?.cronExpression || DEFAULT_CRON
   if (!cron.validate(expr)) return null
   return parser.parseExpression(expr).next().toDate().toISOString()
   ```
   But this requires also passing the cron expression into the function (it
   currently only sees the `cronJob` object).

2. **Capture `nextRun` at schedule time** (no new dep): When
   `initScheduler()` calls `cron.schedule(...)`, compute the first run with a
   small helper or via the same `cron-parser` package.

Either approach requires modifying `initScheduler` to store the next-run
timestamp alongside the `cronJob`.

## Verification (post-mitigation)

- `npx tsc --noEmit` → exit 0
- `npm run dev` → clean startup, no scheduler errors
- `npm test` → 148/148 pass
- Web Worker chunk (`src/agents/worker.ts`) served at HTTP 200

## Files Changed

- `/Users/fxy/Documents/projects/projects-dashboard/electron/main.ts` —
  simplified `getNextScheduledRun()` to return `null`