import { Nation } from '../types/Nation';
import { NationId } from '../types/Common';

export const mockNation: Nation = {
  id: 'red-empire' as NationId,
  name: 'Red Empire',
  treasury: 10000,
  relations: [],
  tradePolicies: [],
  grants: [],
  cities: [],
  provinces: [],
  armies: [],
  fleets: [],
  colonies: [],
  merchantMarine: {
    holds: 10,
    avgSpeed: 10,
  },
  warehouse: {},
};
