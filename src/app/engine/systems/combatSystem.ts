// The combat phase (rules 01 section 1): the marches into the nation's own provinces (FR-206), then one battle for each
// attacked province (FR-216 to FR-224), then the healing of the regiments that neither moved nor fought (FR-208). A world
// without armies (two-islands) passes unchanged and draws nothing. Battles draw only from `ctx.rngFor("combat")` (FR-227).
import type { GameState } from "@/types/GameState";
import type { CountryId, NationId, ProvinceId, RegimentId } from "@/types/Common";
import type { Regiment } from "@/types/Army";
import type { ArmyMoveIntent, AttackIntent } from "@/types/Intent";
import type { BattleFate, BattleRegiment, BattleReport } from "@/types/Battle";
import type { WarBattle } from "@/types/Diplomacy";
import { FULL_HEALTH, HEALING_PER_TURN, isMilitia } from "@/definisions/regiments";
import {
  armyAt,
  findRegiment,
  forceSize,
  holds,
  isArmyMoveIntent,
  isAttackIntent,
  mapRegiments,
  placeRegiments,
  removeRegiments,
} from "../army/armies";
import { byRegimentId, fightBattle, fortLevelOf, type BattleUnit } from "../army/combat";
import { capitalOwnerOf, fallCapital, takeProvince } from "../army/conquest";
import { validateRailDeployment } from "../army/railDeployment";
import { validateSeaDeployment } from "../navy/seaArmy";
import { warActive } from "../diplomacy/queries";
import { pairKey } from "../diplomacy/relations";
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
  via?: "rail" | "sea";
  regiments: Regiment[];
}

function canDispatch(state: GameState, intent: ArmyMoveIntent | AttackIntent, ctx: TurnContext): boolean {
  const order = { ...intent, kind: "moveArmy" as const };
  if (intent.via === "rail") return validateRailDeployment(state, order).ok;
  if (intent.via !== "sea") return true;
  const expectedOwner = intent.kind === "attack" ? intent.targetId : intent.nationId;
  const origin = armyAt(state, intent.nationId, intent.fromProvinceId);
  const present = origin?.regiments.some(r => !isMilitia(r.type) && intent.regimentIds.includes(r.id));
  const result = present && holds(state, expectedOwner, intent.toProvinceId)
    ? validateSeaDeployment(state, order, "dispatch") : { ok: false, reason: "invalid-target" } as const;
  if (result.ok) return true;
  ctx.emit({ type: "sea-deployment-failed", nationId: intent.nationId, fromProvinceId: intent.fromProvinceId,
    toProvinceId: intent.toProvinceId, reason: result.reason });
  return false;
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
    if (!canDispatch(state, intent, ctx)) continue;
    if (!holds(state, intent.nationId, intent.toProvinceId)) continue;
    for (const id of intent.regimentIds) {
      const found = findRegiment(state, id);
      if (!found || moving.has(id) || isMilitia(found.regiment.type)) continue;
      if (found.army.ownerId !== intent.nationId || found.army.provinceId !== intent.fromProvinceId) continue;
      moving.add(id);
      const key = `${intent.nationId} ${intent.fromProvinceId} ${intent.toProvinceId} ${intent.via ?? "march"}`;
      const route = routes.get(key) ?? { nationId: intent.nationId, fromProvinceId: intent.fromProvinceId,
        toProvinceId: intent.toProvinceId, via: intent.via, regiments: [] };
      route.regiments.push({ ...found.regiment, movedOnTurn: ctx.turn });
      routes.set(key, route);
    }
  }
  if (moving.size === 0) return state;
  let s = removeRegiments(state, moving);
  for (const { nationId, fromProvinceId, toProvinceId, via, regiments } of routes.values()) {
    s = placeRegiments(s, nationId, toProvinceId, regiments);
    ctx.emit({ type: "army-moved", nationId, fromProvinceId, toProvinceId, count: regiments.length, ...(via && { via }) });
  }
  return s;
}

/** A regiment ordered into an enemy province, out of its army until the battles are over. */
interface Sortie {
  nationId: NationId;
  fromProvinceId: ProvinceId;
  regiment: Regiment;
}

function waitingTroops(end: GameState, wave: Sortie[], from: ProvinceId) {
  const troops = { stayed: 0, relocated: 0, lost: 0 };
  for (const sortie of wave) {
    if (sortie.fromProvinceId !== from) continue;
    const survivor = findRegiment(end, sortie.regiment.id);
    if (!survivor) troops.lost++;
    else if (survivor.army.provinceId === from) troops.stayed++;
    else troops.relocated++;
  }
  return troops;
}

