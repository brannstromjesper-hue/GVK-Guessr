import { requireAdminUserKey } from "@/lib/admin-auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

function parseGuessId(body: { guessId?: string }): string {
  return body.guessId?.trim() ?? "";
}

export async function DELETE(req: Request) {
  const userKey = await requireAdminUserKey();
  if (!userKey) {
    return NextResponse.json({ error: "Ei käyttöoikeutta" }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as { guessId?: string };
  const guessId = parseGuessId(body);
  if (!guessId) {
    return NextResponse.json({ error: "Arvauksen tunniste puuttuu." }, { status: 400 });
  }

  const existing = await prisma.guess.findUnique({
    where: { id: guessId },
    select: { id: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Arvausta ei löytynyt." }, { status: 404 });
  }

  await prisma.guess.delete({ where: { id: guessId } });
  return NextResponse.json({ ok: true });
}
