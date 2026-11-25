import { useId, useState } from "react";
import { TECHNOLOGIES, technologyById } from "@/definisions/technologies";
import { validateOrder } from "@/engine";
import { owns } from "@/engine/orders/queries";
import { buyingPower, hasOpenCredit } from "@/engine/credit/account";
import { availableTechnologies, technologyTurn } from "@/engine/technology";
import { useGameStore } from "@/store/rootStore";
import { selectActiveNation } from "@/store/selectors";
import { InkPicture } from "./art/ArtPicture";
import { buildingArt } from "./art/inkArt";
import capital from "./capital/Capital.module.css";
import { fundsNeededText, money, REFUSAL_TEXT } from "./gameText";
import { Modal } from "./Modal";
import styles from "./Technology.module.css";

export function TechnologyButton() {
  const [open, setOpen] = useState(false);
  return <>
    <button className={capital.secondaryButton} aria-haspopup="dialog" onClick={() => setOpen(true)}>
      <InkPicture src={buildingArt("university")} alt="" inline />Technology
    </button>
    {open && <TechnologyModal onClose={() => setOpen(false)} />}
  </>;
}

export function TechnologyModal({ onClose }: { onClose: () => void }) {
  const game = useGameStore(s => s.game);
  const nation = useGameStore(selectActiveNation);
  const submitOrder = useGameStore(s => s.submitOrder);
  const titleId = useId();
  if (!nation) return null;

  const pending = nation.pendingTechnologies ?? [];
  const buyable = new Set(availableTechnologies(game, nation.id).map(tech => tech.id));
  const available = TECHNOLOGIES.filter(tech => buyable.has(tech.id) || pending.includes(tech.id));
  const owned = TECHNOLOGIES.filter(tech => owns(game, nation.id, tech.id));
  const coming = TECHNOLOGIES.filter(tech => !available.includes(tech) && !owned.includes(tech));

  return (
    <Modal portal titleId={titleId} onClose={onClose} className={styles.dialog} overlayClassName={styles.overlay}>
      <header className={capital.header}>
        <h2 id={titleId} className={capital.title}><InkPicture src={buildingArt("university")} alt="" inline />Invest in Technology</h2>
        <button className={capital.closeButton} onClick={onClose} aria-label="Close technology">Close</button>
      </header>
      <div className={styles.treasury}>Treasury <strong>{money(nation.treasury)}</strong>{hasOpenCredit(nation) && ` · Buying power ${money(buyingPower(nation))}`}</div>
      <div className={styles.scroll} tabIndex={0} role="region" aria-label="Technology catalogue">
        <p>Resource improvements are already available in this build. Technology purchases unlock civilian training, the Clipper and the Oil Refinery.</p>
        <section aria-label="Available">
          <h3>Available</h3>
          {available.length === 0 && <p>No technologies available this turn.</p>}
          <ul>{available.map(tech => {
            const purchased = pending.includes(tech.id);
            const action = purchased ? "Cancel" : "Buy";
            const order = { kind: purchased ? "withdrawTechnology" : "buyTechnology", nationId: nation.id, techId: tech.id } as const;
            const result = validateOrder(game, order);
            const noteId = `${titleId}-${tech.id}`;
            return <li key={tech.id} className={styles.offer}>
              <div><strong>{tech.name}</strong><p>{tech.effect}</p>
                {purchased && <small>Ordered for next turn</small>}
                {!result.ok && <small id={noteId}>{"cost" in result ? fundsNeededText(result.cost, result.buyingPower) : REFUSAL_TEXT[result.reason]}</small>}
              </div>
              <div className={styles.action}>
                <strong>{money(tech.cost)}</strong>
                <button className={capital.secondaryButton} aria-label={`${action} ${tech.name}`} aria-describedby={!result.ok ? noteId : undefined}
                  disabled={!result.ok} onClick={() => submitOrder(order)}>{action}</button>
              </div>
            </li>;
          })}</ul>
        </section>
        <section aria-label="Owned">
          <h3>Owned</h3>
          {owned.length === 0 && <p>No technologies owned.</p>}
          <ul className={styles.owned}>{owned.map(tech => <li key={tech.id}>{tech.name}</li>)}</ul>
        </section>
        <section aria-label="Coming">
          <h3>Coming</h3>
          {coming.length === 0 && <p>No further technologies.</p>}
          <ul>{coming.map(tech => {
            const missing = tech.prerequisites.filter(id => !owns(game, nation.id, id));
            return <li key={tech.id} className={styles.upcoming}>
              <div><strong>{tech.name}</strong>{missing.length > 0 && <p>Needs {missing.map(id => technologyById(id)!.name).join(", ")}</p>}</div>
              <span>From turn {technologyTurn(game, tech.id)}</span>
            </li>;
          })}</ul>
        </section>
      </div>
    </Modal>
  );
}
