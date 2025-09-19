// Empty createGameSlice for Zustand store composition
import { NewsItem } from "@/types/Common";
import { StateCreator } from 'zustand';

export interface GameSlice {
  turn: number;
  year: number;
  activeNationId: string;
  difficulty: "introductory" | "easy" | "normal" | "hard" | "nighOnImpossible";
  newsLog: NewsItem[];
  // actions: advanceTurn, addNews, setActiveNation...
}
export const createGameSlice: StateCreator<GameSlice> = () => ({
  turn: 1,
  year: 1900,
  activeNationId: "",
  difficulty: "normal",
  newsLog: [],
});
