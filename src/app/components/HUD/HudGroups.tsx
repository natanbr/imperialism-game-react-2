import React, { useEffect, useId, useMemo, useState } from "react";
import { useGameStore } from "@/store/rootStore";
import { selectActiveNation, selectActiveScore, selectSelectedWorkerAndTile, selectUpkeepForecast } from "@/store/selectors";
import { SAVE_VERSION } from "@/store/persistence";
import { cameraOnTileId } from "../camera";
import { ScoreTable } from "./ScoreTable";
import { CouncilProjection } from "./TurnIndicator";
import { detailLines, lastTurnTreasuryText, spentThisTurnText, upkeepForecastText, workInProgressRows } from "./hudView";

export type GroupId = "nation" | "work" | "details";
export type GroupsOpen = Record<GroupId, boolean>;
/** FR-473: every group starts closed; the HUD keeps which are open in its own state, never in the store or a save. */
export const ALL_GROUPS_CLOSED: GroupsOpen = { nation: false, work: false, details: false };

/**
 * One group (FR-473), the WAI-ARIA accordion pattern: a level-3 heading holding a native button (Enter, Space and a
 * click toggle it; the focus stays on it), and the panel, a region named by the button, `hidden` while closed so its
 * controls are out of the accessibility tree and the Tab order. Not <details>: the button is what the tests drive.
 */
const HudGroup: React.FC<{
  id: GroupId;
  title: string;
  open: boolean;
  onToggle: (id: GroupId) => void;
  panelClassName?: string;
  children: React.ReactNode;
}> = ({ id, title, open, onToggle, panelClassName, children }) => {
  const buttonId = useId();
  const panelId = useId();
  return (
    <div className="hud-group" data-testid={`hud-group-${id}`}>
      <h3 className="hud-group-heading">
        <button type="button" id={buttonId} className="hud-group-button" aria-expanded={open} aria-controls={panelId} onClick={() => onToggle(id)}>
          <span className="hud-group-chevron" aria-hidden="true" />
          {title}
        </button>
      </h3>
      <div id={panelId} role="region" aria-labelledby={buttonId} className={`hud-group-panel${panelClassName ? ` ${panelClassName}` : ""}`} hidden={!open}>
        {children}
      </div>
    </div>
  );
};

/**
 * FR-474: the nation's numbers beyond the top bar's: the Council projection (the bar's next-council line names it as its
 * description, FR-314), the score's parts as a list (FR-402), every nation's score (FR-106), the army upkeep End Turn will
 * charge, what this turn's orders spent and how the treasury moved last turn.
 */
const NationGroupContent: React.FC = () => {
  const nation = useGameStore(selectActiveNation);
  const score = useGameStore(selectActiveScore);
  const upkeep = useGameStore(selectUpkeepForecast);
  const playerId = useGameStore((s) => s.activeNationId);
  const start = useGameStore((s) => s.turnStartTreasuries?.[playerId]);
  const lastTreasuries = useGameStore((s) => s.eventLog.at(-1)?.treasuries?.[playerId]);
  const { treasury, industry, development, workInProgress } = score.points;
  const spent = spentThisTurnText(start, nation?.treasury ?? 0);
  const lastTurn = lastTurnTreasuryText(lastTreasuries);
  const parts: [string, number][] = [
    ["Treasury", treasury],
    ["Industry", industry],
    ["Development", development],
    ["Work in progress", workInProgress],
  ];
  return (
    <>
      <CouncilProjection />
      <ul className="hud-score-parts" data-testid="nation-score-parts" aria-label="Score parts">
        {parts.map(([name, points]) => (
          <li key={name}>
            {name} {points}
          </li>
        ))}
      </ul>
      <ScoreTable />
      <p data-testid="upkeep-forecast">{upkeepForecastText(upkeep)}</p>
      {spent && <p data-testid="spent-this-turn">{spent}</p>}
      {lastTurn && <p data-testid="treasury-last-turn">{lastTurn}</p>}
    </>
  );
};

/** FR-475: a row about a tile selects it (no civilian, so Tile Info shows the tile) and centres it, as a news place line (FR-376). */
function showTile(tileId: string): void {
  const { selectWorker, selectTile, moveCamera } = useGameStore.getState();
  selectWorker(undefined);
  selectTile(tileId);
  const camera = cameraOnTileId(useGameStore.getState().game, tileId);
  if (camera) moveCamera(camera.x, camera.y);
}

