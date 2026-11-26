import { TerrainType, type Tile } from "@/types/Tile";
import { ResourceType } from "@/types/Resource";
import React, { useEffect, useId, useRef, useState } from "react";
import { useGameStore } from "../store/rootStore";
import { Worker, WorkerStatus, WorkerType } from "@/types/Workers";
import { collectingFishHub } from "@/engine/systems/logisticsSystem";
import { PROSPECTABLE_TERRAIN_TYPES } from "@/definisions/terrainDefinitions";
import { countryName, countryOfTile, isMinorNation, provinceOf, validateOrder } from "@/engine";
import { commodityName, TERRAIN_TEXT, workerJobLabel } from "./gameText";
import { InkPicture } from "./art/ArtPicture";
import { civilianArt, goodsArt } from "./art/inkArt";
import { THEME } from "@/styles/theme";
import { submitAndSay, submitOrAsk } from "@/hooks/tileClickOrders";
import { cancelQuestion, collectionText, costText, jobNote, jobOffers, type JobOffer } from "./tileSiteText";
import { Modal } from "./Modal";

interface TileInfoPanelProps {
  selectedTile: Tile | undefined;
}

const WorkerStatusIndicator: React.FC<{ status: WorkerStatus }> = ({ status }) => {
  const color = {
    [WorkerStatus.Available]: THEME.good,
    [WorkerStatus.Moved]: THEME.warn,
    [WorkerStatus.Working]: THEME.bad,
  }[status];

  return <span style={{ marginRight: 8, color }}>●</span>;
};

/**
 * One job the selected civilian is offered (FR-381): its button, named as before and enabled only where the engine would
 * accept the order; its price (and turns) beside it; a refused one's reason in a line under it, which the button points at.
 * A job of $1,000 or more asks first (FR-383); an accepted one ends the civilian selection on the tile (FR-449).
 */
const JobOfferRow: React.FC<{ offer: JobOffer; tileId: string }> = ({ offer, tileId }) => {
  const reasonId = useId();
  return (
    <div className="job-offer" data-testid="job-offer">
      <button
        type="button"
        onClick={(e) => {
          // Not to the civilian's row, whose click selects the civilian again
          e.stopPropagation();
          submitOrAsk(offer.order, tileId);
        }}
        disabled={offer.refusal !== undefined}
        aria-describedby={offer.refusal !== undefined ? reasonId : undefined}
        className="btn btn-action">
        {offer.order.kind === "startProspecting" && <InkPicture src={civilianArt(WorkerType.Prospector)} alt="" inline />}
        {offer.name}
      </button>
      {offer.cost && (
        <span className="job-price" data-testid="job-price">
          {costText(offer.cost)}
        </span>
      )}
      {offer.refusal !== undefined && (
        <div className="job-reason" data-testid="job-reason" id={reasonId}>
          {offer.refusal}
        </div>
      )}
    </div>
  );
};

/**
 * The selected tile in the HUD. On the player's land it offers the selected civilian's jobs; another
 * country's tile, a Great Power's or a minor nation's, is shown read-only, with no control that builds
 * an order (FR-108, FR-155). On a world with provinces it names a Great Power tile's province (FR-155, FR-235).
 * A known resource shows its goods picture (FR-331), each civilian its figure and Prospect the prospector (FR-332).
 * The player's known resource says who collects it (FR-391); a fort its level (FR-388).
 */
