// The worlds a new game can start on (FR-144, decision 1). "two-islands" is the v1 world, kept as the
// engine's default so every v1 baseline and fixture is unchanged; the store and app start "continent".
import type { GameMap } from "@/types/Map";
import type { MinorNation } from "@/types/MinorNation";
import type { Nation } from "@/types/Nation";
import type { Province } from "@/types/Province";
import type { WorldId } from "@/types/World";
import { continentWorld } from "./continent";
import { startWorld } from "./startWorld";

/** What a world puts on the board; newGame adds the clock, the market, the rail and the diplomacy. */
export interface World {
  map: GameMap;
  /** The Great Powers in founding order. */
  nations: Nation[];
  minorNations: MinorNation[];
  provinces: Province[];
}

/** The engine's world when `newGame` is given none. */
export const DEFAULT_WORLD: WorldId = "two-islands";

/** Every world by its key; each builder returns a new world, the same for every call. */
export const WORLDS: Readonly<Record<WorldId, () => World>> = {
  "two-islands": () => ({ ...startWorld(), minorNations: [], provinces: [] }),
  continent: continentWorld,
};

/** The world of that key; an unknown key throws an error naming the known keys (FR-144). */
export function buildWorld(id: WorldId): World {
  if (!Object.hasOwn(WORLDS, id)) throw new Error(`Unknown world "${id}"; the worlds are: ${Object.keys(WORLDS).join(", ")}`);
  return WORLDS[id]();
}
