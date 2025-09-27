import { Home, Target, List, Mountain } from "lucide-react";
import Link from "next/link";

export function BottomNav() {
  return (
    <nav className="sticky bottom-0 w-full bg-white shadow-inner border-t">
      <div className="grid grid-cols-4">
        <Link
          href="/"
          className="flex flex-col items-center py-2 text-gray-600 hover:text-black"
        >
          <Home className="w-6 h-6" />
          <span className="text-xs">Dashboard</span>
        </Link>
        <Link
          href="/skate/challenges"
          className="flex flex-col items-center py-2 text-gray-600 hover:text-black"
        >
          <Target className="w-6 h-6" />
          <span className="text-xs">Challenges</span>
        </Link>
        <Link
          href="/skate/tricks"
          className="flex flex-col items-center py-2 text-gray-600 hover:text-black"
        >
          <List className="w-6 h-6" />
          <span className="text-xs">Trick List</span>
        </Link>
        <Link
          href="/skate/obstacles"
          className="flex flex-col items-center py-2 text-gray-600 hover:text-black"
        >
          <Mountain className="w-6 h-6" />
          <span className="text-xs">Obstacles</span>
        </Link>
      </div>
    </nav>
  );
}
