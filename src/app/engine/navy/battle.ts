import type { Fleet, NavalBattleSide, Ship } from "@/types/Navy";
import type { Rng } from "../rng";
import { fleetFirepower } from "./fleets";

/** Q145 remake values. The manual gives ship stats but does not specify the damage or hit formula. */
export const NAVAL_BATTLE_ROUNDS = 3;
export const NAVAL_HIT_CHANCE = 0.5;
export const NAVAL_MIN_DAMAGE = 1;
export const NAVAL_REPAIR_SHARE = 0.25;

const remainingHull = (ship: Ship) => ship.hull - (ship.hullDamage ?? 0);
const byShipId = (a: Ship, b: Ship) => a.id.localeCompare(b.id);
const longestRange = (ships: Ship[]) => ships.reduce((max, ship) => Math.max(max, ship.range), 0);

/** Choose targets from the ships afloat at the start of this volley. All hits in it land together. */
function volley(gunners: Ship[], targets: Ship[], rng: Rng): Ship[] {
  if (!gunners.length) return targets;
  const damage = new Map<string, number>();
  for (const gunner of gunners) {
    const target = targets[Math.floor(rng.next() * targets.length)];
    if (rng.next() < NAVAL_HIT_CHANCE) {
      const hit = Math.max(NAVAL_MIN_DAMAGE, gunner.firepower - target.armour);
      damage.set(target.id, (damage.get(target.id) ?? 0) + hit);
    }
  }
  return targets.flatMap(target => {
    const hit = damage.get(target.id);
    if (!hit) return [target];
    if (hit >= remainingHull(target)) return [];
    return [{ ...target, hullDamage: (target.hullDamage ?? 0) + hit }];
  });
}

function sideReport(before: Ship[], after: Fleet): NavalBattleSide {
  const afloat = new Map(after.ships.map(ship => [ship.id, remainingHull(ship)]));
  return {
    nationId: after.ownerNationId, firepower: fleetFirepower(after),
    ships: before.map(ship => ({ id: ship.id, type: ship.type, hullBefore: remainingHull(ship), hullAfter: afloat.get(ship.id) ?? 0 })),
  };
}

export function seaBattle(left: Fleet, right: Fleet, rng: Rng) {
  const beforeLeft = [...left.ships].sort(byShipId);
  const beforeRight = [...right.ships].sort(byShipId);
  let a = beforeLeft;
  let b = beforeRight;
  let rounds = 0;
  while (a.length && b.length && rounds < NAVAL_BATTLE_ROUNDS) {
    rounds++;
    const initiative = longestRange(a) - longestRange(b);
    if (initiative > 0) {
      b = volley(a, b, rng);
      a = volley(b, a, rng);
    } else if (initiative < 0) {
      a = volley(b, a, rng);
      b = volley(a, b, rng);
    } else {
      const nextB = volley(a, b, rng);
      a = volley(b, a, rng);
      b = nextB;
    }
  }
  const afterLeft = { ...left, ships: a };
  const afterRight = { ...right, ships: b };
  const leftSide = sideReport(beforeLeft, afterLeft);
  const rightSide = sideReport(beforeRight, afterRight);
  const sides: [NavalBattleSide, NavalBattleSide] = left.ownerNationId < right.ownerNationId ? [leftSide, rightSide] : [rightSide, leftSide];
  const winner = leftSide.firepower === rightSide.firepower ? undefined : leftSide.firepower > rightSide.firepower ? afterLeft : afterRight;
  return { afterLeft, afterRight, sides, rounds, winner };
}

export function repairAtBerth(fleet: Fleet): Fleet {
  if (!fleet.ships.some(s => s.hullDamage)) return fleet;
  const ships = fleet.ships.map(ship => {
    if (!ship.hullDamage) return ship;
    const { hullDamage, ...undamaged } = ship;
    const remainingDamage = hullDamage - ship.hull * NAVAL_REPAIR_SHARE;
    return remainingDamage > 0 ? { ...ship, hullDamage: remainingDamage } : undamaged;
  });
  return { ...fleet, ships };
}
