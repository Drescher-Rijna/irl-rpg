import React from "react";
import { cn } from "@/lib/utils";

type ProgressProps = {
  value: number; // 0–100
  className?: string;
};

export function Progress({ value, className }: ProgressProps) {
  return (
    <div
      className={cn(
        "relative h-4 w-full overflow-hidden rounded-full bg-gray-200",
        className
      )}
    >
      <div
        className="h-full bg-blue-600 transition-all duration-500 ease-out"
        style={{ width: `${Math.min(Math.max(value, 0), 100)}%` }}
      />
    </div>
  );
}
