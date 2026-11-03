// The worker actions the pre-M1 tests called (store helpers, removed in M1 part B), each now one
// engine order for nation-1, the only nation of `initWorld`. Not a test file.
import { applyOrder } from '@/engine/orders/apply';
import { GameState } from '@/types/GameState';
import { ConstructionKind } from '@/types/jobs/ConstructionJob';

export const NATION = 'nation-1';

export const startProspecting = (state: GameState, tileId: string, workerId: string) =>
  applyOrder(state, { kind: 'startProspecting', nationId: NATION, workerId, tileId });

export const startDevelopment = (state: GameState, tileId: string, workerId: string) =>
  applyOrder(state, { kind: 'startDevelopment', nationId: NATION, workerId, tileId });

export const startConstruction = (state: GameState, tileId: string, workerId: string, structure: ConstructionKind) =>
  applyOrder(state, { kind: 'startConstruction', nationId: NATION, workerId, tileId, structure });

export const moveAndStartProspecting = (state: GameState, toTileId: string, workerId: string) =>
  applyOrder(state, { kind: 'moveAndStartProspecting', nationId: NATION, workerId, toTileId });

export const moveAndStartDevelopment = (state: GameState, toTileId: string, workerId: string) =>
  applyOrder(state, { kind: 'moveAndStartDevelopment', nationId: NATION, workerId, toTileId });

export const moveAndStartConstruction = (state: GameState, toTileId: string, workerId: string, structure: ConstructionKind) =>
  applyOrder(state, { kind: 'moveAndStartConstruction', nationId: NATION, workerId, toTileId, structure });

export const moveAndBuildRail = (state: GameState, toTileId: string, workerId: string) =>
  applyOrder(state, { kind: 'moveAndBuildRail', nationId: NATION, workerId, toTileId });
