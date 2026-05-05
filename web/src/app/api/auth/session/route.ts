import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/session";

export async function GET() {
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "Ei käyttöoikeutta" }, { status: 401 });
  }
  return NextResponse.json(session);
}
