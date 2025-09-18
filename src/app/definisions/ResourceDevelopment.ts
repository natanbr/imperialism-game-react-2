import { ResourceType } from '../types/Resource';

export interface ResourceProductionLevel {
  level: number;
  production: number;
}

export const ResourceDevelopmentTable: Record<ResourceType, Record<number, number>> = {
  [ResourceType.Grain]: {
    0: 1,
    1: 2,
    2: 3,
    3: 4
  },
  [ResourceType.Fruit]: {
    0: 1,
    1: 2,
    2: 3,
    3: 4
  },
  [ResourceType.Livestock]: {
    0: 1,
    1: 2,
    2: 3,
    3: 4
  },
  [ResourceType.Fish]: {    
    0: 1,
  },
  [ResourceType.Cotton]: {
    0: 1,
    1: 2,
    2: 3,
    3: 4
  },
  [ResourceType.Wool]: {
    0: 1,
    1: 2,
    2: 3,
    3: 4
  },
  [ResourceType.Timber]: {
    0: 1,
    1: 2,
    2: 3,
    3: 4
  },
  [ResourceType.Coal]: {
    0: 0,
    1: 2,
    2: 4,
    3: 6
  },
  [ResourceType.IronOre]: {
    0: 0,
    1: 2,
    2: 4,
    3: 6
  },
  [ResourceType.Gold]: {
    0: 0,
    1: 1,
    2: 2,
    3: 3,
  },
  [ResourceType.Gems]: {
    0: 0,
    1: 1,
    2: 2,
    3: 3,
  },
  [ResourceType.Oil]: { 
    0: 0,
    1: 2,
    2: 4,
    3: 6,
  },
  [ResourceType.Horses]: {
    0: 1,
  },
};