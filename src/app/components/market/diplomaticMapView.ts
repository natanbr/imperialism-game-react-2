import { countryName, relationLevel, relationOf } from "@/engine";
import { relationColor } from "@/styles/theme";
import type { GameState } from "@/types/GameState";
import { relationText } from "../diplomacy/diplomacyView";

export type InformationMode = "Relationships" | "Political status";
export const HOME_FILL = "var(--color-map-home)";
export const UNKNOWN_FILL = "var(--color-surface-sunken)";
export const POLITICAL_FILLS = {
  Peace: "var(--color-surface-raised)",
  War: "var(--color-map-war)",
  Pact: "var(--color-map-pact)",
  Alliance: "var(--color-map-alliance)",
  Empire: "var(--color-map-empire)",
};

export type Office = "Consulate" | "Embassy";
export interface DiplomaticCountry {
  id: string;
  name: string;
  fill: string;
  status: string;
  offices: Office[];
}

/** Only settled bilateral facts. An office lists its sender; unresolved orders never enter this view. */
export function diplomaticCountries(game: GameState, viewer: string, mode: InformationMode): DiplomaticCountry[] {
  const others = [...game.nations.filter(nation => nation.id !== viewer), ...game.minorNations];
  return others.map(({ id, name }) => {
    const offices: Office[] = [];
    if (mode === "Relationships") {
      const level = relationLevel(game, viewer, id);
      return level === undefined
        ? { id, name, fill: UNKNOWN_FILL, status: "No relations", offices }
        : { id, name, fill: relationColor(level), status: relationText(level), offices };
    }
    const pair = relationOf(game, viewer, id);
    if (pair?.consulates.includes(viewer)) offices.push("Consulate");
    if (pair?.embassies.includes(viewer)) offices.push("Embassy");
    const ruler = game.minorNations.find(minor => minor.id === id)?.colonyOf;
    if (ruler !== undefined) {
      return { id, name, fill: POLITICAL_FILLS.Empire, status: `Empire · Colony of ${countryName(game, ruler) ?? ruler}`, offices };
    }
    if (!pair) return { id, name, fill: UNKNOWN_FILL, status: "No relations", offices };
    const status = pair.war ? "War" : pair.alliance ? "Alliance" : pair.pact ? "Pact" : "Peace";
    return { id, name, fill: POLITICAL_FILLS[status], status, offices };
  });
}
