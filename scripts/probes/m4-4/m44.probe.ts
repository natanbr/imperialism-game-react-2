// M4.4 measurement probe (a tool, not a test; see README.md in this folder). How labour limits the scripted
// player, and what recruiting would give. Run: npx vitest run --config scripts/probes/m4-4/vitest.config.ts
// Env: PROBE_OUT (output file, default in the OS temp folder), FREE_UNTIL, FREE_WHEN_BOUND, FREE_FROM, FREE_CAR.
import { it } from 'vitest';
import { writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { newGame } from '@/engine/newGame';
import { resolveTurn } from '@/engine/turn/resolveTurn';
import { computerOrders } from '@/engine/ai/players';
import { applyOrder } from '@/engine/orders/apply';
import { scoreOf } from '@/engine/score/score';
import { labourTotal } from '@/engine/industry/labour';
import { planRun } from '@/engine/ai/economy';
import { BUILDINGS } from '@/definisions/industryBuildings';
import { RECIPES } from '@/definisions/ResourceConversions';
import { computeLogisticsTransport } from '@/engine/systems/logisticsSystem';
import type { GameState } from '@/types/GameState';
import type { Order } from '@/engine/orders/Order';

const N2 = 'nation-2';
const OUT = process.env.PROBE_OUT ?? join(tmpdir(), 'm44-probe-out.json');

function capOf(s: GameState) {
  const n = s.nations.find(x => x.id === N2)!;
  let cap = 0;
  const by: Record<string, number> = {};
  for (const [b, v] of Object.entries(n.industry.buildings)) {
    if (!v || BUILDINGS[b as keyof typeof BUILDINGS].unlimited) continue;
    cap += v.capacity;
    by[b] = v.capacity;
  }
  return { cap, by };
}

it('probe', () => {
  const rows: unknown[] = [];
  for (const seed of [1, 2, 3, 4]) {
    let s = newGame({ seed });
    const made: Record<string, number> = {};
    let sold = 0;
    for (let turn = 1; turn <= 40; turn++) {
      const n = s.nations.find(x => x.id === N2)!;
      const labour = labourTotal(n.industry);
      const run = planRun(s, N2);
      const gathered = computeLogisticsTransport(s.map, N2, s.transportNetwork.railroadNetworks?.[N2]);
      const orders: Order[] = computerOrders(s)[N2];
      const ordered = orders.reduce<GameState>((v, o) => applyOrder(v, o), s);
      const on = ordered.nations.find(x => x.id === N2)!;
      const labourAtProduction = labourTotal(on.industry) - 2 * Math.max(0, on.transportCapacityPendingIncrease ?? 0);
      const r = resolveTurn(s, { [N2]: orders });
      const producedNow: Record<string, number> = {};
      let fed = 0, sick = 0, starved = 0, rejected = 0, soldNow = 0, recruited = 0;
      for (const e of r.events) {
        if (e.type === 'workers-recruited' && e.nationId === N2) recruited += e.count;
        if (e.type === 'goods-produced' && e.nationId === N2) { producedNow[e.output] = (producedNow[e.output] ?? 0) + e.amount; made[e.output] = (made[e.output] ?? 0) + e.amount; }
        if (e.type === 'workers-fed' && e.nationId === N2) { fed = e.fed; sick = e.sick; starved = e.starved; }
        if (e.type === 'order-rejected' && e.nationId === N2) rejected++;
        if (e.type === 'goods-sold' && e.nationId === N2) { soldNow += e.income; }
      }
      sold += soldNow;
      s = r.state;
      // Upper bound: one free untrained worker a turn (no goods paid) up to turn FREE_UNTIL
      const freeUntil = Number(process.env.FREE_UNTIL ?? 0);
      const usedNow = Object.entries(producedNow).reduce((a, [o, u]) => a + u * RECIPES[o as keyof typeof RECIPES].labour / RECIPES[o as keyof typeof RECIPES].batch, 0);
      const boundNow = labourAtProduction - usedNow < 2;
      const whenBound = process.env.FREE_WHEN_BOUND ? Number(process.env.FREE_WHEN_BOUND) : 0;
      const fromTurn = Number(process.env.FREE_FROM ?? 1);
      if (turn <= freeUntil || (whenBound && boundNow && turn >= fromTurn && turn <= whenBound)) {
        const car = process.env.FREE_CAR ? 1 : 0;
        s = { ...s, nations: s.nations.map(x => (x.id === N2 ? { ...x, transportCapacity: (x.transportCapacity ?? 0) + car, industry: { ...x.industry, workers: { ...x.industry.workers, untrained: x.industry.workers.untrained + 1 } } } : x)) };
        recruited++;
      }
      const after = s.nations.find(x => x.id === N2)!;
      const w = after.warehouse as Record<string, number>;
      const { cap, by } = capOf(s);
      const units = Object.values(producedNow).reduce((a, b) => a + b, 0);
      rows.push({
        seed, turn, workers: { ...n.industry.workers }, labour, labourLeft: run.labour, cap, by, unitsMade: units, producedNow,
        gathered, gatheredTotal: Object.values(gathered).reduce((a, b) => a + b, 0), cars: n.transportCapacity,
        stock: { coal: w.coal, ironOre: w.ironOre, timber: w.timber, cotton: w.cotton, wool: w.wool, grain: w.grain, fruit: w.fruit, livestock: w.livestock, cannedFood: w.cannedFood, clothing: w.clothing, furniture: w.furniture, hardware: w.hardware, lumber: w.lumber, steel: w.steel, fabric: w.fabric, paper: w.paper },
        treasury: after.treasury, score: scoreOf(s, N2).total, fed, sick, starved, rejected, soldNow, recruited, labourAtProduction,
        labourUsed: Object.entries(producedNow).reduce((a, [o, u]) => a + u * RECIPES[o as keyof typeof RECIPES].labour / RECIPES[o as keyof typeof RECIPES].batch, 0),
        rejectedReasons: r.events.filter(e => e.type === 'order-rejected' && e.nationId === N2).map(e => (e as { reason: string }).reason),
      });
    }
    rows.push({ seed, totalMade: made, totalSold: sold });
  }
  writeFileSync(OUT, JSON.stringify(rows));
  console.log(`probe rows written to ${OUT}`);
}, 300_000);
