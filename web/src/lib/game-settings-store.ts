import { getSupabaseClients } from "@/lib/supabase-auth";

const DEFAULT_SETTINGS_KEY = "default";

type GameSettingsRow = {
  key: string;
  target_lat: number;
  target_lng: number;
  updated_at: string;
};

export type TargetCoords = {
  lat: number;
  lng: number;
};

export async function getTargetCoords(): Promise<TargetCoords | null> {
  const { admin } = getSupabaseClients();
  const { data, error } = await admin
    .from("game_settings")
    .select("key,target_lat,target_lng,updated_at")
    .eq("key", DEFAULT_SETTINGS_KEY)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const row = data as GameSettingsRow;
  if (!Number.isFinite(row.target_lat) || !Number.isFinite(row.target_lng)) {
    return null;
  }
  return {
    lat: row.target_lat,
    lng: row.target_lng,
  };
}
