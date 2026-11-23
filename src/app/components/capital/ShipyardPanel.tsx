import { SHIPS, SHIP_TYPES, WARSHIPS, WARSHIP_TYPES } from "@/definisions/ships";
import { validateOrder, type Order } from "@/engine";
import { owns } from "@/engine/orders/queries";
import type { GameState } from "@/types/GameState";
import type { Nation } from "@/types/Nation";
import { GoodsType, MaterialType } from "@/types/Resource";
import { InkPicture } from "../art/ArtPicture";
import { buildingArt } from "../art/inkArt";
import { REFUSAL_TEXT } from "../gameText";
import { Stepper } from "../market/Stepper";
import { FleetPanel } from "./FleetPanel";
import styles from "./Capital.module.css";

interface Props {
  game: GameState;
  nation: Nation;
  submitOrder: (order: Order) => void;
}

export function ShipyardPanel({ game, nation, submitOrder }: Props) {
  const lumber = nation.warehouse[MaterialType.Lumber] ?? 0;
  const fabric = nation.warehouse[MaterialType.Fabric] ?? 0;
  const armaments = nation.warehouse[GoodsType.Armaments] ?? 0;
  const hasProvinces = game.provinces.length > 0;
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
      {hasProvinces && (
        <>
          <h4 className={styles.fleetHeading}>Warships</h4>
          <span className={styles.note}>In warehouse: {armaments} armaments</span>
          <ul className={styles.orderRows} aria-label="Warships">
            {WARSHIP_TYPES.map(ship => {
              const def = WARSHIPS[ship];
              const count = nation.pendingWarships?.[ship] ?? 0;
              const order = (n: number) => ({ kind: "setShipyard", nationId: nation.id, ship, count: n } as const);
              const result = validateOrder(game, order(count + 1));
              const materials = [
                { name: "armaments", cost: def.armaments, stock: armaments },
                { name: "lumber", cost: def.lumber, stock: lumber },
                { name: "fabric", cost: def.fabric, stock: fabric },
              ];
              const missing = materials.filter(item => item.stock < item.cost).map(item => `${item.cost} ${item.name} (${item.stock} on hand)`);
              const reason = result.ok ? undefined : result.reason === "insufficient-resources" && missing.length > 0
                ? `Needs ${missing.join(", ")}` : REFUSAL_TEXT[result.reason];
              return (
                <li key={ship} className={`${styles.orderRow} ${styles.warshipRow}`}>
                  <strong>{def.name} · {def.armaments} ARMS</strong>
                  <div className={styles.note}>
                    <div>{materials.map(item => `${item.cost} ${item.name}`).join(" · ")}</div>
                    {count > 0 && <div>Usable on turn {game.turn + 1}.</div>}
                  </div>
                  <Stepper label="Build" name={def.name} value={count} testId={`shipyard-${ship}`} onChange={n => submitOrder(order(n))} moreRefusal={reason} note={reason ? { text: reason, tone: "refusal" } : undefined} />
                </li>
              );
            })}
          </ul>
          <FleetPanel game={game} nation={nation} submitOrder={submitOrder} />
        </>
      )}
    </section>
  );
}
