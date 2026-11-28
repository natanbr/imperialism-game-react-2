import { useId, useState } from "react";
import type { GameState } from "@/types/GameState";
import { Modal } from "../Modal";
import { NO_FORCES_SEEN, scoutingView } from "./scoutingView";

interface Props {
  game: GameState;
  viewerId: string;
  provinceId: string;
}

/**
 * Tile Info's "Scouting report" on another country's province (FR-650): a button, disabled with the reason when no one of
 * ours can scout it, and the read-only report dialog it opens. Opening and closing it changes only this component's
 * state: no Order, no store write (NR-041). Nothing on the viewer's own province or without a province.
 */
export function ScoutingReport({ game, viewerId, provinceId }: Props) {
  const [open, setOpen] = useState(false);
  const reasonId = useId();
  const titleId = useId();
  const estimatorId = useId();
  const view = scoutingView(game, viewerId, provinceId);
  if (!view) return null;
  return (
    <div className="job-offers" data-testid="tile-scouting">
      <div className="job-offer">
        <button
          type="button"
          className="btn btn-plain"
          disabled={view.refusal !== undefined}
          aria-describedby={view.refusal ? reasonId : undefined}
          onClick={() => setOpen(true)}>
          Scouting report
        </button>
        {view.refusal && (
          <div className="job-reason" id={reasonId}>
            {view.refusal}
          </div>
        )}
      </div>
      {open && !view.refusal && (
        <Modal titleId={titleId} describedBy={estimatorId} onClose={() => setOpen(false)} overlayClassName="question-overlay" className="question-dialog" portal>
          <h2 id={titleId} className="question-title">
            {view.title}
          </h2>
          <div className="scouting-estimate">
            {view.forces.length > 0 ? (
              <ul aria-label="Army forces seen">
                {view.forces.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            ) : (
              <p>{NO_FORCES_SEEN}</p>
            )}
          </div>
          <p id={estimatorId} className="question-text">
            {view.estimator}
          </p>
          <div className="question-answers">
            <button type="button" className="btn btn-action" onClick={() => setOpen(false)}>
              OK
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
