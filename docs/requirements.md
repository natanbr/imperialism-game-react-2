# Requirements

Permanent ids. Format and rules: `docs/FLOW.md`. Rows are written at spec time for each
milestone; a changed requirement gets a new id and the old row says `replaced by FR-###`.

Status values: `planned`, `tested` (test exists and is green), `replaced`, `dropped`.

## Project-level (stated by Nathan, 2026-11-02)

| Id | Requirement | Status |
|---|---|---|
| NR-001 | Nathan's involvement stays low: agents run milestones unattended and test their own work. | planned |
| NR-002 | Token use is kept low: cheaper models and scripted checks first; QA reviews may be postponed to the milestone end but never skipped. | planned |
| NR-003 | Game rules are kept as a compact knowledge base so agents never re-read the PDF manual. | planned |
| NR-004 | A visual progress page (overview, detail, blockers, decisions) is kept current at every checkpoint. | planned |
| NR-005 | Gold is worth $200 and gems $500 per unit (manual values). | planned |
| NR-006 | Nation AI (v3) supports both scripted and LLM players behind one `(view) => Order[]` interface. | planned |

## M1 Headless core

_Written at the start of M1._
