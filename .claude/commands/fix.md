Fix this bug in the Imperialism revival: $ARGUMENTS

Read `docs/FLOW.md` (size S or M) and the "Resuming here" block of `docs/journal.md`.
1. Reproduce with a failing test first. Paste the red summary into the journal.
2. Find the root cause, not the symptom. If this bug happened before, explain in the journal
   why it came back.
3. Smallest fix inside the files the bug needs. Implementation on Opus 5.5 high (xhigh if it
   touches the engine, store or turn loop); tests on Sonnet 5.5 high.
4. Gate: `npm test`, `npm run lint`, `npx tsc --noEmit`, `npm run build`.
5. Journal entry with the evidence table; commit on a branch; open a PR. Do not merge.
Do not ask questions; record assumptions with `Objection:` in the journal.
