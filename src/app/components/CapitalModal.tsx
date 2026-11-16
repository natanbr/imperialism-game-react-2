"use client";
import React, { useCallback, useEffect, useId, useLayoutEffect, useMemo, useState } from "react";
import { useGameStore } from "../store/rootStore";
import { selectActiveNation } from "../store/selectors";
import TransportAllocationModal from "./TransportAllocationModal";
import { refusalText } from "./gameText";
import { labourView, productionCards } from "./capital/capitalView";
import { ProductionCard } from "./capital/ProductionCard";
import { LabourPanel } from "./capital/LabourPanel";
import { FreightCars } from "./capital/FreightCars";
import styles from "./capital/Capital.module.css";
import { UI_ICONS } from "./icons";
import { GameIcon } from "./GameIcon";
import { Modal } from "./Modal";
import { InkPicture } from "./art/ArtPicture";
import { CAPITOL_ART, buildingArt } from "./art/inkArt";

/**
 * FR-426: whether a scrolling column has more below its visible bottom; measured after each render, on its scroll and on
 * a window resize. A callback ref, as the columns mount only while the dialog is open.
 */
function useCutAtBottom<T extends HTMLElement>(): [(el: T | null) => void, boolean] {
  const [el, setEl] = useState<T | null>(null);
  const [cut, setCut] = useState(false);
  const measure = useCallback(() => {
    if (el) setCut(el.scrollTop + el.clientHeight < el.scrollHeight - 1);
  }, [el]);
  useLayoutEffect(measure);
  useEffect(() => {
    if (!el) return;
    el.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure);
    return () => {
      el.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
    };
  }, [el, measure]);
  return [setEl, cut];
}

/**
 * The capital: production cards, labour, training, migration and freight cars (FR-046, FR-047).
 * Every button sends one order through submitOrder; the engine decides, and a refusal shows here.
 * The title shows the capitol, and the Warehouse, Armoury and Technology buttons their buildings (FR-333); Trade and
 * Diplomacy keep their Game Icons, as the pack has no picture for them (FR-335). A column that does not fit shows its
 * scrollbar and a fade at its cut edge (FR-426); below 600 px the columns stack (FR-428).
 */
export const CapitalModal: React.FC = () => {
  const isOpen = useGameStore((s) => s.isCapitalOpen);
  const close = useGameStore((s) => s.closeCapital);
  const openWarehouse = useGameStore((s) => s.openWarehouse);
  const openMarket = useGameStore((s) => s.openMarket);
  const openDiplomacy = useGameStore((s) => s.openDiplomacy);
  const openArmoury = useGameStore((s) => s.openArmoury);
  // Regiments need provinces: the Armoury is on the continent only (FR-212)
  const hasProvinces = useGameStore((s) => s.game.provinces.length > 0);
  const submitOrder = useGameStore((s) => s.submitOrder);
  const lastRejection = useGameStore((s) => s.lastRejection);
  const game = useGameStore((s) => s.game);
  const nation = useGameStore(selectActiveNation);
  const [isAllocOpen, setAllocOpen] = useState(false);
  const titleId = useId();
  const [industryColumn, industryCut] = useCutAtBottom<HTMLElement>();
  const [sideColumn, sideCut] = useCutAtBottom<HTMLElement>();

  const cards = useMemo(() => (isOpen && nation ? productionCards(game, nation) : []), [isOpen, game, nation]);
  const labour = useMemo(() => (nation ? labourView(game, nation) : null), [game, nation]);

  if (!isOpen) return null;

  return (
    <Modal titleId={titleId} onClose={close} overlayClassName={styles.overlay} className={styles.dialog}>
        <header className={styles.header}>
          <h2 id={titleId} className={styles.title}>
            <InkPicture src={CAPITOL_ART} alt="" inline />Capital — {nation?.name ?? "Unknown"}
          </h2>
          <nav className={styles.headerButtons}>
            <button className={styles.secondaryButton} onClick={openWarehouse}>
              <InkPicture src={buildingArt("warehouse")} alt="" inline />Warehouse
            </button>
            <button className={styles.secondaryButton} onClick={openMarket}>
              <GameIcon name={UI_ICONS.market} /> Trade
            </button>
            <button className={styles.secondaryButton} onClick={openDiplomacy}>
              <GameIcon name={UI_ICONS.diplomacy} /> Diplomacy
            </button>
            {hasProvinces && (
              <button className={styles.secondaryButton} onClick={openArmoury}>
                <InkPicture src={buildingArt("armoury")} alt="" inline />Armoury
              </button>
            )}
            <button className={styles.secondaryButton} disabled title="Coming in a later milestone">
              <InkPicture src={buildingArt("university")} alt="" inline />Technology
            </button>
          </nav>
          <button className={styles.closeButton} onClick={close} aria-label="Close capital">
            <span aria-hidden="true">×</span>
          </button>
        </header>

        {lastRejection && (
          <div className={styles.refusal} role="alert" data-testid="capital-refusal">
            {refusalText(lastRejection)}
          </div>
        )}

        {nation && labour && (
          <div className={styles.body}>
            <div className={styles.column}>
              <main ref={industryColumn} className={styles.industry} aria-label="Industry">
                <h3 className={styles.panelTitle}>Industry</h3>
                <div className={styles.cards}>
                  {cards.map((card) => (
                    <ProductionCard key={card.building} card={card} nationId={nation.id} submitOrder={submitOrder} />
                  ))}
                </div>
              </main>
              {industryCut && <div className={styles.fade} aria-hidden="true" data-testid="industry-fade" />}
            </div>
            <div className={styles.column}>
              <aside ref={sideColumn} className={styles.side}>
                <LabourPanel view={labour} nationId={nation.id} submitOrder={submitOrder} />
                <FreightCars
                  nationId={nation.id}
                  capacity={nation.transportCapacity ?? 0}
                  carsOrdered={labour.carsOrdered}
                  submitOrder={submitOrder}
                  onOpenAllocations={() => setAllocOpen(true)}
                />
              </aside>
              {sideCut && <div className={styles.fade} aria-hidden="true" data-testid="side-fade" />}
            </div>
          </div>
        )}

        {isAllocOpen && <TransportAllocationModal capacity={nation?.transportCapacity ?? 0} onClose={() => setAllocOpen(false)} />}
    </Modal>
  );
};

export default CapitalModal;
