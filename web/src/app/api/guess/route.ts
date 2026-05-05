import prisma from "@/lib/prisma";
import { distanceKm, parseTargetCoords, scoreFromDistanceKm } from "@/lib/geo";
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
  const member = await prisma.member.findUnique({
    where: { key: session.user.id },
    select: { name: true },
  });
  if (!member) {
    return NextResponse.json(
      { error: "Et ole jäsenlistalla." },
      { status: 403 },
    );
  }

  const target = parseTargetCoords();
  if (!target) {
    return NextResponse.json(
      {
        error:
          "Palvelinta ei ole määritetty REAL_LAT- ja REAL_LNG-arvoilla.",
      },
      { status: 500 },
    );
  }

  const parsed = await parseGuessBody(req);
  if (!parsed) return NextResponse.json(invalidRequestError, { status: 400 });
  const { lat, lng } = parsed;

  const existing = await prisma.guess.findUnique({
    where: { memberKey: session.user.id },
  });
  if (existing) {
    return NextResponse.json(
      { error: "Olet jo lähettänyt arvauksen." },
      { status: 409 },
    );
  }

  const d = distanceKm(lat, lng, target.lat, target.lng);
  const score = scoreFromDistanceKm(d);
  const memberName = member.name;

  await prisma.guess.create({
    data: {
      memberKey: session.user.id,
      memberName,
      lat,
      lng,
      distanceKm: d,
      score,
    },
  });

  return NextResponse.json({ ok: true });
}
