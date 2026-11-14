// The combat phase (rules 01 section 1): the marches into the nation's own provinces (FR-206), then one battle for each
// attacked province (FR-216 to FR-224), then the healing of the regiments that neither moved nor fought (FR-208). A world
// without armies (two-islands) passes unchanged and draws nothing. Battles draw only from `ctx.rngFor("combat")` (FR-227).
import type { GameState } from "@/types/GameState";
import type { CountryId, NationId, ProvinceId, RegimentId } from "@/types/Common";
import type { Regiment } from "@/types/Army";
import type { BattleFate, BattleRegiment, BattleReport } from "@/types/Battle";
import { FULL_HEALTH, HEALING_PER_TURN, isMilitia } from "@/definisions/regiments";
import {
  armyAt,
  findRegiment,
  holds,
  isArmyMoveIntent,
  isAttackIntent,
  mapRegiments,
  placeRegiments,
  removeRegiments,
} from "../army/armies";
import { byRegimentId, fightBattle, fortLevelOf, type BattleUnit } from "../army/combat";
import { capitalOwnerOf, fallCapital, takeProvince } from "../army/conquest";
import { warActive } from "../diplomacy/queries";
import { adjacentProvinces, provinceById } from "../world/provinces";
import { byIntentOrder, intentOrder } from "../turn/intents";
import type { GameEvent, TurnContext, TurnSystem } from "../turn/context";

export const combatSystem: TurnSystem = (state: GameState, ctx: TurnContext): GameState => {
  if (state.armies.length === 0) return state;
  return heal(battles(march(state, ctx), ctx), ctx);
};

interface Route {
  nationId: NationId;
  fromProvinceId: ProvinceId;
  toProvinceId: ProvinceId;
  regiments: Regiment[];
}

/**
 * FR-206: every move intent into the nation's own province resolves at once (two armies may swap provinces), each
 * regiment one province, intents in `intentOrder`. Checked again when resolved: a regiment no longer in the nation's
 * army in the province it left from, or a destination the nation no longer holds, stays. The arrivals join the army
 * there, marked as moved this turn; one `army-moved` per nation and route.
 */
function march(state: GameState, ctx: TurnContext): GameState {
  const moves = byIntentOrder(state, ctx.turn, state.intents.filter(isArmyMoveIntent));
  if (moves.length === 0) return state;
  const moving = new Set<RegimentId>();
  const routes = new Map<string, Route>();
  for (const intent of moves) {
    if (!holds(state, intent.nationId, intent.toProvinceId)) continue;
    for (const id of intent.regimentIds) {
      const found = findRegiment(state, id);
      if (!found || moving.has(id) || isMilitia(found.regiment.type)) continue;
      if (found.army.ownerId !== intent.nationId || found.army.provinceId !== intent.fromProvinceId) continue;
      moving.add(id);
      const key = `${intent.nationId} ${intent.fromProvinceId} ${intent.toProvinceId}`;
      const route = routes.get(key) ?? { nationId: intent.nationId, fromProvinceId: intent.fromProvinceId, toProvinceId: intent.toProvinceId, regiments: [] };
      route.regiments.push({ ...found.regiment, movedOnTurn: ctx.turn });
      routes.set(key, route);
    }
  }
  if (moving.size === 0) return state;
  let s = removeRegiments(state, moving);
  for (const { nationId, fromProvinceId, toProvinceId, regiments } of routes.values()) {
    s = placeRegiments(s, nationId, toProvinceId, regiments);
    ctx.emit({ type: "army-moved", nationId, fromProvinceId, toProvinceId, count: regiments.length });
  }
  return s;
}

/** A regiment ordered into an enemy province, out of its army until the battles are over. */
interface Sortie {
  nationId: NationId;
  fromProvinceId: ProvinceId;
  regiment: Regiment;
}

/** A regiment leaving a battlefield (an attacker going home, a routed defender retreating), placed after every battle. */
interface Leaving {
  ownerId: CountryId;
  regiment: Regiment;
  /** Where an attacker came from; none for a retreating defender. */
  home?: ProvinceId;
  /** The province fought over: a regiment with no home to go to retreats to a province of its owner bordering it. */
  battleProvinceId: ProvinceId;
  /** Its line in the battle report, to mark "surrendered" when it has nowhere to go (FR-221). */
  line: BattleRegiment;
}

const compareIds = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

