// app/tricks/page.tsx
"use client";

import { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import { canUnlockNewTrick, fetchAllTricks } from "@/lib/tricks";
import { useUserStore } from "@/store/useUserStore";
import type { Trick } from "@/types";
import PageWrapper from "@/components/ui/PageWrapper";

export default function TrickListPage() {
  const user = useUserStore((state) => state.user);
  const [tricks, setTricks] = useState<Trick[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    const loadTricks = async () => {
      const data = await fetchAllTricks();
      setTricks(data);
    };
    loadTricks();
  }, []);

  const grouped = {
    1: tricks.filter((t) => t.tier === 1),
    2: tricks.filter((t) => t.tier === 2),
    3: tricks.filter((t) => t.tier === 3),
  };

  const canAdd =
    !!user &&
    (user.wildSlots > 0 || canUnlockNewTrick(user, tricks));

  return (
    <PageWrapper>
      {([1, 2, 3] as const).map((tier) => (
        <div key={tier} className="mb-6">
          <h2
            className={cn(
              "text-lg font-bold mb-2 border-b-2 pb-1",
              tier === 1 && "text-green-600 border-green-600",
              tier === 2 && "text-yellow-600 border-yellow-600",
              tier === 3 && "text-red-600 border-red-600"
            )}
          >
            Tier {tier}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {grouped[tier].map((trick) => (
              <Card key={trick.id} className="shadow-sm hover:shadow-md">
                <CardContent className="p-4 text-center">
                  {trick.name}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}

      {/* Floating Add Trick Button */}
      <button
        onClick={() => setShowAddModal(true)}
        disabled={!canAdd}
        className={cn(
          "fixed bottom-20 right-6 rounded-full p-4 shadow-lg transition",
          canAdd
            ? "bg-blue-600 text-white hover:bg-blue-700"
            : "bg-gray-300 text-gray-500 cursor-not-allowed"
        )}
      >
        <Plus className="h-6 w-6" />
      </button>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg">
            <h3 className="text-lg font-bold mb-4">Add Trick</h3>
            {/* Add Trick Form Here */}
            <button onClick={() => setShowAddModal(false)}>Close</button>
          </div>
        </div>
      )}
    </PageWrapper>
  );
}
