import React, { useId } from "react";
import { useGameStore } from "@/store/rootStore";
import { dateText, newsItems, tilePlaces } from "../gameText";
import { showTile } from "./showTile";
import { TIME_CONFIG } from "@/constants/gameConstants";
import { inventionNews } from "@/engine/technology";
import { NationFlag } from "../NationFlag";

/**
 * The news of the last resolved turn (FR-024; FR-569: a refused order is a toast now, components/Toasts.tsx): the player's lines first,
 * then each other nation's lines under its name (FR-107). The lines are their own scroll region (FR-268): it fills the
 * HUD's space left above the fade (FR-235) in whole lines, so no line is cut behind the fade, and Tab reaches it.
 * A battle's line is a button that opens its Battle screen (FR-232), a Council meeting's line one that opens its Council
 * screen (FR-297), a line about a tile (FR-375) one that selects the tile and scrolls it into view (FR-376) and moves the
 * focus to Tile Info (`showTile`, shared with the Work in progress rows).
 */
export const NewsPanel: React.FC = () => {
  const lastReport = useGameStore((s) => s.eventLog[s.eventLog.length - 1]);
  const activeNationId = useGameStore((s) => s.activeNationId);
  const nations = useGameStore((s) => s.game.nations);
  const minorNations = useGameStore((s) => s.game.minorNations);
  const provinces = useGameStore((s) => s.game.provinces);
  const map = useGameStore((s) => s.game.map);
  const turn = useGameStore((s) => s.game.turn);
  const turnLimit = useGameStore((s) => s.game.turnLimit);
  const showBattle = useGameStore((s) => s.showBattle);
  const showCouncil = useGameStore((s) => s.showCouncil);
  const headingId = useId();

  // Great Powers and minor nations: diplomacy lines name both (FR-176); a march names its provinces (FR-209).
  const nameOf = (id: string) =>
    nations.find((n) => n.id === id)?.name ?? minorNations.find((m) => m.id === id)?.name ?? provinces.find((p) => p.id === id)?.name ?? id;
  // FR-375: a tile line names its province ("Rail finished at 3-9 in Testland North-West.")
  const events = lastReport?.events ?? (turn === TIME_CONFIG.STARTING_TURN ? inventionNews({ turnLimit }, turn) : []);
  const news = newsItems(events, activeNationId, nameOf, tilePlaces({ map }, nameOf));

  return (
    <div className="news-panel" data-testid="news-panel">
      {(lastReport || news.length > 0) && (
        <>
          {/* FR-280: the news are the last resolved turn's, so the heading names it beside the HUD's current turn */}
          <h3 id={headingId} className="news-heading">
            {lastReport
              ? `News from last turn (turn ${lastReport.turn}, ${dateText(lastReport.turn, lastReport.year)})`
              : `News for turn ${turn}`}
          </h3>
          {news.length > 0 ? (
            <div className="news-scroll">
              {/* A scroll region the keyboard can reach (Tab, then the arrow keys, Page Down, End) */}
              <ul className="news-list" tabIndex={0} aria-labelledby={headingId} data-testid="news-list">
                {news.map((item, i) => {
                  const { battle, council, tileId, nationId } = item;
                  return (
                    <li key={i} className={nationId ? "news-flagged" : undefined}>
                      {nationId && <NationFlag nationId={nationId} />}
                      {battle ? (
                        <button type="button" className="news-battle" onClick={() => showBattle(battle)}>
                          {item.text}
                        </button>
                      ) : council ? (
                        <button type="button" className="news-battle" onClick={() => showCouncil(council)}>
                          {item.text}
                        </button>
                      ) : tileId ? (
                        <button type="button" className="news-place" onClick={() => showTile(tileId)}>
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
