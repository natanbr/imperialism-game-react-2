// types/Sea.ts
import { SeaZoneId } from "./Common";

export interface SeaZone {
  id: SeaZoneId;
  name?: string;
  adjacentSeaZones: SeaZoneId[];
  adjacentPorts: string[]; // cityIds that are ports on this zone
}
