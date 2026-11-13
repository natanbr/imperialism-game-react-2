// An intent (FR-152): what an order that involves a second country leaves in the state when it is
// applied. A turn phase resolves the turn's intents together, in `intentOrder` (engine/turn/intents.ts),
// and resolveTurn leaves none of the resolved turn. M6 to M9 add the kinds (overtures, grants, trade
// policies, army moves, attacks) and narrow `kind` to their union.
import type { CountryId, NationId } from "./Common";

export interface Intent {
  /** "intent-<turn>-<n>", unique in the state. */
  id: string;
  kind: string;
  /** The Great Power whose order stored it. */
  nationId: NationId;
  /** The turn it was ordered on. */
  turn: number;
  /** The other country the order involves. */
  targetId?: CountryId;
}
