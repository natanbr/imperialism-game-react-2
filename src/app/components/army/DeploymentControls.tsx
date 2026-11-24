import { useId, useState } from "react";
import { provinceById, provincesOf, validateOrder, type Order } from "@/engine";
import { bookedArms, regimentArms } from "@/engine/army/deployment";
import { railAllowance } from "@/engine/army/railDeployment";
import { deployedFleet, firstLandingTurn, fleetArms } from "@/engine/navy/fleets";
import type { GameState } from "@/types/GameState";
import { refusalSentence } from "./armyView";
import styles from "./Army.module.css";

interface Props {
  game: GameState;
  nationId: string;
  provinceId: string;
  regimentIds: string[];
  onDeploy: (order: Order) => void;
}

export function DeploymentControls({ game, nationId, provinceId, regimentIds, onDeploy }: Props) {
  const railId = useId();
  const railReasonId = useId();
  const seaReasonId = useId();
  const [railSelection, selectRail] = useState("");
  const railTargets = provincesOf(game, nationId).filter(province => province.id !== provinceId);
  const railTarget = railTargets.find(province => province.id === railSelection) ?? railTargets[0];
  const fleet = deployedFleet(game, nationId);
  const coast = fleet?.approach && provinceById(game, fleet.approach.provinceId);
  const size = regimentArms(game, regimentIds);
  const railCapacity = railAllowance(game, nationId);

  const deploy = (via: "rail" | "sea", toProvinceId = "") => {
    const order: Order = { kind: "moveArmy", nationId, fromProvinceId: provinceId, toProvinceId, regimentIds, via };
    const validation = validateOrder(game, order);
    let reason: string | undefined;
    if (!validation.ok) {
      if (validation.reason === "game-over") reason = refusalSentence(validation.reason);
      else if (!toProvinceId) reason = "No other owned province to deploy to.";
      else if (regimentIds.length === 0) reason = "Tick the regiments to deploy first.";
      else if (via === "rail" && validation.reason === "limit-reached") reason = `Selected troops need ${size} ARMS, beyond the remaining rail allowance.`;
      else if (via === "rail" && validation.reason === "no-land-route") reason = "Rail deployment needs a destination on the same landmass.";
      else if (via === "sea" && toProvinceId === provinceId) reason = "Select troops in another port to reinforce this coast.";
      else reason = refusalSentence(validation.reason);
    }
    return { order, reason };
  };
  const rail = deploy("rail", railTarget?.id);
  const sea = deploy("sea", coast?.id);
  const seaCapacity = fleet ? fleetArms(fleet) : 0;
  const seaLabel = coast?.ownerId === nationId ? "Reinforce by sea" : "Land troops";

  return (
    <div className={styles.deployments}>
      <details className={styles.deployment}>
        <summary>Rail deployment · {bookedArms(game, nationId, "rail")} of {railCapacity} ARMS used</summary>
        <p className={styles.reason}>Deploy at End Turn. Freight cars keep their goods capacity.</p>
        <div className={styles.deploymentField}>
          <label className={styles.label} htmlFor={railId}>Rail destination</label>
          <select className={styles.select} id={railId} value={railTarget?.id ?? ""} disabled={!railTarget} onChange={event => selectRail(event.target.value)}>
            {railTargets.map(province => <option key={province.id} value={province.id}>{province.name}</option>)}
          </select>
        </div>
        <button type="button" className={styles.button} disabled={!!rail.reason} aria-describedby={rail.reason ? railReasonId : undefined} onClick={() => onDeploy(rail.order)}>Deploy by rail</button>
        {rail.reason && <p className={styles.reason} id={railReasonId}>{rail.reason}</p>}
      </details>
      <details className={styles.deployment}>
        <summary>Sea deployment{fleet && ` · ${bookedArms(game, nationId, "sea")} of ${seaCapacity} ARMS used`}</summary>
        {coast && fleet ? (
          <>
            <p className={styles.label}>{coast.name} · {size} ARMS selected</p>
            <p className={styles.reason}>
              {fleet.siteSinceTurn === undefined ? "Set a landing site in Capital → Shipyard first." : fleet.contested
                ? "The landing site is contested." : `Landing site usable from turn ${firstLandingTurn(fleet.siteSinceTurn)}. Troops depart at End Turn.`}
            </p>
            <button type="button" className={styles.button} disabled={!!sea.reason} aria-describedby={sea.reason ? seaReasonId : undefined} onClick={() => onDeploy(sea.order)}>{seaLabel}</button>
            {sea.reason && <p className={styles.reason} id={seaReasonId}>{sea.reason}</p>}
          </>
        ) : <p className={styles.reason}>Sail a squadron to the destination coast from Capital → Shipyard.</p>}
      </details>
    </div>
  );
}
