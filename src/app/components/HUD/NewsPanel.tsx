import React, { useId } from "react";
import { useGameStore } from "@/store/rootStore";
import { dateText, newsItems, refusalText } from "../gameText";

/**
 * The last refused order and the news of the last resolved turn (FR-024): the player's lines first,
 * then each other nation's lines under its name (FR-107). The lines are their own scroll region (FR-268): it fills the
 * HUD's space left above the fade (FR-235) in whole lines, so no line is cut behind the fade, and Tab reaches it.
 * A battle's line is a button that opens its Battle screen (FR-232), a Council meeting's line one that opens its Council
 * screen (FR-297).
 */
export const NewsPanel: React.FC = () => {
  const lastRejection = useGameStore((s) => s.lastRejection);
  const lastReport = useGameStore((s) => s.eventLog[s.eventLog.length - 1]);
  const activeNationId = useGameStore((s) => s.activeNationId);
  const nations = useGameStore((s) => s.game.nations);
  const minorNations = useGameStore((s) => s.game.minorNations);
  const provinces = useGameStore((s) => s.game.provinces);
  const showBattle = useGameStore((s) => s.showBattle);
  const showCouncil = useGameStore((s) => s.showCouncil);
  const headingId = useId();

  // Great Powers and minor nations: diplomacy lines name both (FR-176); a march names its provinces (FR-209).
  const nameOf = (id: string) =>
    nations.find((n) => n.id === id)?.name ?? minorNations.find((m) => m.id === id)?.name ?? provinces.find((p) => p.id === id)?.name ?? id;
  const news = lastReport ? newsItems(lastReport.events, activeNationId, nameOf) : [];

  return (
    <div className="news-panel" data-testid="news-panel">
      {lastRejection && (
        <div role="status" data-testid="order-refusal" className="news-refusal">
          {refusalText(lastRejection)}
        </div>
      )}
      {lastReport && (
        <>
          {/* FR-280: the news are the last resolved turn's, so the heading names it beside the HUD's current turn */}
          <h3 id={headingId} className="news-heading">
            News from last turn (turn {lastReport.turn}, {dateText(lastReport.turn, lastReport.year)})
          </h3>
          {news.length > 0 ? (
            <div className="news-scroll">
              {/* A scroll region the keyboard can reach (Tab, then the arrow keys, Page Down, End) */}
              <ul className="news-list" tabIndex={0} aria-labelledby={headingId} data-testid="news-list">
                {news.map((item, i) => {
                  const { battle, council } = item;
                  return (
                    <li key={i}>
                      {battle ? (
                        <button type="button" className="news-battle" onClick={() => showBattle(battle)}>
                          {item.text}
                        </button>
                      ) : council ? (
                        <button type="button" className="news-battle" onClick={() => showCouncil(council)}>
                          {item.text}
                        </button>
                      ) : (
                        item.text
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : (
            <div>Nothing to report.</div>
          )}
        </>
      )}
    </div>
  );
};
