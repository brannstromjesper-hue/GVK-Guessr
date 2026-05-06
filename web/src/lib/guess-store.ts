import { getSupabaseClients } from "@/lib/supabase-auth";

export type AppGuess = {
  id: string;
  memberKey: string;
  memberName: string;
  lat: number;
  lng: number;
  distanceKm: number;
  score: number;
  createdAt: string;
  updatedAt: string;
};

type SupabaseGuessRow = {
  id: string;
  member_key: string;
  member_name: string;
  lat: number;
  lng: number;
  distance_km: number;
  score: number;
  created_at: string;
  updated_at: string;
};

const GUESS_COLUMNS =
  "id,member_key,member_name,lat,lng,distance_km,score,created_at,updated_at";

function rowToGuess(row: SupabaseGuessRow): AppGuess {
  return {
    id: row.id,
    memberKey: row.member_key,
    memberName: row.member_name,
    lat: row.lat,
    lng: row.lng,
    distanceKm: row.distance_km,
    score: row.score,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function findGuessByMemberKey(memberKey: string): Promise<AppGuess | null> {
  const { admin } = getSupabaseClients();
  const { data, error } = await admin
    .from("guesses")
    .select(GUESS_COLUMNS)
    .eq("member_key", memberKey)
    .maybeSingle();
  if (error) throw error;
  return data ? rowToGuess(data as SupabaseGuessRow) : null;
}

export async function getGuessById(id: string): Promise<AppGuess | null> {
  const { admin } = getSupabaseClients();
  const { data, error } = await admin
    .from("guesses")
    .select(GUESS_COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? rowToGuess(data as SupabaseGuessRow) : null;
}

export async function listGuesses(): Promise<AppGuess[]> {
  const { admin } = getSupabaseClients();
  const { data, error } = await admin
    .from("guesses")
    .select(GUESS_COLUMNS)
    .order("score", { ascending: false })
    .order("distance_km", { ascending: true });
  if (error) throw error;
  return ((data ?? []) as SupabaseGuessRow[]).map(rowToGuess);
}

export async function createGuess(guess: {
  memberKey: string;
  memberName: string;
  lat: number;
  lng: number;
  distanceKm: number;
  score: number;
}): Promise<"created" | "duplicate"> {
  const { admin } = getSupabaseClients();
  const { error } = await admin.from("guesses").insert({
    member_key: guess.memberKey,
    member_name: guess.memberName,
    lat: guess.lat,
    lng: guess.lng,
    distance_km: guess.distanceKm,
    score: guess.score,
  });

  if (!error) return "created";
  if (error.code === "23505") return "duplicate";
  throw error;
}

export async function deleteGuessById(id: string): Promise<boolean> {
  const { admin } = getSupabaseClients();
  const { data, error } = await admin
    .from("guesses")
    .delete()
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error) throw error;
  return !!data;
}
