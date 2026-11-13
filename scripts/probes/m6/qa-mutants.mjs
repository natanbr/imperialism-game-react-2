// M6 QA fix round: do the new tests bite? Each mutant takes back, in one source line, one behaviour of FR-236 to
// FR-241, runs the test file that guards it, and restores the file. Every mutant must make at least one test fail.
// Run from the repo root: node scripts/probes/m6/qa-mutants.mjs [part of a mutant name]. Exit code 1 when a mutant survives
// or its line is not found exactly once. The source may have CRLF line ends (Windows checkout): lines match as LF.
import { readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const SYSTEM = "src/app/engine/systems/diplomacySystem.ts";
const MODAL = "src/app/components/Modal.tsx";
const VIEW = "src/app/components/diplomacy/diplomacyView.ts";
const ENGINE_TESTS = "tests/engine/diplomacy.test.ts";
const DIALOG_TESTS = "tests/ui/dialogs.test.tsx";
const UI_TESTS = "tests/ui/diplomacyDialog.test.tsx";

const MUTANTS = [
  {
    name: "FR-236 every open dialog answers Escape, not only the top one",
    file: MODAL,
    find: "if (openDialogs[openDialogs.length - 1] !== token || e.defaultPrevented) return;",
    replace: "if (e.defaultPrevented) return;",
    tests: DIALOG_TESTS,
  },
  {
    name: "FR-236 the focus does not go back to the opener",
    file: MODAL,
    find: "if (opener?.isConnected) opener.focus();",
    replace: "",
    tests: DIALOG_TESTS,
  },
  {
    name: "FR-236 a drag that ends on the backdrop closes the dialog",
    file: MODAL,
    find: "const onBackdrop = pressedOnBackdrop.current && e.target === e.currentTarget;",
    replace: "const onBackdrop = e.target === e.currentTarget;",
    tests: DIALOG_TESTS,
  },
  {
    name: "FR-236 Tab is left to the browser (no focus trap)",
    file: MODAL,
    find: "        moveFocus(el, !e.shiftKey, last);",
    replace: "",
    tests: DIALOG_TESTS,
  },
  {
    name: "FR-236 Game over closes on Escape and the backdrop",
    file: "src/app/components/GameOverModal.tsx",
    find: "<Modal titleId={titleId} overlayClassName",
    replace: "<Modal titleId={titleId} onClose={hide} overlayClassName",
    tests: DIALOG_TESTS,
  },
  {
    name: "FR-236 Escape in the war question closes the whole dialog",
    file: "src/app/components/diplomacy/CountryDetails.tsx",
    find: "  useEscapeFirst(onKeepPeace);",
    replace: "",
    tests: UI_TESTS,
  },
  {
    name: "FR-237 one line per disabled button, not per refusal",
    file: VIEW,
    find: "    const line = lines.find((l) => l.reason === c.refusal);",
    replace: "    const line = undefined as ReasonLine | undefined;",
    tests: UI_TESTS,
  },
  {
    name: "FR-237 Arrow Down does not move in the list",
    file: "src/app/components/diplomacy/CountryList.tsx",
    find: "{ ArrowDown: at + 1, ArrowUp: at - 1, Home: 0, End: rows.length - 1 }",
    replace: "{ ArrowUp: at - 1, Home: 0, End: rows.length - 1 }",
    tests: UI_TESTS,
  },
  {
    name: "FR-238 no line about the other minors",
    file: VIEW,
    find: '    warOnMinor: kind === "Minor nation",',
    replace: "    warOnMinor: false,",
    tests: UI_TESTS,
  },
  {
    name: "FR-239 only the first declaration of a war pair is named",
    file: SYSTEM,
    find: "    declarers.forEach((aggressor, i) => add(a, b, i === 0 ? WAR_RELATION.pair : 0, { aggressorId: aggressor, targetId: aggressor === a ? b : a }));",
    replace: "    add(a, b, WAR_RELATION.pair, { aggressorId: declarers[0], targetId: declarers[0] === a ? b : a });",
    tests: ENGINE_TESTS,
  },
  {
    name: "FR-239 the news line names no war",
    file: "src/app/components/gameText.ts",
    find: "      return event.wars && event.wars.length > 0 ?",
    replace: "      return false ?",
    tests: "tests/ui/gameText.test.ts",
  },
  {
    name: "FR-240 a war between the Great Powers keeps the start mark",
    file: SYSTEM,
    find: "    delete rest.startTreaties;",
    replace: "",
    tests: ENGINE_TESTS,
  },
  {
    name: "FR-240 the chips do not say since the start",
    file: VIEW,
    find: "  const fromStart = pair.startTreaties === true ? SINCE_THE_START : {};",
    replace: "  const fromStart = {};",
    tests: UI_TESTS,
  },
  {
    name: "FR-241 at war Declare war keeps FR-162's text",
    file: VIEW,
    find: '      return o === "war" && pair?.war && c.refusal === REFUSAL_TEXT["already-in-place"] ? { ...c, refusal: ALREADY_AT_WAR } : c;',
    replace: "      return c;",
    tests: UI_TESTS,
  },
  // The review of the QA fix round (QA review F1 to F4): the rows added for it bite too
  {
    name: "QA review F1 Tab from the war question or a disabled control starts at the top",
    file: MODAL,
    find: "  if (index === -1 && active && active !== dialog && dialog.contains(active)) {",
    replace: "  if (false) {",
    tests: UI_TESTS,
  },
  {
    name: "QA review F2 the next offer leaves the focus where the click left it (no focusKey)",
    file: "src/app/components/AcceptOfferModal.tsx",
    find: "      focusKey={proposal.id}",
    replace: "",
    tests: DIALOG_TESTS,
  },
  {
    name: "QA review F2 a dialog that focuses itself (Accept Offer) does not give the focus back",
    file: MODAL,
    find: "if (opener?.isConnected) opener.focus();",
    replace: 'if (opener?.isConnected && initialFocus !== "dialog") opener.focus();',
    tests: DIALOG_TESTS,
  },
  {
    name: "QA review F2 a dialog without a close (Game over) does not give the focus back",
    file: MODAL,
    find: "if (opener?.isConnected) opener.focus();",
    replace: "if (opener?.isConnected && handlers.current.onClose) opener.focus();",
    tests: DIALOG_TESTS,
  },
  {
    name: "QA review F3 Escape closes the dialog while the war question is open",
    file: MODAL,
    find: "const act = escapeFirst.current[escapeFirst.current.length - 1] ?? handlers.current.onEscape ?? handlers.current.onClose;",
    replace: "const act = handlers.current.onEscape ?? handlers.current.onClose;",
    tests: UI_TESTS,
  },
  {
    name: "QA review F4 after an order took the focus away, Tab starts at the top",
    file: MODAL,
    find: "  if (!(active && dialog.contains(active)) && last) {",
    replace: "  if (false) {",
    tests: UI_TESTS,
  },
  {
    name: "QA review F4 after an order removed the focused control, Tab starts at the top",
    file: MODAL,
    find: "    } else if (last.index >= 0) {",
    replace: "    } else if (false) {",
    tests: UI_TESTS,
  },
];

// The argument picks the mutants whose name contains it ("QA review" runs the review round's)
const only = process.argv[2];
let bad = 0;
for (const m of MUTANTS.filter((x) => !only || x.name.includes(only))) {
  const raw = readFileSync(m.file, "utf8");
  const source = raw.replace(/\r\n/g, "\n");
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
    writeFileSync(m.file, raw);
  }
  const text = `${out.stdout}${out.stderr}`.replace(/\x1b\[[0-9;]*m/g, "");
  const failed = text.match(/Tests\s+(\d+) failed/);
  const summary = (text.match(/Tests\s+[^\n]*\(\d+\)/) ?? ["no summary"])[0].trim();
  console.log(`${failed ? "caught  " : "SURVIVED"}  ${m.name}: ${summary}`);
  if (!failed) bad += 1;
}
process.exit(bad > 0 ? 1 : 0);
