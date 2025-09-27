export type User = {
  id: string;
  level: number;
  xpTotal: number;
  xpCurrent: number;
  wildSlots: number;
};

export type Obstacle = {
  id: string;
  name: string;
  type: string;
  difficulty: number;
  score?: number;
};

export type Trick = {
  id: string;
  name: string;
  stance: string;
  obstacles: Obstacle[];
  tier?: number;
};