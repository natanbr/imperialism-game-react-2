// M6 review fix round: do the new guard tests bite? Each mutant puts back, in one source line, a defect a
// reviewer named (or removes behaviour a new test pins), runs the test file that guards it, and restores the
// file. Every mutant must make at least one test fail. Run from the repo root: node scripts/probes/m6/review-mutants.mjs
// A mutant name may be given to run only that one. Exit code 1 when a mutant survives or a line is not found.
import { readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const SYSTEM = "src/app/engine/systems/diplomacySystem.ts";
const ENGINE_TESTS = "tests/engine/diplomacy.test.ts";
const UI_TESTS = "tests/ui/diplomacyDialog.test.tsx";

const MUTANTS = [
  {
    name: "A-R2 the page without Accept Offer",
    file: "src/app/page.tsx",
    find: "<AcceptOfferModal />",
    replace: "",
    tests: UI_TESTS,
  },
  {
    name: "B-R1 blocker: n on a select ends the turn",
    file: "src/app/hooks/useKeyboardShortcuts.ts",
    find: "target instanceof HTMLSelectElement ||",
    replace: "",
    tests: UI_TESTS,
  },
  {
    name: "B-R1 blocker: n ends the turn under an open dialog",
    file: "src/app/hooks/useKeyboardShortcuts.ts",
    find: "if (isField(e.target) || isDialogOpen()) return;",
    replace: "if (isField(e.target)) return;",
    tests: UI_TESTS,
  },
  {
    name: "A-R4 friend/enemy of the victim among Great Powers only",
    file: SYSTEM,
    find: "const level = levelAtStart(x, target);",
    replace: "const level = isGreatPower(w, x) ? levelAtStart(x, target) : undefined;",
    tests: ENGINE_TESTS,
  },
  {
    name: "A-R5 a subsidy at war is not checked again",
    file: SYSTEM,
    find: "if (i.subsidyPercent > 0 && e.war) {",
    replace: "if (false) {",
    tests: ENGINE_TESTS,
  },
  {
    name: "A-R5 the failed trade policy's news text",
    file: "src/app/components/gameText.ts",
    find: '"trade-policy": (name) => `Trade policy for ${name}`,',
    replace: '"trade-policy": (name) => `Policy for ${name}`,',
    tests: "tests/ui/gameText.test.ts",
  },
  {
    name: "A-R6 no mutual peace",
    file: SYSTEM,
    find: "if (mutual || isMinor(w, targetId)) makePeace(w, nationId, targetId);",
    replace: "if (isMinor(w, targetId)) makePeace(w, nationId, targetId);",
    tests: ENGINE_TESTS,
  },
  {
    name: "A-R6 no mutual alliance",
    file: SYSTEM,
    find: "if (mutual) makeAlliance(w, nationId, targetId);",
    replace: "if (false) makeAlliance(w, nationId, targetId);",
    tests: ENGINE_TESTS,
  },
  {
    name: "F3 a new proposal pushed into the input's list",
    file: SYSTEM,
    find: "w.proposals = [...w.proposals, { id, fromId, toId, kind, turn: w.ctx.turn }];",
    replace: "w.proposals.push({ id, fromId, toId, kind, turn: w.ctx.turn });",
    tests: ENGINE_TESTS,
  },
  {
    name: "F3 a grant stop deletes from the input's entry",
    file: SYSTEM,
    find: "delete lockedGrants[i.nationId];",
    replace: "delete e.lockedGrants[i.nationId];",
    tests: ENGINE_TESTS,
  },
  {
    name: "B-R3 a Great Power receives the grant",
    file: SYSTEM,
    find: 'emit(w, { type: "grant-paid", nationId: i.nationId, targetId: i.targetId, amount: i.amount });',
    replace:
      'emit(w, { type: "grant-paid", nationId: i.nationId, targetId: i.targetId, amount: i.amount }); if (isGreatPower(w, i.targetId)) pay(w, i.targetId, -i.amount);',
    tests: ENGINE_TESTS,
  },
];

const only = process.argv[2];
let bad = 0;
for (const m of MUTANTS.filter((x) => !only || x.name === only)) {
  const source = readFileSync(m.file, "utf8");
  const at = source.indexOf(m.find);
  if (at < 0 || source.indexOf(m.find, at + 1) >= 0) {
    console.log(`NOT FOUND ONCE  ${m.name}`);
    bad += 1;
    continue;
  }
  writeFileSync(m.file, source.replace(m.find, m.replace));
  let out;
  try {
    out = spawnSync(`npx vitest run ${m.tests}`, { shell: true, encoding: "utf8" });
  } finally {
    writeFileSync(m.file, source);
  }
  const text = `${out.stdout}${out.stderr}`.replace(/\x1b\[[0-9;]*m/g, "");
  const failed = text.match(/Tests\s+(\d+) failed/);
  const summary = (text.match(/Tests\s+[^\n]*\(\d+\)/) ?? ["no summary"])[0].trim();
  console.log(`${failed ? "caught  " : "SURVIVED"}  ${m.name}: ${summary}`);
  if (!failed) bad += 1;
}
process.exit(bad > 0 ? 1 : 0);
