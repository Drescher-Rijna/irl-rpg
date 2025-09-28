'use client';
import "./globals.css";
import { useAuthSession } from '@/hooks/useAuthSession';
import { useEffect } from "react";
import { useUserStore } from "@/store/useUserStore";
import { useXPStore } from "@/store/useXPStore";
import { supabase } from "@/lib/supabase";
import { XPBar } from "@/components/XPBar";
import { xpForLevel } from "@/lib/xp";
import { BottomNav } from "@/components/BottomNav";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  useAuthSession();

  const user = useUserStore((state) => state.user);
  const setXP = useXPStore((state) => state.setXP);
  const xp = useXPStore((state) => state.xp);
  const level = useXPStore((state) => state.level);

  // Fetch XP when user logs in
  useEffect(() => {
    const fetchXP = async () => {
      if (!user?.id) return;

      const { data, error } = await supabase
        .from("users")
        .select("xp_current, level")
        .eq("id", user.id)
        .single();

      if (!error && data) {
        setXP(data.xp_current, data.level);
      }
    };

    fetchXP();
  }, [user, setXP]);

  return (
    <html>
      <body className="flex flex-col min-h-screen">
        {/* Global XP Bar */}
        {user && (
          <div className="p-4 bg-gray-100">
            <XPBar
              level={level}
              xpCurrent={xp}
              xpNeeded={xpForLevel(level)}
            />
          </div>
        )}
        {children}
        {/* Bottom Navigation */}
        <BottomNav />
      </body>
    </html>
  );
}
