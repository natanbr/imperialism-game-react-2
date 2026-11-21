import { UNIVERSITY_FEES, UNIVERSITY_PAPER_COST, type UniversityCivilian } from "@/definisions/universityFees";
import { technologyById } from "@/definisions/technologies";
import { freeWorkersOf, validateOrder, type Order } from "@/engine";
import type { GameState } from "@/types/GameState";
import type { Nation } from "@/types/Nation";
import { MaterialType } from "@/types/Resource";
import { InkPicture } from "../art/ArtPicture";
import { buildingArt, civilianArt } from "../art/inkArt";
import { money, REFUSAL_TEXT } from "../gameText";
import { Stepper } from "../market/Stepper";
import styles from "./Capital.module.css";

interface Props {
  game: GameState;
  nation: Nation;
  submitOrder: (order: Order) => void;
}

export function UniversityPanel({ game, nation, submitOrder }: Props) {
  const paper = nation.warehouse[MaterialType.Paper] ?? 0;
  const experts = freeWorkersOf(nation, "expert");
  return (
    <section className={styles.panel} aria-label="University">
      <h3 className={styles.panelTitle}><InkPicture src={buildingArt("university")} alt="" inline className={styles.buildingPicture} />University</h3>
      <span className={styles.note} data-testid="university-stock">{money(nation.treasury)} · {paper} paper · {experts} free expert {experts === 1 ? "worker" : "workers"}</span>
      <ul className={styles.orderRows}>
        {(Object.keys(UNIVERSITY_FEES) as UniversityCivilian[]).map(type => {
          const name = type.charAt(0).toUpperCase() + type.slice(1);
          const fee = UNIVERSITY_FEES[type];
          const count = nation.university?.[type] ?? 0;
          const order = (n: number) => ({ kind: "setUniversity", civilianType: type, nationId: nation.id, count: n } as const);
          const result = validateOrder(game, order(count + 1));
          let reason: string | undefined;
          if (!result.ok) {
            if (result.reason === "insufficient-resources") reason = `Needs ${UNIVERSITY_PAPER_COST} paper (${paper})`;
            else if (result.reason === "insufficient-funds") reason = `Needs ${money(fee)} (${money(nation.treasury)})`;
            else if (result.reason === "missing-technology") reason = `Needs ${technologyById(result.techId)!.name}`;
            else reason = REFUSAL_TEXT[result.reason];
          }
          return (
            <li key={type} className={styles.orderRow}>
              <strong><InkPicture src={civilianArt(type)} alt="" inline />{name} <span className={styles.fee}>{money(fee)}</span></strong>
              <span className={styles.note}>{UNIVERSITY_PAPER_COST} paper · 1 expert worker</span>
              <Stepper label="Train" name={name} value={count} testId={`university-${type}`} onChange={n => submitOrder(order(n))} moreRefusal={reason} note={reason ? { text: reason, tone: "refusal" } : undefined} />
            </li>
          );
        })}
      </ul>
      <span className={styles.note}>New civilians appear at the capital next turn.</span>
    </section>
  );
}
