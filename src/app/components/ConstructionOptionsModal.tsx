"use client";
import React, { useId, useMemo } from "react";
import { useGameStore } from "../store/rootStore";
import { isPortSite } from "@/engine/orders/queries";
import { parseTileIdToArray } from "@/utils/tileIdUtils";
import { WorkerType } from "@/types/Workers";
import { Modal } from "./Modal";
import { InkPicture } from "./art/ArtPicture";
import { DEPOT_ART, PORT_ART, civilianArt } from "./art/inkArt";

/** The engineer's choice of a depot or a port on his tile; the title shows the engineer, each button its building (FR-334). */
export const ConstructionOptionsModal: React.FC = () => {
  const isOpen = useGameStore((s) => s.isConstructionModalOpen);
  const tileId = useGameStore((s) => s.constructionModalTileId);
  const workerId = useGameStore((s) => s.constructionModalWorkerId);
  const close = useGameStore((s) => s.closeConstructionModal);
  const game = useGameStore((s) => s.game);
  const activeNationId = useGameStore((s) => s.activeNationId);
  const submitOrder = useGameStore((s) => s.submitOrder);
  const titleId = useId();

  const tile = useMemo(() => {
    if (!tileId) return null;
    const [x, y] = parseTileIdToArray(tileId);
    return game.map.tiles[y]?.[x] || null;
  }, [tileId, game.map.tiles]);

  const canBuildPort = useMemo(() => {
    if (!tile) return false;
    return isPortSite(game, tile);
  }, [tile, game]);

  const handleConstruct = (kind: 'depot' | 'port') => {
    if (tileId && workerId) {
      // The dialog opens for the engineer's own tile, so this is a plain start.
      submitOrder({ kind: "startConstruction", nationId: activeNationId, workerId, tileId, structure: kind });
    }
    close();
  };

  if (!isOpen || !tile) return null;

  return (
    <Modal titleId={titleId} onClose={close} overlayClassName="construction-overlay" className="construction-dialog">
      <h2 id={titleId} className="construction-title">
        <InkPicture src={civilianArt(WorkerType.Engineer)} alt="" inline />Construction Options
      </h2>
      <div className="construction-options">
        <button className="btn btn-primary" onClick={() => handleConstruct('depot')}>
          <InkPicture src={DEPOT_ART} alt="" inline />Build Depot
        </button>
        {canBuildPort && (
          <button className="btn btn-primary" onClick={() => handleConstruct('port')}>
            <InkPicture src={PORT_ART} alt="" inline />Build Port
          </button>
        )}
      </div>
      <button onClick={close} className="btn btn-plain construction-cancel">
        Cancel
      </button>
    </Modal>
  );
};

export default ConstructionOptionsModal;