/** A capital province taken in this phase: its fall (FR-223, FR-224) waits until every battle of the phase is fought. */
interface Fall {
  fallenId: CountryId;
  provinceId: ProvinceId;
  /** The winner's place in `intentOrder`: the falls apply in that order (review F1). */
  rank: number;
}

/**
 * FR-216 to FR-224: the turn's attacks, checked again (the regiment still in the nation's army in the province it left
 * from, not militia; a war still active with the province's owner), leave their armies at once; then each attacked
 * province gets one battle, provinces in id order: the attackers are every regiment ordered into it by countries at war
 * with its owner, as one side; the defenders its owner's regiments there (militia included). The province of a won
 * battle goes to the first attacker in `intentOrder` with a standing regiment, whose survivors stay there.
 * Every battle is decided before any capital falls (review F1): a province changes hands at its battle, but the fall of
 * a capital taken in the phase (FR-223, FR-224) applies after the last battle, in the winners' `intentOrder`, to the
 * country holding that capital then; a fall whose capital is back with its owner (its conqueror fell first) is void. So
 * when both Great Powers take each other's capital in one phase, the first in `intentOrder` wins. Until then no war ends
 * and no land but the battlefields changes hands, so the sorties checked at the start are the attackers.
 * Everyone else who leaves a battlefield is placed after the falls, so a regiment fights at most once a turn: attackers go
 * back where they came from when their owner still holds it, else, like routed defenders, to the lowest-id province of
 * their owner bordering the battle; one with nowhere to go (a fallen Great Power's included) surrenders. One
 * `battle-resolved` per battle followed by the province it took, then the events of the falls.
 */
