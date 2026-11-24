import React, { useId, useMemo, useState } from "react";
import { useGameStore } from "@/store/rootStore";
import { nationColor } from "@/styles/theme";
import { Modal } from "../Modal";
import { NationSwatch } from "../NationSwatch";
import { councilForecastText, DASHBOARD_SECTIONS, dashboardCards, type DashboardCard, type DashboardSectionId } from "./dashboardView";
import { DetailsGroupContent } from "./HudGroups";
import styles from "./Dashboard.module.css";

const NationCard: React.FC<{ card: DashboardCard; section: Exclude<DashboardSectionId, "details"> }> = ({ card, section }) => {
  const headingId = useId();
  return (
    <section
      className={styles.card}
      aria-labelledby={headingId}
      data-testid={`dashboard-card-${card.nationId}`}
      style={{ "--nation-colour": nationColor(card.colorSlot) } as React.CSSProperties}
    >
      <h3 id={headingId} className={styles.cardTitle}>
        <NationSwatch slot={card.colorSlot} />
        {card.name}
        <span className={styles.who}>{card.isPlayer ? "(you)" : "(computer)"}</span>
      </h3>
      <dl className={styles.lines}>
        {card.sections[section].map((line) => (
          <div key={line.term} className={styles.line}>
            <dt>{line.term}</dt>
            <dd data-testid={line.testId}>{line.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
};

/**
 * FR-562: the Demo level's debug dashboard, a modal dialog over the page (FR-236) opened from the top bar's Dashboard
 * button. One card per Great Power in its nation colour (FR-097), the player's first, and a row of section buttons
 * (aria-pressed, no drop-downs). Bug report holds Details for bug reports (FR-476), which leaves the right pane on Demo.
 * It reads the game and builds no order (NR-037: the computer's view stays FR-497's).
 */
export const DebugDashboard: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const game = useGameStore((s) => s.game);
  const playerId = useGameStore((s) => s.activeNationId);
  const [section, setSection] = useState<DashboardSectionId>("economy");
  const titleId = useId();
  const cards = useMemo(() => dashboardCards(game, playerId), [game, playerId]);
  const forecast = useMemo(() => (section === "council" ? councilForecastText(game, playerId) : undefined), [section, game, playerId]);
  const label = DASHBOARD_SECTIONS.find((s) => s.id === section)?.label;

  return (
    <Modal titleId={titleId} onClose={onClose} overlayClassName="about-overlay" className={styles.dialog} portal>
      <header className={styles.header}>
        <h2 id={titleId}>Dashboard</h2>
        <span className={styles.note}>Demo level: every nation&apos;s numbers, this turn</span>
        <button type="button" className="icon-button" onClick={onClose} aria-label="Close dashboard">
          <span aria-hidden="true">×</span>
        </button>
      </header>
      <div className={styles.sections} role="group" aria-label="Dashboard sections">
        {DASHBOARD_SECTIONS.map((s) => (
          <button key={s.id} type="button" className={`btn btn-plain btn-sm ${styles.sectionButton}`} aria-pressed={s.id === section} onClick={() => setSection(s.id)}>
            {s.label}
          </button>
        ))}
      </div>
      {/* Only this part scrolls, so the title and the section buttons stay in view; a Tab stop, so the keys scroll it */}
      <div className={styles.body} role="region" aria-label={label} tabIndex={0}>
        {section === "details" ? (
          <div className={`hud-debug-section ${styles.details}`}>
            <h3 className={styles.detailsTitle}>Details for bug reports</h3>
            <DetailsGroupContent />
          </div>
        ) : (
          <>
            {forecast && (
              <p className={styles.forecast} data-testid="dashboard-council-forecast">
                {forecast}
              </p>
            )}
            <div className={styles.cards}>
              {cards.map((card) => (
                <NationCard key={card.nationId} card={card} section={section} />
              ))}
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};
