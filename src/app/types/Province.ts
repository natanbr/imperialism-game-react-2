// types/Province.ts
import { ProvinceId, CityId, NationId } from "./Common";

export interface Province {
  id: ProvinceId;
  name?: string;
  ownerNationId?: NationId;
  cityId: CityId; // town or capital present
  borderProvinceIds: ProvinceId[];
  seaAdjacency?: string[]; // seaZoneIds
}