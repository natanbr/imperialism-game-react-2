// Empty createCitySlice for Zustand store composition
export const createCitySlice = () => ({});
import { City } from "@/types/City";

export interface CitySlice {
  cities: City[];
  // actions: addCity, queueProduction, completeProduction, updateInfrastructure...
}