const WorkGroupContent: React.FC<{ rows: ReturnType<typeof workInProgressRows> }> = ({ rows }) =>
  rows.length === 0 ? (
    <p>Nothing in progress.</p>
  ) : (
    <ul className="hud-work-list" data-testid="work-in-progress">
      {rows.map((row) => (
        <li key={row.key} data-testid="work-row">
          {row.tileId ? (
            <button type="button" className="hud-work-row" onClick={() => showTile(row.tileId!)}>
              {row.text}
            </button>
          ) : (
            row.text
          )}
        </li>
      ))}
    </ul>
  );

const COPIED_MS = 2000;

/**
 * FR-476: what a bug report needs, for every player (Nathan, card Q102: not only with ?debug), and a button that copies
 * it as plain text. "Copied" shows for 2 s; a browser that refuses the clipboard shows nothing.
 */
const DetailsGroupContent: React.FC = () => {
  const game = useGameStore((s) => s.game);
  const nationId = useGameStore((s) => s.activeNationId);
  const selectedTileId = useGameStore((s) => s.selectedTileId);
  const { worker } = useGameStore(selectSelectedWorkerAndTile);
  const selectedWorkerId = useGameStore((s) => s.selectedWorkerId);
  const ordersThisTurn = useGameStore((s) => s.ordersThisTurn.length);
  const lastRefusal = useGameStore((s) => s.lastRejection?.reason);
  const zoom = useGameStore((s) => s.zoom);
  const cameraX = useGameStore((s) => s.cameraX);
  const cameraY = useGameStore((s) => s.cameraY);
  // Counts the copies, so a second copy within 2 s shows "Copied" for 2 s from then
  const [copied, setCopied] = useState(0);
  useEffect(() => {
    if (copied === 0) return;
    const timer = setTimeout(() => setCopied(0), COPIED_MS);
    return () => clearTimeout(timer);
  }, [copied]);

  const lines = detailLines({
    game,
    nationId,
    selectedTileId,
    selectedWorker: selectedWorkerId ? { id: selectedWorkerId, type: worker?.type } : undefined,
    ordersThisTurn,
    lastRefusal,
    zoom,
    camera: { x: cameraX, y: cameraY },
    saveVersion: SAVE_VERSION,
  });
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setCopied((n) => n + 1);
    } catch {
      // No clipboard, or the browser refused: no line (FR-476)
    }
  };

  return (
    <>
      {lines.map((line) => (
        <div key={line.slice(0, line.indexOf(":"))} data-testid="hud-debug-line">
          {line}
        </div>
      ))}
      <div className="hud-debug-copy">
        <button type="button" className="btn btn-plain btn-sm" onClick={copy}>
          Copy details
        </button>
        <span role="status" className="hud-debug-copied">
          {copied > 0 ? "Copied" : ""}
        </span>
      </div>
    </>
  );
};

/**
 * The right pane's three groups at its bottom (FR-473): Nation (FR-474), Work in progress with its count (FR-475) and
 * Details for bug reports (FR-476, the `.hud-debug-section` panel). Which are open is the HUD's state, passed in.
 */
export const HudGroups: React.FC<{ open: GroupsOpen; onToggle: (id: GroupId) => void }> = ({ open, onToggle }) => {
  const game = useGameStore((s) => s.game);
  const playerId = useGameStore((s) => s.activeNationId);
  const rows = useMemo(() => workInProgressRows(game, playerId), [game, playerId]);
  return (
    <div className="hud-groups" data-testid="hud-groups">
      <HudGroup id="nation" title="Nation" open={open.nation} onToggle={onToggle}>
        <NationGroupContent />
      </HudGroup>
      <HudGroup id="work" title={`Work in progress (${rows.length})`} open={open.work} onToggle={onToggle}>
        <WorkGroupContent rows={rows} />
      </HudGroup>
      {/* Trap: only while open. The server and the browser each draw a new game's seed (FR-019), so a seed line in the
          server's HTML fails hydration; every group is closed there. It also spares a re-render per scroll (the camera). */}
      <HudGroup id="details" title="Details for bug reports" open={open.details} onToggle={onToggle} panelClassName="hud-debug-section">
        {open.details && <DetailsGroupContent />}
      </HudGroup>
    </div>
  );
};
