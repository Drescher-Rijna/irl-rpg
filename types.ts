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
  obstacle_type_id: string;
  difficulty: number;
  score?: number;
};

export type TrickObstacle = {
  obstacle_id: string;
  trick_id: string;
  consistency?: number;
};

export type Trick = {
  id: string;
  name: string;
  stance: string;
  obstacle_type_ids: string[];
  obstacles: Obstacle[];
  trick_obstacles?: TrickObstacle[];
  consistency?: number;
  tier?: number | null;
};

export type Challenge = {
  id?: string;
  type: 'daily' | 'boss' | 'line' | 'combo' | 'initial';
  name: string;
  description: string;
  difficulty: number;
  xp_reward: number;
  unlock_condition: any;
  completed: boolean;
  failed?: boolean;
  trick_id?: string;
  obstacle_id?: string;
  created_at?: string;
  completed_at?: string | null;
};