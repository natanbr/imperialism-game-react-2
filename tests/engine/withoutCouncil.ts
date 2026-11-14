// The engine with the Council switched off, for the rows that compare a game or a turn with the one it gives without
// the Council (FR-295: the meeting writes nothing but `gameOver`; FR-302: the scripted player gives the same orders).
// A fresh copy of the engine modules whose `councilMeeting` never meets; the copies the test file imported statically
// are untouched. Not a test file.
import { vi } from 'vitest';
import type { resolveTurn as ResolveTurn } from '@/engine/turn/resolveTurn';
import type { computerOrders as ComputerOrders } from '@/engine/ai/players';

export interface EngineWithoutCouncil {
  resolveTurn: typeof ResolveTurn;
  computerOrders: typeof ComputerOrders;
}

export async function withoutCouncil(): Promise<EngineWithoutCouncil> {
  vi.resetModules();
  vi.doMock('@/engine/council/council', async importOriginal => ({
    ...(await importOriginal<typeof import('@/engine/council/council')>()),
    councilMeeting: () => undefined,
  }));
  const { resolveTurn } = await import('@/engine/turn/resolveTurn');
  const { computerOrders } = await import('@/engine/ai/players');
  vi.doUnmock('@/engine/council/council');
  return { resolveTurn, computerOrders };
}