/** FR-560 ranks each non-belligerent power's entire commitment, across all origins and routes. */
function attackWaves(state: GameState, sorties: Sortie[]): Sortie[][] {
  const byNation = new Map<NationId, Sortie[]>();
  for (const sortie of sorties) {
    const group = byNation.get(sortie.nationId);
    if (group) group.push(sortie);
    else byNation.set(sortie.nationId, [sortie]);
  }
  const nations = [...byNation.keys()];
  const allied = nations.some((a, i) => nations.slice(i + 1).some(b => !warActive(state, a, b)));
  if (!allied) return [sorties]; // FR-216 simultaneous combat when no allied attacks compete.
  const arms = (group: Sortie[]) => forceSize({ regiments: group.map(x => x.regiment) });
  return [...byNation.values()].sort((a, b) => arms(b) - arms(a) || compareIds(a[0].nationId, b[0].nationId));
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
 * Resolve provinces by ID. Committed first attacks leave together; FR-560 follow-up attacks wait at
 * their origins. On a failed attack the next wave faces the surviving defenders at their current health.
 * Apply capital falls after all battles so simultaneous strikes are still decided in intentOrder.
 * Routed defenders and returning attackers are placed after the falls; the shared report lines record
 * a surrender if neither home nor a friendly neighbouring province remains.
 */
function battles(state: GameState, ctx: TurnContext): GameState {
  const attacks = byIntentOrder(state, ctx.turn, state.intents.filter(isAttackIntent));
  if (attacks.length === 0) return state;
  const taken = new Set<RegimentId>();
  const sorties = new Map<ProvinceId, Sortie[]>();
  for (const intent of attacks) {
    if (!canDispatch(state, intent, ctx)) continue;
    const target = provinceById(state, intent.toProvinceId);
    if (!target || target.ownerId === intent.nationId || !warActive(state, intent.nationId, target.ownerId)) continue;
    if (intent.via !== "sea" && !adjacentProvinces(state, intent.fromProvinceId).some((p) => p.id === target.id)) continue;
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
  const plans = [...sorties.keys()].sort(compareIds).flatMap(provinceId =>
    attackWaves(state, sorties.get(provinceId)!).map((wave, i) => ({ provinceId, wave, waiting: i > 0 })));
  // A contingent awaiting its ally's result stays at its origin until actually dispatched.
  const dispatched = new Set(plans.filter(p => !p.waiting).flatMap(p => p.wave.map(x => x.regiment.id)));
  let s = removeRegiments(state, dispatched);
  const leaving: Leaving[] = [];
  const news: (GameEvent | ((end: GameState) => GameEvent))[] = [];
  const falls: Fall[] = [];

  for (const { provinceId, wave, waiting } of plans) {
    const ownerId = provinceById(s, provinceId)!.ownerId;
    let attackers = [...wave].sort((a, b) => byRegimentId(a.regiment, b.regiment));
    if (waiting) {
      const nationId = wave[0].nationId;
      if (!warActive(s, nationId, ownerId)) {
        for (const fromProvinceId of [...new Set(wave.map(x => x.fromProvinceId))].sort(compareIds)) {
          // Its origin can fall before or after this cancellation. Count survivors after retreats.
          news.push(end => ({ type: "attack-cancelled", nationId, capturedById: ownerId, provinceId, fromProvinceId,
            troops: waitingTroops(end, wave, fromProvinceId) }));
        }
        continue;
      }
      // Its origin may itself have been fought over at an earlier battlefield this turn.
      attackers = attackers.filter(x => {
        const present = findRegiment(s, x.regiment.id);
        return present?.army.provinceId === x.fromProvinceId && present.regiment.foughtOnTurn !== turn;
      });
      if (!attackers.length) continue;
      s = removeRegiments(s, new Set(attackers.map(x => x.regiment.id)));
    }
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
    news.push({ type: "battle-resolved", ...report });
    // FR-408: each attacker's war with the defender remembers the battle and who won it
    for (const attackerId of attackerIds) {
      const won = fight.result === "attacker-won";
      s = recordBattle(s, attackerId, ownerId, { provinceId, turn, winnerId: won ? attackerId : ownerId, loserId: won ? ownerId : attackerId });
    }

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
      s = takeProvince(s, provinceId, winner, turn, (e) => news.push(e));
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
  for (const e of news) ctx.emit(typeof e === "function" ? e(s) : e);
  for (const e of fallEvents) ctx.emit(e);
  return s;
}

/** FR-408: the battle added to the war between the attacker and the defender, oldest first; nothing without a war. */
function recordBattle(s: GameState, attackerId: CountryId, defenderId: CountryId, battle: WarBattle): GameState {
  const key = pairKey(attackerId, defenderId);
  const war = s.diplomacy[key]?.war;
  if (!war) return s;
  return { ...s, diplomacy: { ...s.diplomacy, [key]: { ...s.diplomacy[key], war: { ...war, battles: [...(war.battles ?? []), battle] } } } };
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