function battles(state: GameState, ctx: TurnContext): GameState {
  const attacks = byIntentOrder(state, ctx.turn, state.intents.filter(isAttackIntent));
  if (attacks.length === 0) return state;
  const taken = new Set<RegimentId>();
  const sorties = new Map<ProvinceId, Sortie[]>();
  for (const intent of attacks) {
    const target = provinceById(state, intent.toProvinceId);
    if (!target || target.ownerId === intent.nationId || !warActive(state, intent.nationId, target.ownerId)) continue;
    if (!adjacentProvinces(state, intent.fromProvinceId).some((p) => p.id === target.id)) continue;
    for (const id of intent.regimentIds) {
      const found = findRegiment(state, id);
      if (!found || taken.has(id) || isMilitia(found.regiment.type)) continue;
      if (found.army.ownerId !== intent.nationId || found.army.provinceId !== intent.fromProvinceId) continue;
      taken.add(id);
      sorties.set(target.id, [...(sorties.get(target.id) ?? []), { nationId: intent.nationId, fromProvinceId: intent.fromProvinceId, regiment: found.regiment }]);
    }
  }
  if (taken.size === 0) return state;

  const turn = ctx.turn;
  const rng = ctx.rngFor("combat");
  const rank = intentOrder(state, turn);
  const fought = (r: Regiment, health: number): Regiment => ({ ...r, health, foughtOnTurn: turn });
  let s = removeRegiments(state, taken);
  const leaving: Leaving[] = [];
  const told: { report: BattleReport; events: GameEvent[] }[] = [];
  const falls: Fall[] = [];

  for (const provinceId of [...sorties.keys()].sort(compareIds)) {
    const ownerId = provinceById(s, provinceId)!.ownerId;
    const attackers = [...sorties.get(provinceId)!].sort((a, b) => byRegimentId(a.regiment, b.regiment));
    const defenders = [...(armyAt(s, ownerId, provinceId)?.regiments ?? [])].sort(byRegimentId);
    const fortLevel = fortLevelOf(s, provinceId);
    const unit = (r: Regiment, owner: CountryId, side: "attacker" | "defender"): BattleUnit => ({ id: r.id, ownerId: owner, type: r.type, name: r.name, health: r.health, side });
    const fight = fightBattle({ units: [...attackers.map((x) => unit(x.regiment, x.nationId, "attacker")), ...defenders.map((r) => unit(r, ownerId, "defender"))], fortLevel }, rng);
    const fate = (id: RegimentId): BattleFate => (fight.health[id] === 0 ? "destroyed" : fight.routed.includes(id) ? "routed" : "standing");
    const attackerIds = rank.filter((id) => attackers.some((x) => x.nationId === id));
    const winner = fight.result === "attacker-won" ? attackerIds.find((id) => attackers.some((x) => x.nationId === id && fate(x.regiment.id) === "standing")) : undefined;

    const lines = [
      ...attackers.map((x) => reportLine(x.regiment, x.nationId, "attacker", fight.health[x.regiment.id], fate(x.regiment.id))),
      ...defenders.map((r) => reportLine(r, ownerId, "defender", fight.health[r.id], fate(r.id))),
    ];
    const lineOf = (id: RegimentId) => lines.find((l) => l.id === id)!;
    const report: BattleReport = {
      nationId: winner ?? attackerIds[0],
      provinceId,
      attackerIds,
      defenderId: ownerId,
      fortLevel,
      regiments: lines,
      rounds: fight.rounds,
      result: fight.result,
      provinceTaken: winner !== undefined,
    };
    const events: GameEvent[] = [];
    told.push({ report, events });

    for (const x of attackers) {
      const health = fight.health[x.regiment.id];
      if (health === 0 || x.nationId === winner) continue;
      leaving.push({ ownerId: x.nationId, regiment: fought(x.regiment, health), home: x.fromProvinceId, battleProvinceId: provinceId, line: lineOf(x.regiment.id) });
    }
    if (winner) {
      // FR-221: the defenders all leave the field (militia never rout, so they are destroyed); the routed retreat
      s = removeRegiments(s, new Set(defenders.map((r) => r.id)));
      for (const r of defenders.filter((d) => fate(d.id) === "routed")) {
        leaving.push({ ownerId, regiment: fought(r, fight.health[r.id]), battleProvinceId: provinceId, line: lineOf(r.id) });
      }
      if (capitalOwnerOf(s, provinceId) === ownerId) falls.push({ fallenId: ownerId, provinceId, rank: rank.indexOf(winner) });
      s = takeProvince(s, provinceId, winner, turn, (e) => events.push(e));
      const survivors = attackers.filter((x) => x.nationId === winner && fight.health[x.regiment.id] > 0);
      s = placeRegiments(s, winner, provinceId, survivors.map((x) => ({ ...fought(x.regiment, fight.health[x.regiment.id]), movedOnTurn: turn })));
    } else {
      const destroyed = new Set(defenders.filter((r) => fight.health[r.id] === 0).map((r) => r.id));
      s = removeRegiments(s, destroyed);
      const ids = new Set(defenders.map((r) => r.id));
      s = mapRegiments(s, (r) => (ids.has(r.id) ? fought(r, fight.health[r.id]) : r));
    }
  }

  // The falls, in the winners' intentOrder (a stable sort keeps the battle order between one winner's falls)
  const fallEvents: GameEvent[] = [];
  for (const fall of [...falls].sort((a, b) => a.rank - b.rank)) {
    const holderId = provinceById(s, fall.provinceId)!.ownerId;
    if (holderId !== fall.fallenId) s = fallCapital(s, fall.fallenId, holderId, turn, (e) => fallEvents.push(e));
  }

  // Everyone who left a battlefield, in battle order: home if its owner still holds it, else the lowest-id province of
  // its owner bordering the battle, else it surrenders (a fallen Great Power holds no province, FR-223)
  for (const x of leaving) {
    const to =
      x.home && holds(s, x.ownerId, x.home)
        ? x.home
        : adjacentProvinces(s, x.battleProvinceId)
            .filter((p) => p.ownerId === x.ownerId)
            .map((p) => p.id)
            .sort(compareIds)[0];
    if (to) s = placeRegiments(s, x.ownerId, to, [x.regiment]);
    else x.line.fate = "surrendered";
  }
  for (const { report, events } of told) {
    ctx.emit({ type: "battle-resolved", ...report });
    for (const e of events) ctx.emit(e);
  }
  for (const e of fallEvents) ctx.emit(e);
  return s;
}

function reportLine(r: Regiment, ownerId: CountryId, side: "attacker" | "defender", endHealth: number, fate: BattleFate): BattleRegiment {
  return { id: r.id, ownerId, type: r.type, name: r.name, side, startHealth: r.health, endHealth, fate };
}

/** FR-208 (Q32: the rate is remake): each regiment that neither moved nor fought this turn gains 10 health, up to 100. */
const heal = (state: GameState, ctx: TurnContext): GameState =>
  mapRegiments(state, (r) =>
    r.movedOnTurn === ctx.turn || r.foughtOnTurn === ctx.turn || r.health >= FULL_HEALTH
      ? r
      : { ...r, health: Math.min(FULL_HEALTH, r.health + HEALING_PER_TURN) }
  );
