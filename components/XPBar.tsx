import { Card, CardContent } from "@/components/ui/Card";
import { Progress } from "@/components/ui/Progress";

type XPBarProps = {
  level: number;
  xpCurrent: number;
  xpNeeded: number;
};

export function XPBar({ level, xpCurrent, xpNeeded }: XPBarProps) {
  const xpPercent = Math.round((xpCurrent / xpNeeded) * 100);

  return (
    <Card className="shadow-md rounded-2xl">
      <CardContent className="p-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-lg font-semibold">Level {level}</span>
          <span className="text-sm text-gray-500">
            {xpCurrent}/{xpNeeded} XP
          </span>
        </div>
        <Progress value={xpPercent} className="h-3 rounded-full" />
      </CardContent>
    </Card>
  );
}
