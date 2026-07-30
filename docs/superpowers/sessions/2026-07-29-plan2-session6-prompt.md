# Plan 2 — Session 6 Prompt: Overview + E2E + CI + Handoff

> **For the agent executing this session:** Read this entire prompt before touching any code. This is the **final session of Plan 2** — its job is to glue everything together, ship the regression placeholder, update CI, and prepare the merge.

## Mission

Implement **Plan 2 — Session 6: Overview + E2E + CI + Handoff** for the HSC Study Tracker.

This session **integrates** the components built in Sessions 3, 4, and 5 into the actual Overview screen, ships a Playwright regression placeholder (gated on Plan 3), updates CI to run Functions tests, runs the final verification sweep, and opens the Plan 2 PR.

After this session:

1. An `Overview` screen renders `PaceCard` + `ExamCountdown` + `DailyPlanCard` in a responsive grid for authenticated users with a `batchId`.
2. A `tests/e2e/timer-persistence.spec.ts` Playwright test is committed as `test.skip(...)` with a clear comment explaining it's gated on Plan 3 Task 1 wiring `/__test/timer`.
3. CI (`.github/workflows/ci.yml`) runs `npm ci && npm test` in `apps/functions` as part of the `build-test` job.
4. Full verification: lint + test + build green in BOTH `apps/web` AND `apps/functions`.
5. Branch is pushed and a PR is opened against `main` titled `Plan 2: Timer + Progress + Leaderboard`.
6. A short handoff note for Plan 3 is appended to `docs/superpowers/plans/HANDOFF.md`.

## Prerequisites

- Branch `plan2/session5-leaderboard` exists with the Session 5 commit (or all 5 sessions merged into `main`).
- `useAuth` exists at `@/features/auth/AuthContext` and returns `{ user: { uid: string } | null }`.
- `useProfile` exists at `@/features/profile/useProfile` and returns `{ profile: { batchId: string | null } }`.
- `Home` route already exists from Plan 1.

## Source-of-truth plan

This session rolls up atomic tasks **T15, T16, T17, and T18** from:
`F:\Studytracker\docs\superpowers\plans\2026-07-29-timer-and-progress-plan.md`

Use the EXACT code, file paths, and test contents from those tasks.

## Skills required

- **`superpowers:test-driven-development`** — failing test FIRST (for the Overview test only).
- **`superpowers:verification-before-completion`** — BEFORE opening the PR, run the full sweep and confirm output. Evidence before assertions.
- **`superpowers:finishing-a-development-branch`** — when you reach Step 11 (handoff). This skill guides you through merge vs. PR vs. cleanup options.

Also available: `superpowers:systematic-debugging`, `superpowers:writing-skills` (NOT needed).

## Working directory

- Repo root: `F:\Studytracker`
- Web app: `F:\Studytracker\apps\web`
- Functions: `F:\Studytracker\apps\functions`

## Branch

```bash
cd F:/Studytracker
git fetch origin
git switch plan2/session5-leaderboard   # or main if Sessions 1–5 were merged
git switch -c plan2/session6-overview-handoff
```

## Quality bars

- [ ] 80% line coverage on `apps/web/src/features/home/Overview.tsx`.
- [ ] TDD discipline (Overview test first).
- [ ] One session commit: `feat(home): Overview integration + e2e placeholder + CI functions step + Plan 2 handoff`
- [ ] `npm run lint && npm test && npm run build` green in BOTH apps.
- [ ] CI workflow file parses (use `gh workflow view` or `act` if installed — otherwise just visually inspect YAML).
- [ ] PR opened against `main`.

## Files you will create

| Path | Purpose |
|---|---|
| `apps/web/src/features/home/Overview.tsx` | Glue component for PaceCard + Countdown + DailyPlanCard |
| `apps/web/tests/features/home/Overview.test.tsx` | Overview renders PaceCard label + countdown label |
| `apps/web/tests/e2e/timer-persistence.spec.ts` | Playwright placeholder (`test.skip`) |

## Files you will modify

| Path | Change |
|---|---|
| `apps/web/src/features/home/Home.tsx` (or the router) | Mount `Overview` per Plan 1's existing pattern |
| `.github/workflows/ci.yml` | Add `Functions test` step in `build-test` job |
| `docs/superpowers/plans/HANDOFF.md` | Append Plan 2 → Plan 3 handoff section |

---

## Step-by-step execution

---

### Step 1: Sanity-check

```bash
cd F:/Studytracker
git status
git branch --show-current
ls apps/web/src/features/home
ls apps/web/src/features/auth
ls apps/web/src/features/profile
```

Confirm `Home.tsx`, `AuthContext`, `useProfile` all exist. If `useProfile` is missing, STOP — Plan 1 should have created it.

---

### Step 2: Inspect Plan 1's Home routing

```bash
cd F:/Studytracker
grep -rn "Home" apps/web/src/app/ | head -10
cat apps/web/src/features/home/Home.tsx 2>/dev/null | head -50
```

