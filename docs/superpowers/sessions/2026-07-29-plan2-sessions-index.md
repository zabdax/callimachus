# Plan 2 Sessions Index

> **Quick navigation for running Plan 2 — Timer, Progress, Leaderboard across separate sessions.**

## How to use

Each session is a self-contained, executable prompt. Copy the matching prompt into a fresh ZCode session (or paste it as your first message in this same session if continuing), and the agent will execute it end-to-end with TDD discipline.

| # | Prompt file | Subsystem | Atomic tasks rolled up |
|---|---|---|---|
| 1 | [`2026-07-29-plan2-session1-prompt.md`](./2026-07-29-plan2-session1-prompt.md) | Timer Core | T1, T2, T3 |
| 2 | [`2026-07-29-plan2-session2-prompt.md`](./2026-07-29-plan2-session2-prompt.md) | Server-Anchored Timer | T4, T5, T6, T7, T8 |
| 3 | [`2026-07-29-plan2-session3-prompt.md`](./2026-07-29-plan2-session3-prompt.md) | Progress + Pace Card | T9, T10 |
| 4 | [`2026-07-29-plan2-session4-prompt.md`](./2026-07-29-plan2-session4-prompt.md) | Daily Plan + Time Blocks | T11, T12 |
| 5 | [`2026-07-29-plan2-session5-prompt.md`](./2026-07-29-plan2-session5-prompt.md) | Leaderboard | T13, T14 |
| 6 | [`2026-07-29-plan2-session6-prompt.md`](./2026-07-29-plan2-session6-prompt.md) | Overview + E2E + CI + Handoff | T15, T16, T17, T18 |

## Execution order

Run them sequentially. Each session branches off the previous session's pushed branch:

```
feat/plan-1-foundation          (existing, post-Plan 1)
   ↓
plan2/session1-timer-core       (Timer Core)
   ↓
plan2/session2-server-anchored-timer   (Server-Anchored Timer)
   ↓
plan2/session3-progress-pace    (Progress + Pace Card)
   ↓
plan2/session4-daily-plan       (Daily Plan + Time Blocks)
   ↓
plan2/session5-leaderboard      (Leaderboard)
   ↓
plan2/session6-overview-handoff (Overview + E2E + CI + Handoff)
   ↓
PR → main → Plan 3
```

## Per-session checklist

Each prompt enforces:

- [ ] TDD: failing test BEFORE implementation, every code step
- [ ] Single session commit with a locked message
- [ ] `npm run lint && npm test && npm run build` green in BOTH `apps/web` AND `apps/functions` (where applicable) before commit
- [ ] ≥80% line coverage on new `src/features/*` files
- [ ] Final report + branch push before the session ends

## What a session prompt contains

Every prompt has these sections in the same order:

1. **Mission** — what ships at the end
2. **Prerequisites** — branch state + Plan 1 dependencies
3. **Source-of-truth plan reference** — the parent plan task IDs being rolled up
4. **Skills required** — which `superpowers:*` skills to invoke
5. **Working directory + branch** — where to operate
6. **Quality bars** — measurable acceptance criteria
7. **File map** — every create + modify listed up front
8. **Step-by-step execution** — numbered steps with exact commands + expected output
9. **What NOT to do** — out-of-scope guardrails
10. **When to stop and ask the user** — hard escalation gates
11. **Commit + push + report** — final wrap-up template

## Status

- [x] Session 1 prompt: written
- [x] Session 2 prompt: written
- [x] Session 3 prompt: written
- [x] Session 4 prompt: written
- [x] Session 5 prompt: written
- [x] Session 6 prompt: written

## Start here

If you're beginning Plan 2 in a fresh ZCode session, copy the contents of [`2026-07-29-plan2-session1-prompt.md`](./2026-07-29-plan2-session1-prompt.md) into your first message.