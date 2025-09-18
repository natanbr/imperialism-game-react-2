import { NewsItem } from "@/types/Common";

export interface GameSlice {
  turn: number;
  year: number;
  activeNationId: string;
  difficulty: "introductory" | "easy" | "normal" | "hard" | "nighOnImpossible";
  newsLog: NewsItem[];
  // actions: advanceTurn, addNews, setActiveNation...
}
