# CLAUDE.md

A web remake of the 1997 strategy game Imperialism: Next.js 15, React 19, TypeScript strict,
Zustand, Vitest, Playwright. Side project, run mostly by agents. Path alias `@/*` = `src/app/*`.

## Read before working

1. `docs/FLOW.md` — how work runs here (sizes, stages, models, evidence). Short; read it once per session.
2. `docs/journal.md` — the "Resuming here" block only.
3. `docs/REVIVAL_PLAN.md` — goals and milestones, when you need the why.
4. `docs/rules/README.md` — index of the original game's rules; then read only the topic file you need. Never read the PDF manual.
5. `docs/ARCHITECTURE.md` — how the code is built, when you change structure.

## Commands

```bash
npm run dev                 # dev server (Turbopack)
npm test                    # all unit tests once
npx vitest run <file>       # one test file
npm run lint
npx tsc --noEmit
npm run build
npx playwright test         # e2e smoke suite
```

## Rules that matter most

- Done means tested: a claim without a quoted test or command result is not done.
- The game core is headless: game logic never imports React, Zustand or the DOM. Every
  player action, human or AI, is an `Order`; the UI builds orders, it never mutates game state.
- Systems are pure `(state, ctx) => state` and never mutate their input. Randomness only
  through the seeded RNG in the context.
- No refactoring phases: refactor only inside the task that needs it, and finish it.
- Never push to `main` directly, never force-push, never skip tests or hooks.
