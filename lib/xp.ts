type User = {
  id: string;
  xp_total: number;
  level: number;
};

export const calculateXP = (tier: number, consistency: number) => {
  const baseXP = 10;
  const tierMultiplier = { 1: 1, 2: 1.5, 3: 2 };
  const consistencyMultiplier = consistency / 10;
  return Math.round(baseXP * tierMultiplier[tier] * consistencyMultiplier);
};

export const updateUserXP = (user: User, earnedXP: number) => {
  const newTotal = user.xp_total + earnedXP;
  const xpPerLevel = 500;
  const newLevel = Math.floor(newTotal / xpPerLevel) + 1;
  return { ...user, xp_total: newTotal, level: newLevel };
};
