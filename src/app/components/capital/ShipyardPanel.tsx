import { SHIPS, SHIP_TYPES } from "@/definisions/ships";
import { validateOrder, type Order } from "@/engine";
import { owns } from "@/engine/orders/queries";
import type { GameState } from "@/types/GameState";
import type { Nation } from "@/types/Nation";
import { MaterialType } from "@/types/Resource";
import { InkPicture } from "../art/ArtPicture";
import { buildingArt } from "../art/inkArt";
import { REFUSAL_TEXT } from "../gameText";
import { Stepper } from "../market/Stepper";
import styles from "./Capital.module.css";

interface Props {
  game: GameState;
  nation: Nation;
  submitOrder: (order: Order) => void;
}

export function ShipyardPanel({ game, nation, submitOrder }: Props) {
  const lumber = nation.warehouse[MaterialType.Lumber] ?? 0;
  const fabric = nation.warehouse[MaterialType.Fabric] ?? 0;
  return (
    <section className={styles.panel} aria-label="Shipyard">
      <h3 className={styles.panelTitle}><InkPicture src={buildingArt("shipyard")} alt="" inline className={styles.buildingPicture} />Shipyard</h3>
      <span className={styles.note} data-testid="shipyard-stock">In warehouse: {lumber} lumber, {fabric} fabric</span>
      <ul className={styles.orderRows}>
        {SHIP_TYPES.map(ship => {
          const def = SHIPS[ship];
          if (def.requiredTechnology && !owns(game, nation.id, def.requiredTechnology)) return null;
          const count = nation.merchantMarine.pendingShips?.[ship] ?? 0;
          const order = (n: number) => ({ kind: "setShipyard", nationId: nation.id, ship, count: n } as const);
          const result = validateOrder(game, order(count + 1));
          let reason: string | undefined;
          if (!result.ok) {
            reason = result.reason === "insufficient-resources"
              ? (lumber < def.lumber ? `Needs ${def.lumber} lumber (${lumber})` : `Needs ${def.fabric} fabric (${fabric})`)
              : REFUSAL_TEXT[result.reason];
          }
          return (
            <li key={ship} className={styles.orderRow}>
              <strong>{def.name} · {def.holds} holds</strong>
              <span className={styles.note}>{def.lumber} lumber · {def.fabric} fabric</span>
              <Stepper label="Build" name={def.name} value={count} testId={`shipyard-${ship}`} onChange={n => submitOrder(order(n))} moreRefusal={reason} note={reason ? { text: reason, tone: "refusal" } : undefined} />
            </li>
          );
        })}
      </ul>
      <span className={styles.note}>New holds are available for trade next turn.</span>
    </section>
  );
}
