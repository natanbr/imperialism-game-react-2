// Armies (FR-204, decision Q33): the one home for land forces is `state.armies`, at most one army per country per
// province. Regiments that arrive in a province join their owner's army there; an army left without regiments is
// removed, so no merge order is needed.
import type { ArmyId, CountryId, ProvinceId, RegimentId } from "./Common";
import type { RegimentType } from "./Unit";

export interface Regiment {
  /** "regiment-<n>", n counting every regiment ever raised in the game: a higher id is a newer regiment (FR-202). */
  id: RegimentId;
  type: RegimentType;
  /** An ordinal per owner and type in creation order: "1st Regulars", "11th Minutemen" (FR-204). */
  name: string;
  /** 0..100. */
  health: number;
  /** The turn it last marched (FR-206); it does not heal on that turn (FR-208). Absent until it first moves. */
  movedOnTurn?: number;
  /** The turn it last fought a battle (FR-221); it does not heal on that turn (FR-208). Absent until it first fights. */
  foughtOnTurn?: number;
}

export interface Army {
  /** "army-<ownerId>-<provinceId>": one army per country per province. */
  id: ArmyId;
  /** A Great Power or a minor nation. */
  ownerId: CountryId;
  provinceId: ProvinceId;
  /** In creation order (lowest id first); never empty. */
  regiments: Regiment[];
}
