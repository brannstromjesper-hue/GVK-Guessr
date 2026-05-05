import prisma from "@/lib/prisma";
import { getSessionFromCookies } from "@/lib/session";
import { NextResponse } from "next/server";

export async function GET() {
  const session = getSessionFromCookies();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Ei käyttöoikeutta" }, { status: 401 });
  }
  const member = await prisma.member.findUnique({
    where: { key: session.user.id },
    select: { key: true },
  });
  if (!member) {
    return NextResponse.json({ error: "Ei käyttöoikeutta" }, { status: 403 });
  }

  const guess = await prisma.guess.findUnique({
    where: { memberKey: session.user.id },
    select: { id: true, lat: true, lng: true },
  });

  return NextResponse.json({
    hasGuess: !!guess,
    lat: guess?.lat ?? null,
    lng: guess?.lng ?? null,
  });
}
