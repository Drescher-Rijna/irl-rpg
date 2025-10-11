type User = {
  id: string;
  xp_total: number;
  xp_current: number; // XP toward next level
  level: number;
};

// Example scaling: XP required for next level increases by 50 per level
const baseXPPerLevel = 100;

export const calculateXP = (tier: number, consistency: number) => {
  const baseXP = 10;
  const tierMultiplier = { 1: 1, 2: 1.5, 3: 2 };
  const consistencyMultiplier = consistency / 10;
  return Math.floor(baseXP * tierMultiplier[tier] * consistencyMultiplier);
};

export const updateUserXP = (user: User, earnedXP: number) => {
  const totalXP = user.xp_total + earnedXP;
  let level = user.level;
  let xpForNextLevel = baseXPPerLevel + (level - 1) * 50;
  let xpCurrent = user.xp_current + earnedXP;

  while (xpCurrent >= xpForNextLevel) {
    xpCurrent -= xpForNextLevel;
    level += 1;
    xpForNextLevel = baseXPPerLevel + (level - 1) * 50;
  }

  return {
    ...user,
    xp_total: totalXP,
    xp_current: xpCurrent,
    level,
  };
};

export const xpForLevel = (level: number): number => {
  const base = 100; // XP for level 1
  const growthRate = 1.08; // 8% more XP per level
  return Math.floor(base * Math.pow(growthRate, level - 1));
};