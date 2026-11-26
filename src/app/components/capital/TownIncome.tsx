import { useId } from "react";
import type { GameEvent } from "@/engine/turn/context";
import { useGameStore } from "@/store/rootStore";
import { commodityName, townReceiptText } from "../gameText";
import { selectOwnTownViews } from "../towns/townView";
import styles from "./Capital.module.css";

type TownReceipt = Extract<GameEvent, { type: "town-receipt" }>;

export function TownIncome() {
  const heading = useId();
  const towns = useGameStore(selectOwnTownViews);
  const owner = useGameStore(s => s.activeNationId);
  const provinces = useGameStore(s => s.game.provinces);
  const lastTurn = useGameStore(s => s.eventLog.at(-1));
  // A receipt belongs to its original recipient even when this province now belongs to another country.
  const receipts = lastTurn?.events.filter((event): event is TownReceipt =>
    event.type === "town-receipt" && event.nationId === owner) ?? [];
  const producing = towns.filter(town => Object.keys(town.output).length > 0);
  const provinceName = (id: string) => provinces.find(province => province.id === id)?.name ?? id;

  return (
    <section className={`${styles.panel} ${styles.townIncome}`} aria-labelledby={heading}>
      <h3 className={styles.panelTitle} id={heading}>Town income</h3>
      <h4>Next settlement · estimated output before freight</h4>
      <p className={styles.note}>Based on current routes and installed factory capacity.</p>
      {producing.length ? producing.map(town => (
        <div key={town.province.id} className={styles.townOffer}>
          <h5>{town.province.name}</h5>
          {town.chains.map(chain => {
            const { material, good } = chain;
            if (!town.output[material]) return null;
            const growth = chain.matured === 0 ? town.startup : chain.growth;
            const nextStep = chain.nextRequirement ? `Next tier requires ${chain.nextRequirement}.` : growth;
            return (
              <p key={chain.chain}>
                <strong>{town.output[material]} {commodityName(material)}{town.output[good] ? `, ${town.output[good]} ${commodityName(good)}` : ""}</strong>
                {" · "}{chain.factoryName} capacity {chain.capacity}
                {nextStep && <span className={styles.note}>{nextStep}</span>}
              </p>
            );
          })}
        </div>
      )) : <p>No town output expected.</p>}
      <h4>{lastTurn ? `Warehouse deliveries · turn ${lastTurn.turn}` : "Warehouse deliveries"}</h4>
      {receipts.length ? (
        <ul>{receipts.map(receipt => <li key={receipt.provinceId}>{townReceiptText(receipt, provinceName(receipt.provinceId))}</li>)}</ul>
      ) : <p>{lastTurn ? "No deliveries from towns." : "No resolved turn yet."}</p>}
    </section>
  );
}
