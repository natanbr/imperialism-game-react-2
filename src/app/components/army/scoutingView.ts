// What Tile Info's Scouting report shows (FR-650; Imp1 rules 11 section 5.3), in words, from the engine's
// `scoutingReport`. No React, no store: the dialog renders this view and builds no Order.
import { countryName, provinceById, REGIMENTS, scoutingReport, type ScoutingObserver } from "@/engine";
import type { GameState } from "@/types/GameState";

export const SCOUTING_REFUSAL = "We cannot scout this province without a nearby ship or neighboring armies.";
export const NO_FORCES_SEEN = "No army forces seen.";

export interface ScoutingView {
  /** "Report on the army forces of Arvelia in the province of Arvelia": the dialog's name. */
  title: string;
  /** Why the report is unavailable (the button is disabled); absent when it can be read. */
  refusal?: string;
  /** "3 Minutemen", one line per regiment type; empty when unavailable or when no regiment is there. */
  forces: string[];
  /** "Estimated by our garrison in Testland North-East"; absent when unavailable. */
  estimator?: string;
}

function estimatorText(state: GameState, observer: ScoutingObserver): string {
  const name = provinceById(state, observer.provinceId)?.name ?? observer.provinceId;
  switch (observer.kind) {
    case "garrison":
      return `Estimated by our garrison in ${name}`;
    case "army":
      return `Estimated by our army in ${name}`;
    case "fleet":
      return `Estimated by our fleet off ${name}`;
  }
}

/** The viewer's report on another country's province; undefined on the viewer's own, an unknown or no province. */
export function scoutingView(state: GameState, viewerId: string, provinceId: string): ScoutingView | undefined {
  const report = scoutingReport(state, viewerId, provinceId);
  if (!report) return undefined;
  const province = provinceById(state, provinceId)!;
  const title = `Report on the army forces of ${countryName(state, report.ownerId) ?? report.ownerId} in the province of ${province.name}`;
  if (!report.observer) return { title, refusal: SCOUTING_REFUSAL, forces: [] };
  return {
    title,
    forces: report.forces.map((f) => `${f.count} ${REGIMENTS[f.type].name}`),
    estimator: estimatorText(state, report.observer),
  };
}
