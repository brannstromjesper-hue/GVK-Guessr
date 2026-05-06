import { getTargetCoords } from "@/lib/game-settings-store";
import { distanceKm, scoreFromDistanceKm } from "@/lib/geo";
import { createGuess, findGuessByMemberKey } from "@/lib/guess-store";
import { getSessionFromCookies } from "@/lib/session";
import { NextResponse } from "next/server";

const unauthorizedError = { error: "Ei käyttöoikeutta" };
const invalidRequestError = { error: "Virheellinen pyyntö" };

async function parseGuessBody(req: Request): Promise<{ lat: number; lng: number } | null> {
  let body: { lat?: number; lng?: number };
  try {
    body = await req.json();
  } catch {
    return null;
  }

  const lat = Number(body.lat);
  const lng = Number(body.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;

  return { lat, lng };
}

export async function POST(req: Request) {
  const session = await getSessionFromCookies();
  if (!session?.user?.id) {
    return NextResponse.json(unauthorizedError, { status: 401 });
  }

  const target = await getTargetCoords();
  if (!target) {
    return NextResponse.json(
      {
        error:
          "Kohdekoordinaatteja ei ole määritetty Supabase game_settings -taulussa.",
      },
      { status: 500 },
    );
  }

  const parsed = await parseGuessBody(req);
  if (!parsed) return NextResponse.json(invalidRequestError, { status: 400 });
  const { lat, lng } = parsed;

  const existing = await findGuessByMemberKey(session.user.id);
  if (existing) {
    return NextResponse.json(
      { error: "Olet jo lähettänyt arvauksen." },
      { status: 409 },
    );
  }

  const d = distanceKm(lat, lng, target.lat, target.lng);
  const score = scoreFromDistanceKm(d);

  const result = await createGuess({
    memberKey: session.user.id,
    memberName: session.user.name,
    lat,
    lng,
    distanceKm: d,
    score,
  });
  if (result === "duplicate") {
    return NextResponse.json(
      { error: "Olet jo lähettänyt arvauksen." },
      { status: 409 },
    );
  }

  return NextResponse.json({ ok: true });
}
