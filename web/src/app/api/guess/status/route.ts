import { findGuessByMemberKey } from "@/lib/guess-store";
import { getSessionFromCookies } from "@/lib/session";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await getSessionFromCookies();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Ei käyttöoikeutta" }, { status: 401 });
  }

  const guess = await findGuessByMemberKey(session.user.id);

  return NextResponse.json({
    hasGuess: !!guess,
    lat: guess?.lat ?? null,
    lng: guess?.lng ?? null,
  });
}
