import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Utility to merge class names safely
 * - `clsx` handles conditional logic
 * - `tailwind-merge` dedupes conflicting Tailwind classes
 */
export function cn(...inputs: any[]) {
  return twMerge(clsx(inputs));
}
