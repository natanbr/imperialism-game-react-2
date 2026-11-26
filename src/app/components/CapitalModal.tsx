"use client";
import React, { useCallback, useEffect, useId, useLayoutEffect, useMemo, useState } from "react";
import { useGameStore } from "../store/rootStore";
import { selectActiveNation, selectFoodForecast } from "../store/selectors";
import TransportAllocationModal from "./TransportAllocationModal";
import { labourView, productionCards, tradeSchoolCosts } from "./capital/capitalView";
import { ProductionCard } from "./capital/ProductionCard";
import { LabourBar, TradeSchoolPanel } from "./capital/LabourPanel";
import { FreightCars } from "./capital/FreightCars";
import { TownIncome } from "./capital/TownIncome";
import { UniversityPanel } from "./capital/UniversityPanel";
import { ShipyardPanel } from "./capital/ShipyardPanel";
import { TechnologyButton } from "./TechnologyModal";
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
    setCut(!!el && el.scrollTop + el.clientHeight < el.scrollHeight - 1);
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

type SectionId = "industry" | "tradeSchool" | "transport" | "university" | "shipyard";

/**
 * FR-565: the Capital's sections, one open at a time, in this order on the left (FR-566); Industry opens first. FR-572: the
 * Capitol's recruiting is part of the Trade School, so five sections (were six).
 */
const SECTIONS: readonly { id: SectionId; name: string; art: string }[] = [
  { id: "industry", name: "Industry", art: buildingArt("steelMill") },
  { id: "tradeSchool", name: "Trade School", art: buildingArt("tradeSchool") },
  { id: "transport", name: "Transport", art: buildingArt("railyard") },
  { id: "university", name: "University", art: buildingArt("university") },
  { id: "shipyard", name: "Shipyard", art: buildingArt("shipyard") },
];

/**
 * The capital: production cards, labour, training, migration and freight cars (FR-046, FR-047).
 * Every button sends one order through submitOrder; the engine decides, and a refusal shows as a toast (FR-569).
 * The title shows the capitol, and the Warehouse, Armoury and Technology buttons their buildings (FR-333); Trade and
 * Diplomacy keep their Game Icons, as the pack has no picture for them (FR-335).
 * FR-565: one section open at a time, chosen with disclosure buttons (aria-expanded, aria-controls); the closed ones stay
 * mounted and `hidden`, so their pictures load. FR-566: the city's labour bar, the HUD of the city, stays in view above
 * the sections whichever is open, so the cards get the dialog's full width (four to a row at 1366 px). The open section
 * shows its scrollbar and a fade at its cut edge when it does not fit (FR-426); below 600 px the body scrolls as one and
 * the bar follows the sections (FR-428).
 */
export const CapitalModal: React.FC = () => {
  const isOpen = useGameStore((s) => s.isCapitalOpen);
  // Mounted only while open, so each opening starts on Industry (FR-565)
  return isOpen ? <CapitalDialog /> : null;
};

const CapitalDialog: React.FC = () => {
  const close = useGameStore((s) => s.closeCapital);
  const openWarehouse = useGameStore((s) => s.openWarehouse);
  const openMarket = useGameStore((s) => s.openMarket);
  const openDiplomacy = useGameStore((s) => s.openDiplomacy);
  const openArmoury = useGameStore((s) => s.openArmoury);
  // Regiments need provinces: the Armoury is on the continent only (FR-212)
  const hasProvinces = useGameStore((s) => s.game.provinces.length > 0);
  const submitOrder = useGameStore((s) => s.submitOrder);
  const game = useGameStore((s) => s.game);
  const nation = useGameStore(selectActiveNation);
  // The HUD's food warning reads the same memoised forecast, so the bar costs no second run of the turn's phases
  const food = useGameStore(selectFoodForecast);
  const [isAllocOpen, setAllocOpen] = useState(false);
  const [openSection, setOpenSection] = useState<SectionId>("industry");
  const titleId = useId();
  const sectionId = useId();
  const [sectionPanel, sectionCut] = useCutAtBottom<HTMLElement>();

  const cards = useMemo(() => (nation ? productionCards(game, nation) : []), [game, nation]);
  const labour = useMemo(() => (nation ? labourView(game, nation) : null), [game, nation]);
  const schoolCosts = useMemo(() => (nation ? tradeSchoolCosts(nation) : null), [nation]);

  const panelId = (id: SectionId) => `${sectionId}-${id}`;
  /** The open section's panel scrolls by itself and answers the fade (FR-426); the others are hidden. */
  const panelProps = (id: SectionId) => ({
    id: panelId(id),
    hidden: openSection !== id,
    ref: openSection === id ? sectionPanel : undefined,
  });

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
            <TechnologyButton />
          </nav>
          <button className={styles.closeButton} onClick={close} aria-label="Close capital">
            <span aria-hidden="true">×</span>
          </button>
        </header>

        {nation && labour && (
          <div className={styles.body} data-testid="capital-body">
            <div className={`${styles.column} ${styles.sections}`}>
              <nav className={styles.sectionBar} aria-label="Capital sections">
                {SECTIONS.map(({ id, name, art }) => (
                  <button
                    key={id}
                    type="button"
                    className={styles.sectionButton}
                    aria-expanded={openSection === id}
                    aria-controls={panelId(id)}
                    onClick={() => setOpenSection(id)}
                  >
                    <InkPicture src={art} alt="" inline className={styles.sectionPicture} />{name}
                  </button>
                ))}
              </nav>
              <main {...panelProps("industry")} className={styles.industry} aria-label="Industry">
                <div className={styles.cards}>
                  {cards.map((card) => (
                    <ProductionCard key={card.building} card={card} nationId={nation.id} submitOrder={submitOrder} />
                  ))}
                </div>
              </main>
              <div {...panelProps("tradeSchool")} className={styles.sectionPanel}>
                {schoolCosts && <TradeSchoolPanel view={labour} costs={schoolCosts} nationId={nation.id} submitOrder={submitOrder} />}
              </div>
              <div {...panelProps("transport")} className={styles.sectionPanel}>
                <FreightCars
                  nationId={nation.id}
                  capacity={nation.transportCapacity ?? 0}
                  carsOrdered={labour.carsOrdered}
                  submitOrder={submitOrder}
                  onOpenAllocations={() => setAllocOpen(true)}
                />
                {openSection === "transport" && <TownIncome />}
              </div>
              <div {...panelProps("university")} className={styles.sectionPanel}>
                <UniversityPanel game={game} nation={nation} submitOrder={submitOrder} />
              </div>
              <div {...panelProps("shipyard")} className={styles.sectionPanel}>
                <ShipyardPanel game={game} nation={nation} submitOrder={submitOrder} />
              </div>
              {sectionCut && (
                <div className={styles.fade} aria-hidden="true" data-testid={openSection === "industry" ? "industry-fade" : "section-fade"} />
              )}
            </div>
            {/* After the sections in the page, drawn above them (FR-566); below them on a phone (FR-428) */}
            <aside className={styles.side} aria-label="City">
              <LabourBar view={labour} food={food} />
            </aside>
          </div>
        )}

        {isAllocOpen && <TransportAllocationModal capacity={nation?.transportCapacity ?? 0} onClose={() => setAllocOpen(false)} />}
    </Modal>
  );
};

export default CapitalModal;
