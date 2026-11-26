"use client";
import React, { useId, useMemo } from "react";
import { useGameStore } from "../store/rootStore";
import { isPortSite } from "@/engine/orders/queries";
import { parseTileIdToArray } from "@/utils/tileIdUtils";
import { WorkerType } from "@/types/Workers";
import { Modal } from "./Modal";
import { submitOrAsk } from "@/hooks/tileClickOrders";
import { InkPicture } from "./art/ArtPicture";
import { DEPOT_ART, PORT_ART, civilianArt } from "./art/inkArt";
import { costText, jobOffer, type JobOffer } from "./tileSiteText";

type Structure = "depot" | "port";

/**
 * The engineer's choice of a depot or a port on his tile; the title shows the engineer, each button its building (FR-334).
 * Under each its price and turns, and the engine's reason where it would refuse it (FR-382). A refused button stays in the
 * Tab order (aria-disabled) so its reason is read with it, and does nothing; where no port can stand at all the port's
 * line keeps only its reason, as Build Port was only offered on a port site. A choice asks before it spends (FR-383).
 */
export const ConstructionOptionsModal: React.FC = () => {
  const isOpen = useGameStore((s) => s.isConstructionModalOpen);
  const tileId = useGameStore((s) => s.constructionModalTileId);
  const workerId = useGameStore((s) => s.constructionModalWorkerId);
  const close = useGameStore((s) => s.closeConstructionModal);
  const game = useGameStore((s) => s.game);
  const activeNationId = useGameStore((s) => s.activeNationId);
  const titleId = useId();
  const depotReasonId = useId();
  const portReasonId = useId();

  const tile = useMemo(() => {
    if (!tileId) return null;
    const [x, y] = parseTileIdToArray(tileId);
    return game.map.tiles[y]?.[x] || null;
  }, [tileId, game.map.tiles]);

  if (!isOpen || !tile || !tileId || !workerId) return null;

  // The dialog opens for the engineer's own tile, so each choice is a plain start
  const offerOf = (structure: Structure, name: string) =>
    jobOffer(game, tile, { kind: "startConstruction", nationId: activeNationId, workerId, tileId, structure }, name);
  const depot = offerOf("depot", "Build Depot");
  const port = offerOf("port", "Build Port");

  const handleConstruct = (offer: JobOffer) => {
    if (offer.refusal !== undefined) return;
    close();
    submitOrAsk(offer.order);
  };

  const details = (offer: JobOffer, reasonId: string) => (
    <>
      {offer.cost && (
        <span className="job-price" data-testid="job-price">
          {costText(offer.cost)}
        </span>
      )}
      {(offer.refusal || offer.warning) && (
        <div className="job-reason" data-testid="job-reason" id={reasonId}>
          {offer.refusal ?? offer.warning}
        </div>
      )}
    </>
  );

  return (
    <Modal titleId={titleId} onClose={close} overlayClassName="construction-overlay" className="construction-dialog">
      <h2 id={titleId} className="construction-title">
        <InkPicture src={civilianArt(WorkerType.Engineer)} alt="" inline />Construction Options
      </h2>
      <div className="construction-options">
        <div className="job-offer" data-testid="job-offer">
          <button
            className="btn btn-primary"
            onClick={() => handleConstruct(depot)}
            aria-disabled={depot.refusal !== undefined ? true : undefined}
            aria-describedby={depot.refusal !== undefined ? depotReasonId : undefined}>
            <InkPicture src={DEPOT_ART} alt="" inline />{depot.name}
          </button>
          {details(depot, depotReasonId)}
        </div>
        {isPortSite(game, tile) ? (
          <div className="job-offer" data-testid="job-offer">
            <button
              className="btn btn-primary"
              onClick={() => handleConstruct(port)}
              aria-disabled={port.refusal !== undefined ? true : undefined}
              aria-describedby={port.refusal || port.warning ? portReasonId : undefined}>
              <InkPicture src={PORT_ART} alt="" inline />{port.name}
            </button>
            {details(port, portReasonId)}
          </div>
        ) : (
          <div className="job-offer" data-testid="port-offer">
            <span className="job-name">{port.name}</span>
            {details(port, portReasonId)}
          </div>
        )}
      </div>
      <button onClick={close} className="btn btn-plain construction-cancel">
        Cancel
      </button>
    </Modal>
  );
};

export default ConstructionOptionsModal;
