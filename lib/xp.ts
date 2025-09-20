type User = {
  id: string;
  xp_total: number;
  xp_current: number;
  level: number;
};

export const calculateXP = (tier: number, consistency: number) => {
  const baseXP = 10;
  const tierMultiplier: Record<number, number> = { 1: 1, 2: 1.5, 3: 2 };
  const consistencyMultiplier = consistency / 10; // normalized to 0–1
  return Math.floor(baseXP * (tierMultiplier[tier] || 1) * consistencyMultiplier);
};

// progressive XP curve
export const xpForLevel = (level: number) => {
  const base = 500; // XP needed for level 1 → 2
  const growth = 1.2; // 20% more required each level
  return Math.floor(base * Math.pow(growth, level - 1));
};

export const updateUserXP = (user: User, earnedXP: number) => {
  let total = user.xp_total + earnedXP;
  let current = user.xp_current + earnedXP;
  let level = user.level;

  let required = xpForLevel(level);

  while (current >= required) {
    current -= required;
    level++;
    required = xpForLevel(level);
  }

  return {
    ...user,
    xp_total: total,
    xp_current: current,
    level,
  };
};
