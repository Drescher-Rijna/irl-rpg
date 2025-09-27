export type User = {
  id: string;
  email: string;
  username: string;
  level: number;
  xp_total: number;
  xp_current: number;
  wild_slots: number;
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