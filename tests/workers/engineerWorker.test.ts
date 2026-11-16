// M12 (NR-033), lane L2. FR-378 (ECONOMY-02, ECONOMY-03): the engineer offers a fort only where `isFortSite` holds. A
// capital holds its level-1 fort (FR-203) and only level 1 can be built, so the capital offers no fort, and a click on it
// from a neighbouring rail tile reaches moveOrders and orders the rail section into it (FR-137).
import { describe, it, expect } from 'vitest';
import { getEngineerActions } from '@/workers/EngineerWorker';
import { isFortSite } from '@/engine/orders/queries';
import { WorkerStatus, WorkerType } from '@/types/Workers';
import { game, locate, N1, N2, put, setTile, T, tileAt, workerId } from '../engine/fixtures';

const ENGINEER = workerId(N1, WorkerType.Engineer);
const offer = (s: ReturnType<typeof game>, tileId: string) => getEngineerActions(tileAt(s, tileId), s.map, locate(s, ENGINEER)!.worker);

describe('FR-378 the engineer offers a fort only where one can be built', () => {
  it('FR-378 the capital: no fort (it holds its level-1 fort), and no Construction Options there either', () => {
    const s = put(game(), ENGINEER, T.capital1);
    expect(isFortSite(tileAt(s, T.capital1))).toBe(false);
    expect(offer(s, T.capital1)).toBeNull();
  });

  it('FR-378 a town without a fort offers the fort; a town with its level-1 fort does not', () => {
    const s = put(game(), ENGINEER, T.town1);
    expect(offer(s, T.town1)).toEqual({ type: 'construct', kind: 'fort' });
    const fortified = setTile(s, T.town1, { fortLevel: 1 });
    expect(offer(fortified, T.town1)).not.toEqual({ type: 'construct', kind: 'fort' });
  });

  it('FR-378 other own land still offers Construction Options; another nation\'s tile and a busy engineer offer nothing', () => {
    const s = put(game(), ENGINEER, T.orchard1);
    expect(offer(s, T.orchard1)).toEqual({ type: 'open-construct-modal' });
    expect(offer(s, T.farm2)).toBeNull();
    expect(tileAt(s, T.farm2).ownerNationId).toBe(N2);
    const busy = put(game(), ENGINEER, T.orchard1, { status: WorkerStatus.Working });
    expect(offer(busy, T.orchard1)).toBeNull();
  });
});
