// lib/user.ts
import { supabase } from "./supabase";
import type { User } from "@/types";

export async function getUserProfile(userId: string): Promise<User | null> {
  const { data, error } = await supabase
    .from("users") // 👈 or "profiles" depending on your schema
    .select("id, username, email, level, xp_total, xp_current, wild_slots")
    .eq("id", userId)
    .single();

  if (error) {
    console.error("Error fetching user profile:", error);
    return null;
  }

  return {
    id: data.id,
    email: data.email,
    username: data.username,
    level: data.level,
    xp_total: data.xp_total,
    xp_current: data.xp_current,
    wild_slots: data.wild_slots,
  };
}