export const TileInfoPanel: React.FC<TileInfoPanelProps> = ({ selectedTile }) => {
  const selectedWorkerId = useGameStore((s) => s.selectedWorkerId);
  const setSelectedWorkerId = useGameStore((s) => s.setSelectedWorkerId);
  const selectWorker = useGameStore((s) => s.selectWorker);
  const selectTile = useGameStore((s) => s.selectTile);
  const activeNationId = useGameStore((s) => s.activeNationId);
  const game = useGameStore((s) => s.game);
  // FR-386: the civilian whose Cancel is being asked about (component state: the question is this panel's)
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [disbanding, setDisbanding] = useState<string | null>(null);
  const cancelTitleId = useId();
  const cancelTextId = useId();
  // FR-448: the selected civilian's first job offer (else its row) scrolled into the HUD's view, above its fade; only that
  // far, so Tile Info's heading stays in sight at 1280x720 (the whole row of four offers would push it out). FR-463: from
  // the HUD's top, as an earlier selection may have left it scrolled past the heading (the capital's seventh civilian
  // row) with this offer already in view, where "nearest" alone does not scroll
  const heading = useRef<HTMLHeadingElement>(null);
  const selectedRow = useRef<HTMLLIElement>(null);
  const selectedTileId = selectedTile?.id;
  useEffect(() => {
    const hud = heading.current?.closest<HTMLElement>(".hud-content");
    if (hud) hud.scrollTop = 0;
    const row = selectedRow.current;
    (row?.querySelector('[data-testid="job-offer"]') ?? row)?.scrollIntoView?.({ block: "nearest" });
  }, [selectedWorkerId, selectedTileId]);

  // FR-315: nothing without a selection; the HUD needs that height for the news (the Council line at game over)
  if (!selectedTile) return null;

  // The country the tile belongs to, a Great Power or a minor nation, and its province (FR-155)
  const countryId = countryOfTile(game, selectedTile);
  const ownerName = countryId ? (countryName(game, countryId) ?? countryId) : undefined;
  const minor = countryId !== undefined && isMinorNation(game, countryId);
  const province = provinceOf(game, selectedTile.id);
  const isTheirs = countryId !== undefined && countryId !== activeNationId;
  const ownerText = !ownerName ? "Unclaimed" : minor ? `${ownerName} (minor nation)` : `${ownerName}${countryId === activeNationId ? " (you)" : ""}`;
  const resource = selectedTile.resource;
  const known = resource !== undefined && resource.discovered !== false;
  const fishHub = collectingFishHub(game, activeNationId, selectedTile.id);
  const geology = PROSPECTABLE_TERRAIN_TYPES.includes(selectedTile.terrain);
  const emptySite = selectedTile.prospected ? "Surveyed, no deposit" : "Not yet prospected";
  const resourceText = !resource
    ? geology ? emptySite : fishHub ? "Fish" : "None"
    : !known
      ? "Not yet prospected"
      : selectedTile.terrain === TerrainType.HorseRanch ? commodityName(resource.type) : `${commodityName(resource.type)} (L${resource.level})`;
  const collected = collectionText(game, activeNationId, selectedTile);
  const fortLevel = selectedTile.fortLevel ?? 0;

  // FR-386, FR-387: Cancel asks what comes back; Yes sends the cancel (two for a move and a job of one click), each said
  // on the map if refused, stopping at a refusal
  const cancellingWorker = cancelling ? selectedTile.workers.find((w) => w.id === cancelling) : undefined;
  const disbandingWorker = selectedTile.workers.find(w => w.id === disbanding && w.nationId === activeNationId);
  const question = disbandingWorker ? {
    title: `Disband ${disbandingWorker.type}?`,
    consequence: `The ${disbandingWorker.type} becomes an expert worker next turn. The money and paper spent on it are not returned.`,
    confirm: `Disband ${disbandingWorker.type}`,
    keep: `Keep ${disbandingWorker.type}`,
    orders: [{ kind: "disbandCivilian" as const, nationId: activeNationId, workerId: disbandingWorker.id }],
  } : cancellingWorker ? cancelQuestion(game, activeNationId, cancellingWorker, selectedTile) : undefined;
  const closeQuestion = () => {
    setCancelling(null);
    setDisbanding(null);
  };
  const confirmQuestion = () => {
    closeQuestion();
    for (const order of question?.orders ?? []) if (!submitAndSay(order).ok) break;
  };
  // FR-381: every job of the civilian's type, each as the engine would take it; past level 3 a line instead (FR-383 asks)
  const renderWorkerActions = (worker: Worker) => {
    if (worker.status !== WorkerStatus.Available || worker.pendingDisband) return null;
    const offers = jobOffers(game, activeNationId, worker, selectedTile);
    const note = jobNote(worker, selectedTile);
    if (offers.length === 0 && !note) return null;
    return (
      <div className="job-offers">
        {offers.map((offer) => (
          <JobOfferRow key={offer.name} offer={offer} tileId={selectedTile.id} />
        ))}
        {note && <p className="tile-note">{note}</p>}
      </div>
    );
  };

  return (
    <div data-testid="tile-info" style={{ padding: "8px 0", borderTop: `1px solid ${THEME.line}` }}>
      {/* FR-370: the heading's button drops the selection (Escape does too, one step at a time). tabIndex -1: a news place
          line or a Work in progress row moves the focus here (HUD/showTile.ts); no Tab stop of its own */}
      <h3 ref={heading} className="tile-info-heading" tabIndex={-1}>
        Tile Info
        <button
          type="button"
          className="icon-button"
          aria-label="Close tile info"
          title="Close tile info"
          onClick={() => {
            selectWorker(undefined);
            selectTile(undefined);
          }}
        >
          ×
        </button>
      </h3>
      {/* FR-371: the river on the terrain line, so the first civilian row fits the HUD at 1280x720 */}
      <p data-testid="tile-terrain">
        <strong>Terrain:</strong> {TERRAIN_TEXT[selectedTile.terrain] ?? selectedTile.terrain}
        {selectedTile.hasRiver && ", river"}
      </p>
      <p>
        <strong>Resource:</strong>{" "}
        {known && (
          <>
            <InkPicture src={goodsArt(resource.type)} alt="" inline />
          </>
        )}
        {!resource && fishHub && !geology && <InkPicture src={goodsArt(ResourceType.Fish)} alt="" inline />}
        {resourceText}
      </p>
      {/* FR-391: who collects the player's resource, by the logistics phase's rule */}
      {fishHub && <p>Fishing ground · 1 Fish a turn for {fishHub.kind === "capital" ? "the capital" : `the port at ${fishHub.tileId}`}.</p>}
      {collected && <p data-testid="tile-collected">{collected}</p>}
      <p data-testid="tile-owner">
        <strong>Owner:</strong> {ownerText}
      </p>
      {/* A minor is one province named after it, so its tile skips the line (FR-235) */}
      {province && !minor && (
        <p data-testid="tile-province">
          <strong>Province:</strong> {province.name}
        </p>
      )}
      {isTheirs && (
        <p className="tile-note">
          {minor
            ? `${ownerName} is a minor nation: you can watch its land, not give orders here.`
            : `${ownerName}'s land: you can watch it, not give orders here.`}
        </p>
      )}

      <div style={{ marginTop: 6 }}>
        <strong>Workers on Tile:</strong>
        {selectedTile.workers.length > 0 ? (
          <ul style={{ listStyle: "none", padding: 0, margin: 0, marginTop: 4 }}>
            {selectedTile.workers.map(w => {
              // Only the player's civilians can be picked and given orders (FR-108)
              const own = w.nationId === activeNationId;
              const showDisband = own && w.pendingDisband;
              return (
              <li key={w.id}
                ref={own && selectedWorkerId === w.id ? selectedRow : undefined}
                onClick={own ? () => setSelectedWorkerId(w.id) : undefined}
                style={{ background: own && selectedWorkerId === w.id ? THEME.surfaceSunken : 'transparent', padding: '4px', borderRadius: '4px', cursor: own ? 'pointer' : 'default' }}>
                <WorkerStatusIndicator status={showDisband ? WorkerStatus.Moved : w.status} />
                <InkPicture src={civilianArt(w.type)} alt="" inline /><span>{w.type} - {showDisband ? "Disbanding next turn" : workerJobLabel(selectedTile, w) ?? w.status}</span>
                {own && (w.status === WorkerStatus.Moved || w.status === WorkerStatus.Working) && (
                  <button
                    onClick={() => setCancelling(w.id)}
                    className="btn btn-danger"
                    style={{ marginLeft: 8, padding: '4px 8px', fontSize: 11, width: 'auto' }}>
                    Cancel
                  </button>
                )}
                {own && selectedWorkerId === w.id && renderWorkerActions(w)}
                {own && selectedWorkerId === w.id && (w.pendingDisband ? (
                  <button type="button" className="btn btn-plain" onClick={e => {
                    e.stopPropagation();
                    submitAndSay({ kind: "cancelDisbandCivilian", nationId: activeNationId, workerId: w.id });
                  }}>Undo disband</button>
                ) : validateOrder(game, { kind: "disbandCivilian", nationId: activeNationId, workerId: w.id }).ok && (
                  <button type="button" className="btn btn-plain" onClick={e => {
                    e.stopPropagation();
                    setDisbanding(w.id);
                  }}>Disband</button>
                ))}
              </li>
              );
            })}
          </ul>
        ) : (
          <p>None</p>
        )}
      </div>
      {/* FR-388: the fort the battle counts (FR-203); after the civilians, so the first civilian row stays put (FR-371) */}
      {fortLevel > 0 && (
        <p data-testid="tile-fort">
          <strong>Fort:</strong> level {fortLevel}
        </p>
      )}
      {question && (
        <Modal
          titleId={cancelTitleId}
          describedBy={cancelTextId}
          onClose={closeQuestion}
          initialFocus={disbandingWorker ? "last-control" : "first-control"}
          overlayClassName="question-overlay"
          className="question-dialog"
          portal>
          <h2 id={cancelTitleId} className="question-title">
            {question.title}
          </h2>
          <p id={cancelTextId} className="question-text">
            {question.consequence}
          </p>
          <div className="question-answers">
            <button type="button" className="btn btn-danger" onClick={confirmQuestion}>
              {question.confirm}
            </button>
            <button type="button" className="btn btn-plain" onClick={closeQuestion}>
              {question.keep}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
};
