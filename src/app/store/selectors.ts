import { createSelector } from 'reselect';
import { GameStore } from './rootStore';
import { Nation } from '@/types/Nation';

const selectNations = (state: GameStore) => state.nations;
const selectActiveNationId = (state: GameStore) => state.activeNationId;

export const selectActiveNation = createSelector(
  [selectNations, selectActiveNationId],
  (nations, activeNationId) => nations.find((n: Nation) => n.id === activeNationId)
);

export const selectActiveNationCapacity = createSelector(
    [selectActiveNation],
    (activeNation) => activeNation?.transportCapacity ?? 0
);