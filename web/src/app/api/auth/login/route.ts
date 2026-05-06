import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { ensureMembersSeeded, memberKey } from "@/lib/member-store";
import {
  createSessionToken,
  getSessionCookieName,
  getSessionMaxAgeSeconds,
  hasSessionSecret,
} from "@/lib/session";

const invalidCredentialsError = {
  error: "Nimeä ei löydy jäsenlistalta (tai lista on tyhjä).",
};

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      name?: string;
    };
    const inputName = body.name?.trim() ?? "";
    if (!inputName) {
      return NextResponse.json(invalidCredentialsError, { status: 401 });
    }

    if (!hasSessionSecret()) {
      return NextResponse.json(
        { error: "Palvelin puuttuu AUTH_SECRET tai NEXTAUTH_SECRET." },
        { status: 500 },
      );
    }

    if (!process.env.DATABASE_URL?.trim()) {
      return NextResponse.json(
        { error: "Palvelin puuttuu DATABASE_URL." },
        { status: 500 },
      );
    }

    await ensureMembersSeeded();

    const key = memberKey(inputName);
    const member = await prisma.member.findUnique({
      where: { key },
      select: { key: true, name: true },
    });
    if (!member) {
      return NextResponse.json(invalidCredentialsError, { status: 401 });
    }

    const res = NextResponse.json({
      ok: true,
      user: { id: member.key, name: member.name },
    });
    res.cookies.set(getSessionCookieName(), createSessionToken(member.key, member.name), {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: getSessionMaxAgeSeconds(),
    });
    return res;
  } catch (err) {
    console.error("[auth/login]", err);
    return NextResponse.json(
      { error: "Kirjautuminen epäonnistui palvelinvirheen takia." },
      { status: 500 },
    );
  }
}