You need to know whether `Home` is a route element or whether `Overview` should replace it entirely. The plan says "replace `Home` or add as nested route — your call from Plan 1" — use Plan 1's existing pattern. If `Home.tsx` is a stub, replace its body with `<Overview />`. If it's a wrapper around content sections, add `<Overview />` as the first section.

---

### Step 3: Task T16 — `Overview` component

**3a. Write the failing test FIRST.**

Create `apps/web/tests/features/home/Overview.test.tsx` with EXACT contents from plan §T16 Step 1. Mocks `useAuth` and `useBatch`. Expects both "HSC 2026" (from PaceCard label) and "Days to HSC exam" (from ExamCountdown).

**3b. Run — verify FAIL.**

```bash
cd F:/Studytracker/apps/web
npm test -- tests/features/home/Overview.test.tsx
```

**3c. Implement `apps/web/src/features/home/Overview.tsx`** with EXACT contents from plan §T16 Step 2. Key points:
- `useAuth()` for `user.uid`.
- `useProfile(user?.uid)` for `profile.batchId`.
- `todayKey()` uses `Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dhaka' })`.
- Returns `null` if not signed in or no batchId.
- Renders `<PaceCard>` + `<ExamCountdown>` + `<DailyPlanCard>` in `grid gap-4 p-4 md:grid-cols-2`.

**3d. Wire into `Home` (or router) per Plan 1's pattern.**

If `Home.tsx` is a stub, replace its body with:

```tsx
import { Overview } from './Overview';
export function Home() { return <Overview />; }
```

If `Home.tsx` is a richer layout, add `<Overview />` at the top.

**3e. Run test + build — verify PASS.**

```bash
cd F:/Studytracker/apps/web
npm test -- tests/features/home
npm run build
```

---

### Step 4: Task T15 — Playwright e2e placeholder

**4a. Confirm Playwright is set up.**

```bash
cd F:/Studytracker/apps/web
ls playwright.config.ts tests/e2e/ 2>/dev/null
cat package.json | grep -A1 '"test:e2e"\|"playwright"'
```

If `@playwright/test` is not installed OR no `playwright.config.ts` exists, STOP and ask — installing Playwright + writing this spec is out of scope for a "ship Plan 2" session. The plan itself notes the spec is gated on Plan 3 wiring `/__test/timer`.

**Decision rule**: if Playwright isn't already configured in this repo, **skip Task 15 entirely** and proceed to Task 17. Mention it in the report.

**4b. If Playwright IS configured**, create `apps/web/tests/e2e/timer-persistence.spec.ts` with the EXACT `test.skip(...)` contents from plan §T15 Step 2 (final version with the gating comment).

**4c. Verify it shows as skipped.**

```bash
cd F:/Studytracker/apps/web
npx playwright test --list
```

Expected: the test appears with `[skip]` flag.

---

### Step 5: Task T17 — CI step for Functions tests

**5a. Inspect the existing workflow.**

```bash
cd F:/Studytracker
cat .github/workflows/ci.yml | head -80
```

Find the `build-test` job (or whichever job runs `npm test` for the web app).

**5b. Add the Functions test step.**

Append (do NOT replace any existing steps):

```yaml
      - name: Functions test
        working-directory: apps/functions
        run: |
          npm ci
          npm test
```

Place it AFTER the web test step and BEFORE the web build step (so a Functions failure surfaces first, before a 5-minute web build runs).

**5c. Verify the YAML parses.**

If you have `act` installed:

```bash
cd F:/Studytracker
act --dryrun -j build-test   # or whatever the job name is
```

Otherwise visually inspect — every step should have a `- name:`, the `working-directory` should be `apps/functions`, and `run: |` should be properly indented under it.

**Do not** commit if the YAML is malformed. If you're unsure, paste the relevant block into a YAML validator or ask.

---

### Step 6: Task T18 — Handoff doc

**6a. Read the existing handoff doc.**

```bash
cd F:/Studytracker
cat docs/superpowers/plans/HANDOFF.md
```

Append a new section. Don't replace the existing content — preserve the history.

**6b. Append the Plan 2 handoff section.**

Use this template:

```markdown
---

## Plan 2 → Plan 3 Handoff (added 2026-07-29)

**Plan 2 shipped:**
- Timer core (Date.now()-anchored, persists across tab-switch, ±1 s)
- Server-anchored sessions (`sessionStart` + `processStudySession`)
- BST midnight split, presence nonces, offline queue + replay
- PaceCard (Recharts radial, 4 color states) + ExamCountdown
- Time-block CRUD + timeline UI (06:00–23:00)
- `pickDailyPlan` + `generateDailyPlan` 05:00 Asia/Dhaka cron
- DailyPlanCard widget
- Leaderboard read + 15-min RankGate + hourly rollup cron + 30d prune
- Overview integration in Home
- CI runs Functions tests
- Playwright timer-persistence spec committed as `test.skip` (needs `/__test/timer` route)

**Plan 3 must address:**
1. **Wire `/__test/timer`** — a dev-only route that mounts `TimerUI` with a mock uid so the Playwright spec can un-skip.
2. **Full BN/EN translations** — replace placeholder keys in `bn.json`.
3. **FCM notifications** — call into `users.fcmTokens` written by Plan 1's `onboardingProfile`.
4. **Chapter-tagging UI** in the timer (pass `chapterId` to `processStudySession`).
5. **Subscription + admin approval flow** + data export.
6. **PWA manifest + Workbox + Sentry + accessibility audit + privacy policy + marketing page**.
```

