import { useId, useState } from "react";
import { capitalProvinceOf, provinceById, validateOrder, type Order } from "@/engine";
import { approachesOf, deployedFleet, firstLandingTurn, fleetArms, fleetFirepower, homeFleet, isPortClosed, pendingFleetMission, threatenedPorts } from "@/engine/navy/fleets";
import { WARSHIPS, WARSHIP_TYPES } from "@/definisions/ships";
import type { GameState } from "@/types/GameState";
import type { Nation } from "@/types/Nation";
import type { Fleet } from "@/types/Navy";
import { REFUSAL_TEXT } from "../gameText";
import styles from "./Capital.module.css";

interface Props {
  game: GameState;
  nation: Nation;
  submitOrder: (order: Order) => void;
}

function composition(fleet: Fleet) {
  return WARSHIP_TYPES.flatMap(type => {
    const count = fleet.ships.filter(ship => ship.type === type).length;
    return count > 0 ? [`${count} ${count === 1 ? WARSHIPS[type].name : WARSHIPS[type].plural}`] : [];
  }).join(", ");
}

type FleetOrder = Extract<Order, { kind: "setFleetMission" }>;

function FleetButton({ game, order, submitOrder, label }: { game: GameState; order: FleetOrder; submitOrder: Props["submitOrder"]; label: string }) {
  const reasonId = useId();
  const result = validateOrder(game, order);
  let refusal: string | undefined;
  if (!result.ok) {
    if (order.mission === "sail" && result.reason === "invalid-target") refusal = "Choose a different coast.";
    else if (order.mission === "sail" && result.reason === "invalid-site") refusal = "This coast is on disconnected waters.";
    else if (order.mission === "station" && result.reason === "already-in-place") refusal = "The squadron already has a landing site here.";
    else refusal = REFUSAL_TEXT[result.reason];
  }
  return (
    <div className={styles.fleetAction}>
      <button type="button" className={styles.secondaryButton} disabled={!!refusal} aria-describedby={refusal ? reasonId : undefined} onClick={() => submitOrder(order)}>{label}</button>
      {refusal && <span className={styles.note} id={reasonId}>{refusal}</span>}
    </div>
  );
}

export function FleetPanel({ game, nation, submitOrder }: Props) {
  const coastId = useId();
  const [chosenCoast, chooseCoast] = useState("");
  const nameOf = (id: string) => provinceById(game, id)?.name ?? id;
  const home = homeFleet(game, nation.id);
  const deployed = deployedFleet(game, nation.id);
  const squadron = deployed ?? home;
  const pending = pendingFleetMission(game, nation.id);
  const coast = deployed?.approach?.provinceId;
  const homeProvince = capitalProvinceOf(game, nation.id);
  const coasts = game.provinces.filter(province => approachesOf(game, province.id).length > 0);
  const target = coasts.find(province => province.id === chosenCoast) ?? coasts.find(province => province.id === coast) ?? coasts[0];
  const closed = threatenedPorts(game, nation.id).filter(port => isPortClosed(game, nation.id, port.provinceId, port.seaId));
  const observers = game.nations.flatMap(rival => {
    if (rival.id === nation.id) return [];
    const fleet = deployedFleet(game, rival.id);
    const approach = fleet?.approach;
    if (!fleet || !approach) return [];
    return [<li key={fleet.id}>
      {rival.name} off {nameOf(approach.provinceId)} · {fleetFirepower(fleet)} firepower
      {fleet.siteSinceTurn !== undefined && " · Landing site"}{fleet.contested && " · Contested"}
    </li>];
  });
  const order = (mission: FleetOrder["mission"], provinceId?: string): FleetOrder => ({ kind: "setFleetMission", nationId: nation.id, fleetId: squadron?.id ?? "", mission, provinceId });

  return (
    <section className={styles.fleet} aria-label="Fleet operations">
      <h4 className={styles.fleetHeading}>Fleet operations</h4>
      {squadron ? (
        <>
          <p role="status">
            {coast ? `Off ${nameOf(coast)}` : `Home berth${homeProvince ? ` in ${homeProvince.name}` : ""}`} · {composition(squadron)} · {fleetArms(squadron)} ARMS · {fleetFirepower(squadron)} firepower
          </p>
          {deployed && home && <p className={styles.note}>At home berth: {composition(home)}. These ships join the squadron when it returns.</p>}
          {deployed?.siteSinceTurn !== undefined && <p className={styles.note}>Landing site {deployed.contested ? "contested" : `usable from turn ${firstLandingTurn(deployed.siteSinceTurn)} from an open port`}.</p>}
          {pending && <p role="status" className={styles.note}>
            {pending.mission === "return" ? "Return to berth at End Turn." : pending.mission === "sail"
              ? `Sail to ${nameOf(pending.provinceId ?? "")} at End Turn.`
              : `Landing site at ${nameOf(coast ?? "")} planned. Usable on turn ${firstLandingTurn(game.turn)}.`}
          </p>}
          <div className={styles.fleetField}>
            <label htmlFor={coastId}>Destination coast</label>
            <select className={styles.fleetSelect} id={coastId} value={target?.id ?? ""} onChange={event => chooseCoast(event.target.value)}>
              {coasts.map(province => <option key={province.id} value={province.id}>{province.name}</option>)}
            </select>
          </div>
          <div className={styles.fleetActions}>
            <FleetButton game={game} order={order("sail", target?.id)} submitOrder={submitOrder} label="Sail" />
            {coast && <FleetButton game={game} order={order("station", coast)} submitOrder={submitOrder} label="Set landing site" />}
            {deployed && <FleetButton game={game} order={order("return")} submitOrder={submitOrder} label="Return to berth" />}
            {pending && <FleetButton game={game} order={order("cancel")} submitOrder={submitOrder} label="Cancel fleet order" />}
          </div>
        </>
      ) : <p className={styles.note}>Commission a warship to sail.</p>}
      {closed.length > 0 && <p role="status" className={styles.note}>
        {closed.map(port => nameOf(port.provinceId)).join(", ")} · Ports closed to embarkation and sea freight.
      </p>}
      {observers.length > 0 && <ul className={styles.fleetSightings} aria-label="Sighted squadrons">{observers}</ul>}
    </section>
  );
}