Adjust the dates / wording to match any drift, but the structure is locked.

---

### Step 7: Full verification sweep (this is the critical gate)

```bash
cd F:/Studytracker/apps/web
npm run lint
npm test
npm run build

cd F:/Studytracker/apps/functions
npm run lint   # only if script exists
npm test
npm run build
```

Expected:
- apps/web: lint clean, ALL tests pass (timer + rules + persistence + offline + pace + blocks + picker + leaderboard + Overview), build succeeds.
- apps/functions: test + build green.

If ANY step is red, fix it BEFORE the commit. Do not commit broken code. Use `superpowers:systematic-debugging` if needed.

Coverage check:

```bash
cd F:/Studytracker/apps/web
npm test -- --coverage
```

Expected: ≥80% lines on `src/features/timer/*`, `src/features/progress/*`, `src/features/dailyPlan/*`, `src/features/leaderboard/*`, `src/features/home/Overview.tsx`. UI components are best-effort.

---

### Step 8: Single session commit

```bash
cd F:/Studytracker
git add apps/web .github docs
git status   # verify: only Overview + e2e spec + CI + handoff changes are staged
git commit -m "feat(home): Overview integration + e2e placeholder + CI functions step + Plan 2 handoff"
```

If you skipped Task 15 (Playwright not installed), the commit message stays the same — the e2e spec just isn't part of the diff.

---

### Step 9: Push the branch

```bash
cd F:/Studytracker
git push -u origin plan2/session6-overview-handoff
```

---

### Step 10: Invoke `superpowers:finishing-a-development-branch` BEFORE opening the PR

This is a checkpoint. You should NOT auto-open the PR without the user's confirmation. Use the `Skill` tool to invoke `superpowers:finishing-a-development-branch`. It will guide you through presenting structured options (merge to main directly, open PR, leave for later).

The user's session-isolation strategy suggests opening a PR and letting them review, but ASK before doing it.

Recommended approach for this codebase:
1. Push the branch (already done in Step 9).
2. Tell the user: "Branch pushed. Plan 2 work spans 6 feature branches off `main` (or off the cumulative feature branch). Three options:
   a. Squash-merge each session branch into `main` one at a time (cleanest history).
   b. Open a single PR from `plan2/session6-overview-handoff` → `main` with all 6 commits stacked (good for one-shot review).
   c. Wait — let me review each session's diff first."
3. Wait for the user's choice.

---

### Step 11: Final report

After the user chooses (or after pushing if they pre-authorized a PR), output:

```
Session 6 complete.

Branch: plan2/session6-overview-handoff
Commit: feat(home): Overview integration + e2e placeholder + CI functions step + Plan 2 handoff

Shipped:
  ✓ Overview screen wires PaceCard + ExamCountdown + DailyPlanCard
  ✓ Playwright timer-persistence spec (test.skip, gated on Plan 3)
  ✓ CI: apps/functions test step added to build-test job
  ✓ Handoff note appended to HANDOFF.md

Verification:
  ✓ apps/web: lint + test + build all green
  ✓ apps/functions: test + build green
  ✓ Coverage ≥80% on new files
  ✓ YAML parses

Plan 2 status: ✅ ALL 6 SESSIONS COMPLETE
  Timer + Progress + Leaderboard are live in the codebase.

Next: Plan 3 (Subscription + Admin + i18n + Ship). The handoff doc in
docs/superpowers/plans/HANDOFF.md lists the 6 things Plan 3 must address first.
```

---

## What NOT to do

- ❌ Do not implement any Plan 3 work.
- ❌ Do not open the PR without the user's confirmation (use `superpowers:finishing-a-development-branch` first).
- ❌ Do not skip the verification sweep.
- ❌ Do not change the session commit message.
- ❌ Do not merge to `main` unless the user explicitly authorizes it.
- ❌ Do not edit Sessions 1–5's commits — they're history. Add new commits on top.

## When to stop and ask the user

1. `useProfile` doesn't exist or doesn't return `{ profile: { batchId } }`.
2. The existing `Home.tsx` does something complex that integrating `Overview` would break — surface the conflict and ask.
3. Playwright is not configured AND you think the spec is still valuable to commit (the plan says skip it if Playwright isn't there — so default is to skip, but flag in the report).
4. CI YAML edits would touch steps you don't fully understand (e.g., existing `uses:` actions, secret references). Ask before touching them.
5. The verification sweep fails for any reason you can't fix in a few minutes.
6. You reach Step 10 and the user hasn't told you their preference between merge/PR/wait.

This is the last session of Plan 2. Take your time on the verification step — that's the gate.